from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# True when running inside the PyInstaller-frozen pa-mcp desktop sidecar.
# That bundle (backend/pa-mcp.spec) intentionally EXCLUDES the Postgres
# dialect + psycopg2 to stay small and cross-arch buildable, so SQLAlchemy
# physically cannot speak Postgres there. PyInstaller sets both attributes;
# the FastAPI server / plain `python3` runs leave them unset, so their
# strict Postgres behavior below is completely unchanged.
IS_FROZEN_SIDECAR = bool(getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"))

# DSN resolution order:
#   1. DIRECT_URL  — preferred. Should be the raw postgres:// URL from Prisma's
#                    "direct connection" config. SQLAlchemy speaks this natively.
#   2. DATABASE_URL — only if it's a SQLAlchemy-compatible postgres scheme.
#                     Prisma Accelerate's `prisma+postgres://` scheme is NOT
#                     understood by SQLAlchemy and we explicitly skip it.
#   3. SQLite local file — local dev only. Refused on Railway.
#
# When DATABASE_URL is `prisma+postgres://...` and DIRECT_URL is unset, the
# previous code silently fell through to a container-local SQLite file —
# which meant every Railway redeploy lost all conversation history. We now
# raise loudly in that case so the misconfiguration is caught at boot.

DIRECT_URL = os.getenv("DIRECT_URL")
DATABASE_URL = os.getenv("DATABASE_URL")
IS_RAILWAY = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"))
# Opt-in bridge: set ALLOW_SQLITE_FALLBACK=true on Railway to suppress the
# hard-fail when a usable Postgres DSN is missing. Use this only as a
# transitional measure — conversations written to ephemeral SQLite are
# lost on every redeploy.
ALLOW_SQLITE_FALLBACK = os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() == "true"


def _looks_like_sqlalchemy_postgres(url: Optional[str]) -> bool:
    if not url:
        return False
    return url.startswith("postgres://") or url.startswith("postgresql://")


def _normalize_postgres_scheme(url: str) -> str:
    """SQLAlchemy 2.x dropped the bare `postgres://` scheme — normalize to
    `postgresql://` so URLs from Heroku/Prisma/Render land on the psycopg2
    driver instead of raising NoSuchModuleError at engine creation."""
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


def _frozen_sqlite_dsn() -> str:
    """Stable local SQLite path for the frozen pa-mcp desktop sidecar.

    A Postgres DSN discovered from the environment or a stray .env can never
    be honored inside the frozen bundle (the dialect + psycopg2 were excluded),
    so we keep a small SQLite file in a stable per-user dir instead of letting
    create_engine raise NoSuchModuleError and crash the stdio server before it
    serves a single request. The sidecar's telemetry is local-only anyway — the
    canonical mcp_invocations table lives in the Railway Postgres the desktop
    app has no credentials for. A CWD-relative path is avoided because Tauri
    spawns the sidecar with an unpredictable working directory.
    """
    base = os.path.join(os.path.expanduser("~"), ".alchm")
    try:
        os.makedirs(base, exist_ok=True)
        return "sqlite:///" + os.path.join(base, "pa-mcp-telemetry.db")
    except Exception:
        import tempfile

        return "sqlite:///" + os.path.join(tempfile.gettempdir(), "pa-mcp-telemetry.db")


def _resolve_dsn() -> str:
    # Frozen pa-mcp sidecar: honoring a Postgres DSN is impossible (dialect
    # excluded from the bundle), so force local SQLite rather than crashing at
    # create_engine. Non-frozen runs fall through to the strict logic below.
    if IS_FROZEN_SIDECAR:
        return _frozen_sqlite_dsn()
    if _looks_like_sqlalchemy_postgres(DIRECT_URL):
        return _normalize_postgres_scheme(DIRECT_URL)  # type: ignore[arg-type]
    if _looks_like_sqlalchemy_postgres(DATABASE_URL):
        return _normalize_postgres_scheme(DATABASE_URL)  # type: ignore[arg-type]
    if IS_RAILWAY and not ALLOW_SQLITE_FALLBACK:
        raise RuntimeError(
            "Refusing to start: no SQLAlchemy-compatible Postgres DSN configured. "
            "On Railway, set DIRECT_URL to the raw postgres:// URL (Prisma "
            "Accelerate's prisma+postgres:// scheme is not supported here), or "
            "set ALLOW_SQLITE_FALLBACK=true as a transitional bridge. "
            f"DATABASE_URL={DATABASE_URL!r} DIRECT_URL={DIRECT_URL!r}"
        )
    if IS_RAILWAY:
        print(
            "WARNING: ALLOW_SQLITE_FALLBACK=true on Railway. Conversations will "
            "be written to ephemeral container-local SQLite and lost on redeploy. "
            "This is a transitional bridge — set DIRECT_URL to fix permanently.",
            flush=True,
        )
    # Local dev (no env vars set), or Railway with the opt-in bridge enabled.
    return "sqlite:///./planetary_agents.db"


SQLALCHEMY_DATABASE_URL = _resolve_dsn()

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    else {},
    pool_recycle=1800,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_postgres_runtime_schema() -> None:
    """Repair legacy runtime tables that predate SQLAlchemy defaults.

    `Base.metadata.create_all` is intentionally non-destructive, so it will not
    add missing sequence defaults to existing integer primary keys. It also will
    not normalize old BCE timestamps that psycopg2 cannot deserialize into
    Python `datetime` objects. Keep this small and idempotent so startup can
    safely run it after `create_all`.
    """
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        try:
            with engine.begin() as conn:
                columns = {
                    row[1]
                    for row in conn.execute(text("PRAGMA table_info(historical_agents)"))
                }
                if "kalchmConstant" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "kalchmConstant" FLOAT DEFAULT 0.5'
                        )
                    )
                if "createdAt" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "createdAt" DATETIME'
                        )
                    )
                if "updatedAt" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "updatedAt" DATETIME'
                        )
                    )
                if "level" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "level" INTEGER DEFAULT 1'
                        )
                    )
                if "xp" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "xp" INTEGER DEFAULT 0'
                        )
                    )
                if "evolutionValues" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "evolutionValues" JSON'
                        )
                    )
                if "evTotal" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "evTotal" INTEGER DEFAULT 0'
                        )
                    )
                if "ivSnapshot" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "ivSnapshot" JSON'
                        )
                    )
                if "lastTrainingPartner" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "lastTrainingPartner" TEXT'
                        )
                    )
                if "lastXpGain" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "lastXpGain" DATETIME'
                        )
                    )
                if "lastActive" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "lastActive" DATETIME'
                        )
                    )
                if "isActive" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "isActive" BOOLEAN DEFAULT 1'
                        )
                    )
                if "version" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "version" TEXT DEFAULT \'2.0.0\''
                        )
                    )
                if "craftedBy" not in columns:
                    conn.execute(
                        text(
                            'ALTER TABLE historical_agents ADD COLUMN "craftedBy" TEXT DEFAULT \'philosopher-stone\''
                        )
                    )
                conn.execute(
                    text(
                        """
                        UPDATE historical_agents
                        SET "kalchmConstant" = COALESCE("kalchmConstant", "monicaConstant", 0.5),
                            "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
                            "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP),
                            "level" = COALESCE("level", 1),
                            "xp" = COALESCE("xp", 0),
                            "evTotal" = COALESCE("evTotal", 0),
                            "isActive" = COALESCE("isActive", 1),
                            "version" = COALESCE("version", '2.0.0'),
                            "craftedBy" = COALESCE("craftedBy", 'philosopher-stone')
                        """
                    )
                )
        except Exception as exc:
            print(f"[schema] Runtime SQLite schema repair skipped: {exc}", flush=True)
        return

    if not SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
        return

    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "kalchmConstant" DOUBLE PRECISION DEFAULT 0.5'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "level" INTEGER DEFAULT 1'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "xp" INTEGER DEFAULT 0'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "evolutionValues" JSONB DEFAULT \'{}\'::jsonb'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "evTotal" INTEGER DEFAULT 0'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "ivSnapshot" JSONB'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "lastTrainingPartner" VARCHAR(255)'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "lastXpGain" TIMESTAMP'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "lastActive" TIMESTAMP'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE'
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "version" VARCHAR(50) DEFAULT \'2.0.0\''
                )
            )
            conn.execute(
                text(
                    'ALTER TABLE historical_agents ADD COLUMN IF NOT EXISTS "craftedBy" VARCHAR(100) DEFAULT \'philosopher-stone\''
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE historical_agents
                    SET "kalchmConstant" = COALESCE("kalchmConstant", "monicaConstant", 0.5),
                        "createdAt" = COALESCE("createdAt", NOW()),
                        "updatedAt" = COALESCE("updatedAt", NOW()),
                        "level" = COALESCE("level", 1),
                        "xp" = COALESCE("xp", 0),
                        "evTotal" = COALESCE("evTotal", 0),
                        "isActive" = COALESCE("isActive", TRUE),
                        "version" = COALESCE("version", '2.0.0'),
                        "craftedBy" = COALESCE("craftedBy", 'philosopher-stone')
                    """
                )
            )

            for table_name in ("historical_agents", "agent_conversations"):
                id_type = conn.execute(
                    text(
                        """
                        SELECT data_type
                        FROM information_schema.columns
                        WHERE table_name = :table_name
                          AND column_name = 'id'
                        """
                    ),
                    {"table_name": table_name},
                ).scalar()

                if id_type not in ("integer", "bigint", "smallint"):
                    continue

                sequence_name = f"{table_name}_id_seq"
                conn.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {sequence_name}"))
                conn.execute(
                    text(
                        f"""
                        SELECT setval(
                            '{sequence_name}'::regclass,
                            GREATEST(
                                COALESCE((SELECT MAX(id) FROM {table_name}), 0) + 1,
                                1
                            ),
                            false
                        )
                        """
                    )
                )
                conn.execute(
                    text(
                        f"""
                        ALTER TABLE {table_name}
                        ALTER COLUMN id
                        SET DEFAULT nextval('{sequence_name}'::regclass)
                        """
                    )
                )
                conn.execute(
                    text(
                        f"ALTER SEQUENCE {sequence_name} OWNED BY {table_name}.id"
                    )
                )

            conn.execute(
                text(
                    """
                    UPDATE historical_agents
                    SET "birthDate" = TIMESTAMP '0001-01-01 00:00:00'
                    WHERE "birthDate" < TIMESTAMP '0001-01-01 00:00:00'
                    """
                )
            )
    except Exception as exc:
        print(f"[schema] Runtime schema repair skipped: {exc}", flush=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

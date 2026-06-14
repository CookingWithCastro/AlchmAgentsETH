"""Tests for the Alchm MCP launch resolution, circuit breaker, and the
frozen-sidecar SQLite fallback.

These cover behavior that is now load-bearing for the bundled pa-mcp desktop
sidecar (which has no WTEN source tree and an excluded Postgres dialect):

  * _resolve_launch() picks explicit override → local source → published
    package, in that priority order.
  * The launch circuit breaker opens after a failure so a missing runtime or a
    broken published package can't add launch latency to every chat.
  * database._resolve_dsn() forces local SQLite when frozen, so the sidecar
    never crashes trying to load the excluded postgresql dialect.
"""

import pytest

import alchm_mcp
import database


# --------------------------------------------------------------------------
# _resolve_launch priority order
# --------------------------------------------------------------------------

def test_resolve_launch_explicit_override(monkeypatch):
    monkeypatch.setenv("ALCHM_MCP_ARGS", "run /custom/server.ts --flag")
    monkeypatch.setenv("ALCHM_MCP_COMMAND", "bun")
    launch = alchm_mcp._resolve_launch()
    assert launch["mode"] == "explicit"
    assert launch["command"] == "bun"
    assert launch["args"] == ["run", "/custom/server.ts", "--flag"]


def test_resolve_launch_local_source(monkeypatch, tmp_path):
    # Point at a file that exists → local-source mode wins over the package.
    src = tmp_path / "index.ts"
    src.write_text("// stub")
    monkeypatch.delenv("ALCHM_MCP_ARGS", raising=False)
    monkeypatch.setenv("ALCHM_MCP_SERVER_PATH", str(src))
    launch = alchm_mcp._resolve_launch()
    assert launch["mode"] == "local-source"
    assert launch["args"] == ["run", str(src)]
    assert launch["cwd"] == str(src.parent.parent)


def test_resolve_launch_published_package_with_bun(monkeypatch):
    # No override, source path does not exist → published package via `bun x`.
    monkeypatch.delenv("ALCHM_MCP_ARGS", raising=False)
    monkeypatch.delenv("ALCHM_MCP_COMMAND", raising=False)
    monkeypatch.delenv("ALCHM_MCP_PACKAGE", raising=False)
    monkeypatch.setenv("ALCHM_MCP_SERVER_PATH", "/nope/does/not/exist/index.ts")
    launch = alchm_mcp._resolve_launch()
    assert launch["mode"] == "published-package"
    assert launch["command"] == "bun"
    assert launch["args"] == ["x", "@alchm/mcp-server"]
    assert launch["cwd"] is None


def test_resolve_launch_published_package_with_npx_and_pin(monkeypatch):
    monkeypatch.delenv("ALCHM_MCP_ARGS", raising=False)
    monkeypatch.setenv("ALCHM_MCP_SERVER_PATH", "/nope/index.ts")
    monkeypatch.setenv("ALCHM_MCP_COMMAND", "npx")
    monkeypatch.setenv("ALCHM_MCP_PACKAGE", "@alchm/mcp-server@1.1.1")
    launch = alchm_mcp._resolve_launch()
    assert launch["mode"] == "published-package"
    assert launch["command"] == "npx"
    assert launch["args"] == ["-y", "@alchm/mcp-server@1.1.1"]


def test_config_status_surfaces_launch_mode(monkeypatch):
    monkeypatch.delenv("ALCHM_MCP_ARGS", raising=False)
    monkeypatch.setenv("ALCHM_MCP_SERVER_PATH", "/nope/index.ts")
    status = alchm_mcp.config_status()
    assert status["launchMode"] == "published-package"
    assert status["serverPathExists"] is False
    assert status["publishedPackage"] == "@alchm/mcp-server"


def test_default_server_path_supports_shallow_container_layout(monkeypatch):
    monkeypatch.delenv("ALCHM_MCP_SERVER_PATH", raising=False)
    monkeypatch.setattr(alchm_mcp, "__file__", "/app/alchm_mcp.py")

    server_path = alchm_mcp._default_server_path()

    assert server_path == alchm_mcp.Path("/WhatToEatNext-master/mcp-server/src/index.ts")


# --------------------------------------------------------------------------
# Launch circuit breaker
# --------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_launch_circuit_breaker_opens_and_suppresses(monkeypatch):
    # Force published-package mode with a runtime that does not exist, so the
    # first attempt fails fast (FileNotFoundError) and trips the breaker.
    # ALCHM_MCP_ENABLED is set explicitly because a sibling test module disables
    # it at import time, which would otherwise short-circuit ensure_started().
    monkeypatch.setenv("ALCHM_MCP_ENABLED", "true")
    monkeypatch.delenv("ALCHM_MCP_ARGS", raising=False)
    monkeypatch.setenv("ALCHM_MCP_SERVER_PATH", "/nope/index.ts")
    monkeypatch.setenv("ALCHM_MCP_COMMAND", "definitely-not-a-real-binary-xyz")

    client = alchm_mcp.AlchmMCPClient()

    with pytest.raises(alchm_mcp.AlchmMCPError):
        await client.ensure_started()
    assert client._launch_failures == 1
    assert client._launch_cooldown_until > 0

    # Second call must be suppressed by the open breaker — no new spawn, so the
    # failure count does not increment and the message says "suppressed".
    with pytest.raises(alchm_mcp.AlchmMCPError, match="suppressed"):
        await client.ensure_started()
    assert client._launch_failures == 1


@pytest.mark.asyncio
async def test_launch_breaker_backoff_is_capped(monkeypatch):
    monkeypatch.setenv("ALCHM_MCP_ENABLED", "true")
    monkeypatch.delenv("ALCHM_MCP_ARGS", raising=False)
    monkeypatch.setenv("ALCHM_MCP_SERVER_PATH", "/nope/index.ts")
    monkeypatch.setenv("ALCHM_MCP_COMMAND", "definitely-not-a-real-binary-xyz")

    import time

    client = alchm_mcp.AlchmMCPClient()
    # Simulate many prior failures, then force the cooldown to have elapsed so a
    # real attempt runs and recomputes the (capped) backoff.
    client._launch_failures = 20
    client._launch_cooldown_until = 0.0
    with pytest.raises(alchm_mcp.AlchmMCPError):
        await client.ensure_started()
    remaining = client._launch_cooldown_until - time.monotonic()
    assert remaining <= alchm_mcp._LAUNCH_COOLDOWN_MAX + 1


# --------------------------------------------------------------------------
# Frozen-sidecar SQLite fallback (database.py)
# --------------------------------------------------------------------------

def test_frozen_sqlite_dsn_is_sqlite():
    dsn = database._frozen_sqlite_dsn()
    assert dsn.startswith("sqlite:///")
    assert dsn.endswith("pa-mcp-telemetry.db")


def test_resolve_dsn_forces_sqlite_when_frozen(monkeypatch):
    # Even with a Postgres DSN resolvable, a frozen bundle (which excludes the
    # postgresql dialect) must fall back to SQLite rather than crash.
    monkeypatch.setattr(database, "IS_FROZEN_SIDECAR", True)
    monkeypatch.setattr(database, "DIRECT_URL", "postgresql://user:pw@host/db")
    monkeypatch.setattr(database, "DATABASE_URL", "postgresql://user:pw@host/db")
    assert database._resolve_dsn().startswith("sqlite:///")


def test_resolve_dsn_uses_postgres_when_not_frozen(monkeypatch):
    monkeypatch.setattr(database, "IS_FROZEN_SIDECAR", False)
    monkeypatch.setattr(database, "DIRECT_URL", "postgresql://user:pw@host/db")
    monkeypatch.setattr(database, "DATABASE_URL", None)
    assert database._resolve_dsn() == "postgresql://user:pw@host/db"

from sqlalchemy.orm import Session
import models
import schemas
import utils
from datetime import datetime

def get_agent(db: Session, agent_id: str):
    return db.query(models.HistoricalAgent).filter(models.HistoricalAgent.agentId == agent_id).first()

def get_agents(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.HistoricalAgent).offset(skip).limit(limit).all()

def create_agent(db: Session, agent: schemas.AgentCreate):
    agent_data = agent.model_dump()
    birth_date = agent.birthDate or datetime(2000, 1, 1)
    agent_data["birthDate"] = birth_date
    if agent_data.get("birthYear") is None:
        agent_data["birthYear"] = birth_date.year
    if agent_data.get("title") is None:
        agent_data["title"] = "Historical Agent"
    if agent_data.get("birthTime") is None:
        agent_data["birthTime"] = "12:00"
    if agent_data.get("birthLocation") is None:
        agent_data["birthLocation"] = {"lat": 0.0, "lon": 0.0, "name": "Unknown"}
    if agent_data.get("consciousnessLevel") is None:
        agent_data["consciousnessLevel"] = "Active"
    # Kalchm and Monica are DIFFERENT quantities. No formula relates them, so
    # Kalchm must never be assigned from Monica -- until this was removed, an
    # absent Monica silently became a plausible 0.5 and that invented 0.5 was
    # then copied into kalchmConstant: one fabrication laundered into a second,
    # unrelated quantity, and both were then indistinguishable from measurements.
    #
    # Neither is computable here. schemas.AgentBase carries no spirit/essence/
    # matter/substance, so this function cannot derive Kalchm at all, and Monica
    # is known only when the caller supplies it. Absent means absent.
    #
    # We cannot yet store that absence as NULL: historical_agents.kalchmConstant
    # and .monicaConstant are still NOT NULL in prisma/schema.prisma (lines 724
    # and 725) -- which is precisely why the 0.5 existed. So we do the one honest
    # thing available without a schema change and assert NOTHING, dropping the
    # keys so the insert omits the columns, exactly as the leveling fields below
    # do. Whatever then lands in the row is a PLACEHOLDER, never a measurement:
    # Postgres substitutes the column DEFAULT 0 for monicaConstant, and
    # SQLAlchemy substitutes its client-side default of 0.5 for kalchmConstant
    # (models.py:33). Do not read either back as a measured value; see
    # docs/MONICA_KALCHM_NULLABILITY_MIGRATION.md, after which this same code
    # stores a real NULL with no further change here.
    for _unmeasured_thermo_key in ("monicaConstant", "kalchmConstant"):
        if agent_data.get(_unmeasured_thermo_key) is None:
            agent_data.pop(_unmeasured_thermo_key, None)
    if agent_data.get("dominantElement") is None:
        agent_data["dominantElement"] = "Air"
    if agent_data.get("dominantModality") is None:
        agent_data["dominantModality"] = "Cardinal"
    if agent_data.get("specialty") is None:
        agent_data["specialty"] = "General wisdom"
    if not agent_data.get("wisdomDomains"):
        agent_data["wisdomDomains"] = ["General Wisdom"]
    if agent_data.get("avatar") is None:
        agent_data["avatar"] = ""
    if agent_data.get("color") is None:
        agent_data["color"] = "#64748b"
    if agent_data.get("symbol") is None:
        agent_data["symbol"] = "Sun"

    agent_data.update({
        "signature": agent_data.get("signature")
        or f"{agent.agentId}-synced-agent",
        "personalityCore": agent_data.get("personalityCore") or {},
        "personalityShadows": agent_data.get("personalityShadows") or [],
        "personalityGifts": agent_data.get("personalityGifts") or [],
        "personalityChallenges": agent_data.get("personalityChallenges") or [],
        "currentMood": agent_data.get("currentMood") or "Curious",
        "background": agent_data.get("background") or {},
        "skills": agent_data.get("skills") or [],
        "teachingStyle": agent_data.get("teachingStyle") or "Reflective dialogue",
        "resonanceType": agent_data.get("resonanceType") or "general",
        "uniquePower": agent_data.get("uniquePower") or "Contextual wisdom",
        "natalChart": agent_data.get("natalChart") or {},
        "traits": agent_data.get("traits") or [],
    })

    # Determine era and other metadata
    # Cosmic Leveling: drop unset leveling fields so model/DB defaults apply.
    # Passing None would explicitly insert NULL into NOT NULL columns and fail.
    for _lvl_key in ("level", "xp", "evolutionStage", "evolutionValues", "evTotal"):
        if agent_data.get(_lvl_key) is None:
            agent_data.pop(_lvl_key, None)

    era_info = utils.determine_historical_era(agent_data["birthYear"], agent.agentId)

    db_agent = models.HistoricalAgent(
        **agent_data,
        historicalEra=era_info['era'],
        culture=era_info['culture'],
        geography=era_info['geography'],
        lastActive=datetime.utcnow()
    )
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent

def update_agent(db: Session, agent_id: str, agent_update: schemas.AgentUpdate):
    db_agent = get_agent(db, agent_id)
    if not db_agent:
        return None
    
    update_data = agent_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_agent, key, value)
    
    db_agent.lastActive = datetime.utcnow()
    db.commit()
    db.refresh(db_agent)
    return db_agent

def delete_agent(db: Session, agent_id: str) -> bool:
    """Remove a historical agent by its public agentId.

    Returns True on success, False when no row matched. We delete by
    agentId rather than the synthetic primary-key id because every
    upstream caller addresses agents by their stable slug.
    """
    db_agent = get_agent(db, agent_id)
    if not db_agent:
        return False
    db.delete(db_agent)
    db.commit()
    return True


def get_agent_stats(db: Session) -> dict:
    """Aggregate counts used by the admin dashboard's /api/agents/stats.

    Kept intentionally cheap — three COUNT queries — so it stays usable
    from a high-frequency status panel without paging through the full
    historical_agents table.
    """
    total = db.query(models.HistoricalAgent).count()

    by_era_rows = (
        db.query(models.HistoricalAgent.historicalEra)
        .filter(models.HistoricalAgent.historicalEra.isnot(None))
        .all()
    )
    by_era: dict[str, int] = {}
    for (era,) in by_era_rows:
        if not era:
            continue
        by_era[era] = by_era.get(era, 0) + 1

    by_consciousness_rows = (
        db.query(models.HistoricalAgent.consciousnessLevel)
        .filter(models.HistoricalAgent.consciousnessLevel.isnot(None))
        .all()
    )
    by_consciousness: dict[str, int] = {}
    for (level,) in by_consciousness_rows:
        if not level:
            continue
        by_consciousness[level] = by_consciousness.get(level, 0) + 1

    return {
        "total": total,
        "byEra": by_era,
        "byConsciousnessLevel": by_consciousness,
    }


def search_agents(db: Session, query: str, limit: int = 25):
    """Case-insensitive ILIKE search across name, title, and culture.

    Intentionally a SQL prefilter — the heavyweight semantic search
    lives behind /api/rag/search via ChromaDB. This is the cheap
    name-lookup fallback used by the unified agent route.
    """
    if not query:
        return []
    needle = f"%{query.lower()}%"
    return (
        db.query(models.HistoricalAgent)
        .filter(
            (models.HistoricalAgent.name.ilike(needle))
            | (models.HistoricalAgent.title.ilike(needle))
            | (models.HistoricalAgent.culture.ilike(needle))
        )
        .limit(max(1, min(limit, 100)))
        .all()
    )


def create_conversation(db: Session, conversation: schemas.ConversationCreate):
    db_conversation = models.AgentConversation(**conversation.model_dump())
    db.add(db_conversation)
    
    # Update agent stats
    db_agent = get_agent(db, conversation.agentId)
    if db_agent:
        db_agent.conversations += 1
        db_agent.lastActive = datetime.utcnow()
        
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

def get_conversations(db: Session, agent_id: str, skip: int = 0, limit: int = 50):
    return db.query(models.AgentConversation).filter(
        models.AgentConversation.agentId == agent_id
    ).order_by(models.AgentConversation.createdAt.desc()).offset(skip).limit(limit).all()

def get_all_agents(db: Session):
    return db.query(models.HistoricalAgent).all()

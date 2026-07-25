from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime, timezone
import uuid

class Base(DeclarativeBase):
    pass

class HistoricalAgent(Base):
    __tablename__ = "historical_agents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    agentId = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    title = Column(String)
    
    # Birth data
    birthDate = Column(DateTime)
    birthTime = Column(String)
    birthLocation = Column(JSON) # {lat, lon, name}
    birthYear = Column(Integer)
    deathYear = Column(Integer)
    
    # Historical context
    historicalEra = Column(String)
    culture = Column(String)
    geography = Column(String)
    
    # Consciousness profile
    consciousnessLevel = Column(String)
    # The deployed/test schema keeps this NOT NULL; changing absence semantics
    # requires an explicit migration rather than an ORM-only edit.
    kalchmConstant = Column(Float, default=0.5)
    monicaConstant = Column(Float)
    dominantElement = Column(String)
    dominantModality = Column(String)
    signature = Column(String, default="")
    
    # Monica Constant components
    spiritScore = Column(Float)
    essenceScore = Column(Float)
    matterScore = Column(Float)
    substanceScore = Column(Float)
    
    # Personality data
    personalityCore = Column(JSON, default=dict)
    personalityShadows = Column(JSON, default=list)
    personalityGifts = Column(JSON, default=list)
    personalityChallenges = Column(JSON, default=list)
    currentMood = Column(String, default="Curious")
    evolutionStage = Column(Integer, default=0)
    traits = Column(JSON, default=list)
    
    background = Column(JSON, default=dict)
    specialty = Column(String)
    wisdomDomains = Column(JSON)
    skills = Column(JSON, default=list)
    teachingStyle = Column(String, default="Reflective dialogue")
    resonanceType = Column(String, default="general")
    uniquePower = Column(String, default="Contextual wisdom")
    
    # Appearance
    avatar = Column(String)
    color = Column(String, default="#64748b")
    symbol = Column(String, default="Sun")
    aura = Column(JSON)
    
    # Birth chart
    natalChart = Column(JSON, default=dict)
    
    # Monica's creation story
    monicaCreationStory = Column(String)
    
    # Performance optimization
    searchableText = Column(String)
    popularityScore = Column(Float, default=0.5)
    
    # Statistics
    conversations = Column(Integer, default=0)
    wisdomShared = Column(Integer, default=0)
    resonanceScore = Column(Float, default=0.5)
    evolutionPoints = Column(Integer, default=0)

    # === Cosmic EV & Leveling System ===
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    evolutionValues = Column(JSON, default=dict)
    evTotal = Column(Integer, default=0)
    ivSnapshot = Column(JSON)
    lastTrainingPartner = Column(String)
    lastXpGain = Column(DateTime)

    lastActive = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    isActive = Column(Boolean, default=True)
    
    # Metadata
    version = Column(String, default="2.0.0")
    craftedBy = Column(String, default="philosopher-stone")
    createdAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    
    # Relationships
    recentConversations = relationship("AgentConversation", back_populates="agent")

class AgentConversation(Base):
    __tablename__ = "AgentConversation"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    agentId = Column(String, ForeignKey("historical_agents.agentId"), nullable=False)
    sessionId = Column(String, nullable=False)
    userId = Column(String)
    userMessage = Column(String, nullable=False)
    agentResponse = Column(String, nullable=False)
    
    createdAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    contextData = Column(JSON)
    
    responseTime = Column(Float)
    modelUsed = Column(String)
    temperature = Column(Float)
    tokenCount = Column(Integer)
    
    agentMood = Column(String)
    evolutionStage = Column(Integer)
    consciousnessLevel = Column(String)
    
    agent = relationship("HistoricalAgent", back_populates="recentConversations")

class DesktopApiKey(Base):
    __tablename__ = "desktop_api_keys"

    id = Column(String, primary_key=True)
    userId = Column(String, name="user_id", nullable=False)
    token = Column(String, unique=True, nullable=False)
    label = Column(String)
    isActive = Column(Boolean, default=True, name="is_active")
    lastUsedAt = Column(DateTime, name="last_used_at")
    expiresAt = Column(DateTime, name="expires_at")
    createdAt = Column(DateTime, name="created_at", default=datetime.utcnow)

class MCPInvocation(Base):
    __tablename__ = "mcp_invocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    toolName = Column(String, name="tool_name", nullable=False)
    calledAt = Column(DateTime, name="called_at", default=datetime.utcnow)
    completedAt = Column(DateTime, name="completed_at")
    latencyMs = Column(Integer, name="latency_ms")
    success = Column(Boolean, nullable=False)
    userId = Column(String, name="user_id")
    apiKeyId = Column(String, name="api_key_id")
    caller = Column(String)
    arguments = Column(JSON, default=dict)
    resultSummary = Column(JSON, name="result_summary", default=dict)
    errorMessage = Column(String, name="error_message")
    agentId = Column(String, name="agent_id")
    modelTier = Column(String, name="model_tier")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    passwordHash = Column(String)
    name = Column(String)
    provider = Column(String, default="email")
    role = Column(String, default="user")
    isAgentic = Column(Boolean, default=False)
    verified = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    lastLogin = Column(DateTime)
    lastActivationAt = Column(DateTime)
    activationCount = Column(Integer, default=0)
    alchmKitchenUserId = Column(String, unique=True)

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(String, primary_key=True)
    userId = Column(String, name="user_id", unique=True, nullable=False)
    tier = Column(String, nullable=False)
    status = Column(String, nullable=False)
    stripeCustomerId = Column(String, name="stripe_customer_id")
    stripeSubscriptionId = Column(String, name="stripe_subscription_id", unique=True)
    currentPeriodStart = Column(DateTime, name="current_period_start")
    currentPeriodEnd = Column(DateTime, name="current_period_end")
    cancelAtPeriodEnd = Column(Boolean, name="cancel_at_period_end", default=False)
    createdAt = Column(DateTime, name="created_at", default=datetime.utcnow)
    updatedAt = Column(DateTime, name="updated_at", default=datetime.utcnow)

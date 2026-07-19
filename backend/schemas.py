from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import List, Optional, Dict, Any, Union, Literal
from datetime import datetime

class BirthLocation(BaseModel):
    lat: float
    lon: float
    name: str

class AgentBase(BaseModel):
    agentId: str
    name: str
    title: Optional[str] = None
    birthDate: Optional[datetime] = None
    birthTime: Optional[str] = None
    birthLocation: Optional[BirthLocation] = None
    birthYear: Optional[int] = None
    deathYear: Optional[int] = None
    
    consciousnessLevel: Optional[str] = None
    monicaConstant: Optional[float] = None
    dominantElement: Optional[str] = None
    dominantModality: Optional[str] = None
    
    specialty: Optional[str] = None
    wisdomDomains: Optional[List[str]] = []
    
    avatar: Optional[str] = None
    color: Optional[str] = None
    symbol: Optional[str] = None
    
    personalityCore: Optional[Dict[str, Any]] = None
    personalityShadows: Optional[List[Dict[str, Any]]] = None
    personalityGifts: Optional[List[Dict[str, Any]]] = None
    personalityChallenges: Optional[List[Dict[str, Any]]] = None
    traits: Optional[Union[List[str], Dict[str, Any]]] = None

class AgentCreate(AgentBase):
    # Cosmic EV & Leveling — optional; planetary agents are created at the cap.
    # Left None for ordinary agents so model/DB defaults apply (see crud.create_agent).
    level: Optional[int] = None
    xp: Optional[int] = None
    evolutionStage: Optional[int] = None
    evolutionValues: Optional[Dict[str, Any]] = None
    evTotal: Optional[int] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    consciousnessLevel: Optional[str] = None
    monicaConstant: Optional[float] = None
    currentMood: Optional[str] = None
    evolutionStage: Optional[int] = None
    avatar: Optional[str] = None

class Agent(AgentBase):
    id: Union[str, int]
    historicalEra: Optional[str] = None
    culture: Optional[str] = None
    geography: Optional[str] = None
    
    personalityCore: Optional[Dict[str, Any]] = None
    personalityShadows: Optional[List[Dict[str, Any]]] = None
    personalityGifts: Optional[List[Dict[str, Any]]] = None
    personalityChallenges: Optional[List[Dict[str, Any]]] = None
    
    currentMood: Optional[str] = None
    evolutionStage: int = 0
    
    conversations: int = 0
    wisdomShared: int = 0
    resonanceScore: float = 0.5
    evolutionPoints: int = 0

    # Cosmic EV & Leveling
    level: int = 1
    xp: int = 0
    evolutionValues: Optional[Dict[str, Any]] = None
    evTotal: int = 0
    ivSnapshot: Optional[Dict[str, Any]] = None

    lastActive: datetime
    isActive: bool = True

    model_config = ConfigDict(from_attributes=True)

class ConversationBase(BaseModel):
    agentId: str
    sessionId: str
    userId: Optional[str] = None
    userMessage: str
    agentResponse: str

class ConversationCreate(ConversationBase):
    contextData: Optional[Dict[str, Any]] = None
    responseTime: Optional[float] = None
    modelUsed: Optional[str] = None
    temperature: Optional[float] = None
    tokenCount: Optional[int] = None

class Conversation(ConversationBase):
    id: Union[str, int]
    createdAt: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    agentId: str
    message: str
    sessionId: Optional[str] = None
    userId: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    # Verbatim system prompt assembled by the TS persona builder.
    # When present, backend skips the Python template and uses this directly.
    systemPromptOverride: Optional[str] = None
    # Stable hash of the persona content — drives prompt-cache reuse.
    personaCacheKey: Optional[str] = None
    # Cost tier: 'free' | 'cheap_fast' | 'primary' | 'reflective'.
    # Default applied server-side is 'cheap_fast' (Haiku 4.5).
    modelTier: Optional[str] = None
    # BYOK: caller's own provider keys, e.g. {"anthropic": "sk-ant-...",
    # "openai": "sk-..."}. Used in place of the app keys for the matching
    # provider. Never persisted or logged backend-side.
    userProviderKeys: Optional[Dict[str, str]] = None

class ChatResponse(BaseModel):
    text: str
    agentId: str
    sessionId: str
    metadata: Optional[Dict[str, Any]] = None

class MultiAgentChatRequest(BaseModel):
    agentIds: List[str] = Field(default_factory=lambda: ["sirius", "arcturus", "vega", "polaris"])
    message: str
    sessionId: Optional[str] = None
    userId: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    systemPromptOverrides: Optional[Dict[str, str]] = None
    modelTier: Optional[str] = None

class MultiAgentTurn(BaseModel):
    agentId: str
    name: str
    element: Optional[str] = None
    text: str

class MultiAgentChatResponse(BaseModel):
    responses: List[MultiAgentTurn]
    sessionId: str
    metadata: Optional[Dict[str, Any]] = None


class RecipeBirthData(BaseModel):
    dateTime: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = ConfigDict(extra="allow")

class CosmicRecipeRequest(BaseModel):
    prompt: str = Field(
        default="A nourishing, restorative meal aligned with today's cosmic energies.",
        min_length=1,
        max_length=2000,
    )
    dominantElement: Optional[Literal["Air", "Fire", "Water", "Earth"]] = None
    cuisine: Optional[str] = Field(default=None, max_length=120)
    topIngredients: List[str] = Field(default_factory=list, max_length=40)
    birthData: Optional[RecipeBirthData] = None
    dietPreference: Optional[str] = Field(default="omnivore", max_length=120)
    dietary: List[str] = Field(default_factory=list, max_length=20)
    alchemicalState: Optional[Dict[str, float]] = None
    thermodynamicProperties: Optional[Dict[str, float]] = None
    disallowedIngredients: List[str] = Field(default_factory=list, max_length=40)
    userId: Optional[str] = None
    modelTier: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="before")
    @classmethod
    def normalize_context_and_aliases(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value

        data = dict(value)
        context = data.pop("context", None)
        if isinstance(context, dict):
            merged = dict(context)
            merged.update({k: v for k, v in data.items() if v is not None})
            data = merged

        if "diet" in data and "dietPreference" not in data:
            data["dietPreference"] = data["diet"]
        if "dietaryRestrictions" in data and "dietary" not in data:
            data["dietary"] = data["dietaryRestrictions"]
        if "preferredCuisine" in data and "cuisine" not in data:
            data["cuisine"] = data["preferredCuisine"]
        if "ingredients_main" in data and "topIngredients" not in data:
            data["topIngredients"] = data["ingredients_main"]
        if "disallowed_ingredients" in data and "disallowedIngredients" not in data:
            data["disallowedIngredients"] = data["disallowed_ingredients"]

        return data

class AlignmentScore(BaseModel):
    overall: float = Field(ge=0, le=100)
    ingredients_fit: float = Field(ge=0, le=100)
    diet_fit: float = Field(ge=0, le=100)
    time_fit: float = Field(ge=0, le=100)
    astro_fit: float = Field(ge=0, le=100)

class RecipeTags(BaseModel):
    diet: List[str]
    cuisine: List[str]
    meal_type: str
    flavor_profile: List[str]
    cooking_methods: List[str]
    elements: List[str]
    planets: List[str]

class RecipeIngredient(BaseModel):
    name: str
    quantity: str
    unit: str
    household_description: Optional[str] = None
    optional: bool
    substitutions: List[str]

class RecipeStep(BaseModel):
    step_number: int = Field(ge=1)
    instruction: str
    time_minutes: float = Field(ge=0)
    cooking_method: str
    tips: List[str]

class ElementalBalance(BaseModel):
    fire: float = Field(ge=0, le=100)
    earth: float = Field(ge=0, le=100)
    water: float = Field(ge=0, le=100)
    air: float = Field(ge=0, le=100)

class RecipeNutrition(BaseModel):
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbohydrates: float = Field(ge=0)
    fat: float = Field(ge=0)

class FinishingAndServing(BaseModel):
    garnish_and_plating: str
    doneness_cues: str
    serving_suggestions: str

class LeftoversAndStorage(BaseModel):
    can_store: bool
    storage_instructions: str
    storage_lifespan_days: float = Field(ge=0)

class AstroExplanation(BaseModel):
    summary: str
    correspondences: List[str]

class CosmicRecipeResponse(BaseModel):
    id: str
    title: str
    short_description: str
    category: Literal[
        "Beverages",
        "Breakfast",
        "Dessert",
        "Dinner",
        "Lunch",
        "Salad",
        "Sauce",
        "Side",
        "Soup",
        "Appetizer",
        "Condiment",
    ]
    cuisine: str
    difficulty: Literal["beginner", "intermediate", "advanced"]
    yields: float = Field(gt=0)
    total_time: float = Field(gt=0)
    alignment_score: AlignmentScore
    alignment_notes: List[str]
    tags: RecipeTags
    ingredients: List[RecipeIngredient] = Field(min_length=1)
    steps: List[RecipeStep] = Field(min_length=1)
    elementalBalance: ElementalBalance
    nutrition: RecipeNutrition
    vitamins: Optional[List[str]] = None
    minerals: Optional[List[str]] = None
    finishing_and_serving: FinishingAndServing
    leftovers_and_storage: LeftoversAndStorage
    astro_explanation: AstroExplanation

    model_config = ConfigDict(extra="ignore")

# --- Tilt Skillet / Recipe-as-a-Circuit batch planner ---
# Mirrors WTEN's tiltSkilletBatchSchema (src/types/tiltSkilletSchema.ts). WTEN computes the
# deterministic circuit grounding (circuitContext) and proxies here; this owns the LLM step.

class TiltSkilletStageIngredientInput(BaseModel):
    name: str
    amount: float
    unit: str

class TiltSkilletStageInput(BaseModel):
    name: Optional[str] = None
    ingredients: List[TiltSkilletStageIngredientInput] = Field(default_factory=list)

class TiltSkilletRequest(BaseModel):
    prompt: str = Field(
        default="A large-batch braise for the week ahead.",
        min_length=1,
        max_length=2000,
    )
    batchServings: Optional[int] = Field(default=12, ge=1, le=500)
    cuisine: Optional[str] = Field(default=None, max_length=120)
    dietPreference: Optional[str] = Field(default="omnivore", max_length=120)
    dietary: List[str] = Field(default_factory=list, max_length=20)
    disallowedIngredients: List[str] = Field(default_factory=list, max_length=40)
    stages: List[TiltSkilletStageInput] = Field(default_factory=list, max_length=12)
    # Precomputed recipe-as-a-circuit grounding from WTEN's computeBatchCircuit (per-stage + series).
    circuitContext: Optional[Dict[str, Any]] = None
    userId: Optional[str] = None
    tier: Optional[str] = None
    modelTier: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

class TiltSkilletStageIngredient(BaseModel):
    ingredient: str
    quantity: str
    unit: str

class TiltSkilletStage(BaseModel):
    step_number: int = Field(ge=1)
    name: str
    instruction: str
    add_to_skillet: List[TiltSkilletStageIngredient] = Field(default_factory=list)
    skillet_position: str
    tilt_angle_degrees: float = Field(ge=0, le=45)
    temperature_f: float = Field(ge=0)
    time_minutes: float = Field(ge=0)
    technique: str
    circuit_role: Literal["source", "resistor", "capacitor", "load"]
    reaction_note: str
    sensory_cues: List[str]

class TiltSkilletCircuitSummary(BaseModel):
    total_voltage: float
    total_current: float
    total_resistance: float
    total_power: float
    efficiency: float
    kalchm: float
    monica: float
    narrative: str

class TiltSkilletPlanResponse(BaseModel):
    id: str
    title: str
    summary: str
    cuisine: str
    batch_yield: str
    total_time: float = Field(gt=0)
    equipment_notes: str
    stages: List[TiltSkilletStage] = Field(min_length=1)
    elementalBalance: ElementalBalance
    circuit_summary: TiltSkilletCircuitSummary
    alignment_notes: List[str]
    finishing_and_serving: FinishingAndServing
    leftovers_and_storage: LeftoversAndStorage

    model_config = ConfigDict(extra="ignore")

class HealthResponse(BaseModel):
    status: str
    service: str
    database: str

class BulkPositionsRequest(BaseModel):
    startDate: datetime
    endDate: datetime
    intervalHours: float = 1.0
    latitude: float = 0.0
    longitude: float = 0.0

class BulkPositionsResponse(BaseModel):
    samples: List[Dict[str, Any]]
    count: int
    degraded: bool = False

class PhilosophersStonePositionsRequest(BaseModel):
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None
    hour: Optional[int] = None
    minute: Optional[int] = None
    customPlanets: Optional[Dict[str, Any]] = None

class PhilosophersStonePositionsResponse(BaseModel):
    elementalProperties: Dict[str, float]
    thermodynamicProperties: Dict[str, float]
    esms: Dict[str, float]
    planetaryMomentum: Dict[str, float]
    kalchm: float
    monica: float
    score: float
    normalized: bool
    confidence: float
    metadata: Dict[str, Any]
    perPlanet: Optional[Dict[str, Any]] = None

class AgentSyncPayload(BaseModel):
    agentId: str
    displayName: str
    email: Optional[str] = None
    title: Optional[str] = None
    avatar: Optional[str] = None
    color: Optional[str] = None
    symbol: Optional[str] = None

class AgentSyncResponse(BaseModel):
    success: bool
    agentId: str
    action: str

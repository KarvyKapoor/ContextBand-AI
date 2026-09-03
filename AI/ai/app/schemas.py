from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ContextInput(BaseModel):
    time_of_day: str = Field(..., pattern="^(morning|afternoon|evening)$")
    activity: str = Field(..., pattern="^(low|medium|high)$")
    stress: str = Field(..., pattern="^(low|medium|high)$")
    location: str = Field(..., pattern="^(home|work|other)$")


class PredictionRequest(BaseModel):
    user_id: str = "demo_user"
    context: ContextInput
    preferences: List[str] = []
    preferred_tone: str = "supportive"
    fatigue_level: int = Field(default=0, ge=0, le=10)


class PredictionResponse(BaseModel):
    decision_id: str
    intervention: str
    tone: str
    timing: str
    message: str
    confidence: float
    context: Dict
    scores: Dict[str, float]


class FeedbackInput(BaseModel):
    user_id: str = "demo_user"
    decision_id: Optional[str] = None
    context: ContextInput
    action: str
    response: str


class FeedbackResponse(BaseModel):
    status: str
    action: str
    response: str
    reward: float
    fatigue_level: int
    updated: bool

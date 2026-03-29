from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class ImpactWeightsUpdate(BaseModel):
    safety: float = Field(ge=0, le=1)
    operational: float = Field(ge=0, le=1)
    cost: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def validate_sum(self) -> "ImpactWeightsUpdate":
        total = self.safety + self.operational + self.cost
        if abs(total - 1.0) > 1e-6:
            raise ValueError("Weights must sum to 1.0")
        return self


class ImpactWeightsResponse(BaseModel):
    safety: float
    operational: float
    cost: float
    updated_at: datetime | None = None


class JobResponse(BaseModel):
    job_id: str
    status: Literal["pending", "running", "complete", "failed"]


class RiskUpdate(BaseModel):
    comments: Optional[str] = None
    is_checked: Optional[bool] = None

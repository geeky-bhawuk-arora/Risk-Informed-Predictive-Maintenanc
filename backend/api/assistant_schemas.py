from pydantic import BaseModel, Field


class AssistantQuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)

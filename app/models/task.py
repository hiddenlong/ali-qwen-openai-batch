from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class TaskStatus(Enum):
    VALIDATING = 'validating'
    FAILED = 'failed'
    IN_PROGRESS = 'in_progress'
    FINALIZING = 'finalizing'
    COMPLETED = 'completed'
    EXPIRING = 'expiring'
    EXPIRED = 'expired'
    CANCELLING = 'cancelling'
    CANCELLED = 'cancelled'

class Task(BaseModel):
    id: str
    status: str
    content: str
    created_at: datetime
    file_path: Optional[str] = None
    file_id: Optional[str] = None
    batch_id: Optional[str] = None
    error_message: Optional[str] = None
    result: Optional[dict] = None
    output_file_path: Optional[str] = None
    error_file_path: Optional[str] = None
    system_prompt: Optional[str] = None
    output_file_id: Optional[str] = None
    error_file_id: Optional[str] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "task-123",
                "status": TaskStatus.VALIDATING.value,
                "content": "Task content here",
                "created_at": "2024-01-01T00:00:00",
                "file_path": None,
                "file_id": None,
                "batch_id": None,
                "error_message": None,
                "result": None,
                "output_file_path": None,
                "error_file_path": None,
                "system_prompt": None,
                "output_file_id": None,
                "error_file_id": None
            }
        } 
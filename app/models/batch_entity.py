
from typing import Optional, Dict
from dataclasses import dataclass

@dataclass
class RequestCounts:
    total: int
    completed: int
    failed: int

@dataclass
class BatchResponse:
    """批处理响应数据类"""
    id: str
    object: str
    endpoint: str
    errors: Optional[str]
    input_file_id: str
    completion_window: str
    status: str
    output_file_id: Optional[str]
    error_file_id: Optional[str]
    created_at: int
    in_progress_at: Optional[int]
    expires_at: Optional[int]
    finalizing_at: Optional[int]
    completed_at: Optional[int]
    failed_at: Optional[int]
    expired_at: Optional[int]
    cancelling_at: Optional[int]
    cancelled_at: Optional[int]
    request_counts: RequestCounts
    metadata: Dict

    @classmethod
    def from_json(cls, data: Dict) -> 'BatchResponse':
        """从JSON数据创建BatchResponse实例"""
        request_counts = RequestCounts(**data.get('request_counts', {}))
        return cls(
            **{k: v for k, v in data.items() if k != 'request_counts'},
            request_counts=request_counts
        )
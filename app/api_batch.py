import os
from pathlib import Path
from openai import OpenAI
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from uuid import uuid4
from dataclasses import dataclass
from .utils.logger import setup_logger

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

class BatchProcessor:
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"):
        """
        初始化BatchProcessor
        
        Args:
            api_key: API密钥，如果为None则从环境变量获取
            base_url: API基础URL
        """
        load_dotenv()
        self.client = OpenAI(
            api_key=api_key or os.getenv("DASHSCOPE_API_KEY"),
            base_url=base_url
        )
        self.logger = setup_logger(__name__)

    async def upload_file(self, file_path: str) -> str:
        """
        异步上传文件
        
        Args:
            file_path: 要上传的文件路径
            
        Returns:
            str: 上传后的文件ID
        """
        try:
            self.logger.info(f"Uploading file: {file_path}")
            file_object = self.client.files.create(file=Path(file_path), purpose="batch")
            self.logger.info(f"Upload response: {file_object}")
            return file_object.id
        except Exception as e:
            self.logger.error(f"Error uploading file: {str(e)}")
            raise

    def create_batch(self, file_id: str) -> BatchResponse:
        """
        创建批处理任务
        
        Args:
            file_id: 文件ID
            
        Returns:
            BatchResponse: 批处理任务响应对象
        """
        try:
            self.logger.info(f"Creating batch for file: {file_id}")
            response = self.client.batches.create(
                input_file_id=file_id,
                completion_window="24h",
                endpoint="/v1/chat/completions"
            )
            
            # 直接将响应转换为字典
            response_dict = response.model_dump()
            self.logger.info(f"Batch creation response: {response_dict}")
            return BatchResponse.from_json(response_dict)
        except Exception as e:
            self.logger.error(f"Error creating batch: {str(e)}")
            raise
    
    async def download_results(self, output_file_id, output_path="result.jsonl") -> str:
        """
        下载Batch任务结果
        
        Args:
            output_file_id: 输出文件ID
            output_path: 保存结果的本地文件路径
            
        Returns:
            str: 文件保存路径
        """
        content = self.client.files.content(output_file_id)
        # 保存结果文件至本地
        content.write_to_file(output_path)
        self.logger.info(f"download result file: {output_path}")
        return output_path

    async def download_errors(self, error_file_id, error_path="error.jsonl") -> str:
        """下载Batch任务失败结果"""
        content = self.client.files.content(error_file_id)
        # 保存错误信息文件至本地
        content.write_to_file(error_path)
        return error_path

    def get_batch_status(self, batch_id: str) -> Dict[str, Any]:
        """
        查询批处理任务状态
        
        Args:
            batch_id: 批处理任务ID
            
        Returns:
            包含务状态信息的字典
        """
        return self.client.batches.retrieve(batch_id)

    def list_batches(self, after: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        """
        获取批处理任务列表
        
        Args:
            after: 上一页最后一个任务的ID
            limit: 每页返回的任务数量
            
        Returns:
            包含任务列表的字典
        """
        return self.client.batches.list(after=after, limit=limit)

    def cancel_batch(self, batch_id: str) -> Dict[str, Any]:
        """
        取消批处理任务
        
        Args:
            batch_id: 要取消的批处理任务ID
            
        Returns:
            包含取消任务信息的字典
        """
        return self.client.batches.cancel(batch_id)
    
    def delete_file(self, file_id: str) -> Dict[str, Any]:
        """
        删除文件
        """
        return self.client.files.delete(file_id)

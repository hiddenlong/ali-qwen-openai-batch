from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from ..api_batch import BatchProcessor, BatchResponse
from ..utils.logger import setup_logger
import os
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
import aiofiles

class BatchController:
    def __init__(self):
        self.router = APIRouter(
            prefix="/api/batch",
            tags=["batch"]
        )
        self.batch_processor = BatchProcessor()
        self.logger = setup_logger(__name__)
        self.register_routes()

    def register_routes(self):
        @self.router.get("/list")
        async def list_batches(after: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
            """获取批处理任务列表"""
            try:
                self.logger.info(f"Fetching batch list with after={after}, limit={limit}")
                response = self.batch_processor.list_batches(after=after, limit=limit)
                
                # 将 SyncCursorPage 对象转换为字典格式
                result = {
                    "object": "list",
                    "data": [batch.model_dump() for batch in response.data],
                    "first_id": response.first_id,
                    "last_id": response.last_id,
                    "has_more": response.has_more
                }
                
                self.logger.info(f"Successfully retrieved {len(result['data'])} batches")
                return result
            except Exception as e:
                self.logger.error(f"Error listing batches: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.delete("/batches/{batch_id}")
        async def delete_batch(batch_id: str) -> Dict[str, Any]:
            """删除批处理任务"""
            try:
                self.logger.info(f"Deleting batch: {batch_id}")
                response = self.batch_processor.cancel_batch(batch_id)
                # 将 Batch 对象转换为字典
                result = response.model_dump()
                self.logger.info(f"Successfully cancelled batch: {batch_id}")
                return result
            except Exception as e:
                self.logger.error(f"Error deleting batch: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.get("/files")
        async def list_files() -> Dict[str, Any]:
            """获取文件列表"""
            try:
                self.logger.info("Fetching file list")
                response = self.batch_processor.file_list()
                
                # 将 SyncCursorPage[FileObject] 对象转换为字典格式
                result = {
                    "object": "list",
                    "data": [file.model_dump() for file in response.data],
                    "has_more": response.has_more
                }
                
                self.logger.info(f"Successfully retrieved {len(result['data'])} files")
                return result
            except Exception as e:
                self.logger.error(f"Error listing files: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.delete("/files/{file_id}")
        async def delete_file(file_id: str):
            """删除文件"""
            try:
                self.logger.info(f"Deleting file: {file_id}")
                response = self.batch_processor.delete_file(file_id)
                self.logger.info(f"Successfully deleted file: {file_id}")
                # 将 FileDeleted 对象转换为字典
                return {
                    "id": response.id,
                    "deleted": response.deleted,
                    "object": response.object
                }
            except Exception as e:
                self.logger.error(f"Error deleting file: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.get("/files/{file_id}/download")
        async def download_file(file_id: str) -> StreamingResponse:
            """下载文件"""
            try:
                self.logger.info(f"Downloading file: {file_id}")
                
                # 创建下载目录
                downloads_dir = Path("downloads")
                downloads_dir.mkdir(exist_ok=True)
                
                # 先获取文件信息以确定文件名和类型
                file_info = self.batch_processor.client.files.retrieve(file_id)
                filename = file_info.filename or f"{file_id}.jsonl"
                
                output_path = downloads_dir / filename
                
                # 下载文件
                try:
                    file_path = await self.batch_processor.download_results(file_id, str(output_path))
                except Exception as e:
                    self.logger.error(f"Download failed: {str(e)}")
                    if "406" in str(e):
                        raise HTTPException(
                            status_code=406,
                            detail="File is not available for download or is in an invalid state"
                        )
                    raise
                    
                if not os.path.exists(file_path):
                    raise HTTPException(status_code=404, detail="File not found")
                    
                if os.path.getsize(file_path) == 0:
                    raise HTTPException(status_code=500, detail="File is empty")
                    
                self.logger.info(f"Streaming file: {file_path}")

                # 创建异步文件流
                async def file_stream():
                    async with aiofiles.open(file_path, 'rb') as f:
                        while chunk := await f.read(8192):  # 8KB chunks
                            yield chunk
                    # 传输完成后删除临时文件
                    os.unlink(file_path)
                
                # 设置正确的 Content-Type
                content_type = 'application/json' if filename.endswith('.jsonl') else 'text/plain'
                
                # 返回流式响应
                return StreamingResponse(
                    file_stream(),
                    media_type=content_type,
                    headers={
                        'Content-Disposition': f'attachment; filename="{filename}"'
                    }
                )
            except HTTPException:
                raise
            except Exception as e:
                self.logger.error(f"Error downloading file: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.get("/batches/{batch_id}")
        async def get_batch_status(batch_id: str) -> Dict[str, Any]:
            """获取批处理任务状态"""
            try:
                self.logger.info(f"Fetching batch status: {batch_id}")
                response = self.batch_processor.get_batch_status(batch_id)
                # 将 Batch 对象转换为字典
                result = response.model_dump()
                self.logger.info(f"Successfully retrieved status for batch: {batch_id}")
                return result
            except Exception as e:
                self.logger.error(f"Error getting batch status: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

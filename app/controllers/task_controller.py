from fastapi import APIRouter, HTTPException, Body, UploadFile, File, Request, Form
from typing import List, Optional
from pydantic import BaseModel
from pathlib import Path
import aiofiles

from ..api_batch import BatchProcessor
from ..services.task_service import TaskService
from ..models.task_entity import Task
from ..utils.logger import setup_logger
import os

class ContentRequest(BaseModel):
    contents: List[str]

class TaskCreateRequest(BaseModel):
    content: str
    system_prompt: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "content": "Task content here",
                "system_prompt": "You are a helpful assistant."
            }
        }

class TaskController:
    def __init__(self):
        self.router = APIRouter(
            prefix="/api/task",
            tags=["task"]
        )
        self.task_service = TaskService()
        self.logger = setup_logger(__name__)
        self.register_routes()

    def register_routes(self):
        @self.router.get("/get")
        async def list_tasks() -> List[Task]:
            """获取所有任务"""
            try:
                tasks = self.task_service.list_tasks()
                return tasks
            except Exception as e:
                self.logger.error(f"Error listing tasks: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.get("/{task_id}")
        async def get_task(task_id: str) -> Task:
            """获取任务信息"""
            task = self.task_service.get_task(task_id)
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
            return task

        @self.router.post("/create")
        async def create_single_task(request: TaskCreateRequest = Body(...)) -> Task:
            """创建单个任务"""
            try:
                self.logger.info(f"Received task creation request: {request}")
                task = self.task_service.create_task(
                    request.content,
                    system_prompt=request.system_prompt
                )
                processed_task = await self.task_service.process_task(task.id)
                self.logger.info(f"Created and processed task: {processed_task}")
                return processed_task
            except Exception as e:
                self.logger.error(f"Error creating task: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.post("/{task_id}/cancel")
        async def cancel_task(task_id: str) -> Task:
            """取消任务"""
            try:
                return await self.task_service.cancel_task(task_id)
            except ValueError as e:
                raise HTTPException(status_code=404, detail=str(e))
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.delete("/{task_id}/file")
        async def delete_file(task_id: str) -> Task:
            """删除任务文件"""
            try:
                return await self.task_service.delete_file(task_id)
            except ValueError as e:
                raise HTTPException(status_code=404, detail=str(e))
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.get("/{task_id}/status")
        async def check_status(task_id: str) -> Task:
            """检查任务状态"""
            try:
                return await self.task_service.check_task_status(task_id)
            except ValueError as e:
                raise HTTPException(status_code=404, detail=str(e))
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.delete("/{task_id}")
        async def delete_task(task_id: str) -> dict:
            """删除任务"""
            try:
                await self.task_service.delete_task(task_id)
                return {"message": f"Task {task_id} deleted successfully"}
            except ValueError as e:
                raise HTTPException(status_code=404, detail=str(e))
            except Exception as e:
                self.logger.error(f"Error deleting task: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.get("/batches/{batch_id}")
        async def get_batch_status(batch_id: str):
            """获取批处理详情"""
            try:
                batch_info = self.task_service.get_batch_status(batch_id)
                return batch_info
            except Exception as e:
                self.logger.error(f"Error getting batch status: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        

        @self.router.get("/{task_id}/result")
        async def get_task_result(task_id: str):
            """获取任务结果"""
            try:
                task = self.task_service.get_task(task_id)
                if not task:
                    raise HTTPException(status_code=404, detail="Task not found")
                
                if not task.result:
                    raise HTTPException(status_code=404, detail="Task result not found")
                
                result_content = await self.task_service.get_task_result_content(task_id)
                return result_content
                
            except ValueError as e:
                raise HTTPException(status_code=404, detail=str(e))
            except Exception as e:
                self.logger.error(f"Error getting task result: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.post("/upload")
        async def upload_tasks(
            request: Request,
            files: List[UploadFile] = File(...),
            system_prompt: str = Form(default=None)
        ) -> List[Task]:
            """从文件批量创建任务"""
            try:
                # 定义文件大小限制 (1MB)
                MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB in bytes
                
                all_tasks = []
                temp_dir = Path("temp")
                temp_dir.mkdir(exist_ok=True)

                self.logger.info("=== Upload Task Debug Info ===")
                self.logger.info(f"Received system_prompt: {system_prompt!r}")
                self.logger.info(f"Files count: {len(files)}")
                
                for file in files:
                    self.logger.info(f"\nProcessing file: {file.filename}")
                    
                    # 读取文件内容并检查大小
                    content = await file.read()
                    if len(content) > MAX_FILE_SIZE:
                        raise HTTPException(
                            status_code=400,
                            detail=f"File {file.filename} exceeds maximum size of 1MB"
                        )
                    
                    file_path = temp_dir / file.filename
                    async with aiofiles.open(file_path, 'wb') as f:
                        await f.write(content)
                    
                    self.logger.info(f"File size: {os.path.getsize(file_path)} bytes")
                    self.logger.info(f"Using system_prompt: {system_prompt}")
                    
                    async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                        file_content = await f.read()
                        self.logger.info(f"Content length: {len(file_content)} characters")
                        
                        task = self.task_service.create_task(
                            file_content,
                            system_prompt=system_prompt
                        )
                        self.logger.info(f"Created task with ID: {task.id}")
                        self.logger.info(f"Task system_prompt: {task.system_prompt!r}")
                        batch_task  = await self.task_service.process_task(task.id)
                        self.logger.info(f"Batch task batch_id: {batch_task.batch_id}")
                        all_tasks.append(batch_task)
                    
                    file_path.unlink()

                self.logger.info(f"\nCreated {len(all_tasks)} tasks in total")
                self.logger.info("=== End Upload Task Debug Info ===")
                return all_tasks
            except Exception as e:
                self.logger.error(f"Error uploading tasks: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=str(e))

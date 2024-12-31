import uuid
import json
from datetime import datetime
from typing import List, Optional, Dict
from ..models.task import Task, TaskStatus
from ..utils.jsonl_generator import JsonlGenerator
from ..utils.logger import setup_logger
from ..api_batch import BatchProcessor
from pathlib import Path
from ..repositories.task_repository import TaskRepository
import aiofiles

class TaskService:
    def __init__(self):
        self.jsonl_generator = JsonlGenerator()
        self.batch_processor = BatchProcessor()
        self.logger = setup_logger(__name__)
        self.task_repository = TaskRepository()

    def create_task(self, content: str, system_prompt: Optional[str] = None) -> Task:
        """创建新任务"""
        task = Task(
            id=str(uuid.uuid4()),
            status=TaskStatus.VALIDATING.value,
            content=content,
            created_at=datetime.now(),
            file_path=None,
            file_id=None,
            batch_id=None,
            error_message=None,
            result=None,
            system_prompt=system_prompt
        )
        return self.task_repository.create(task)

    def create_multiple_tasks(self, contents: List[str]) -> List[Task]:
        """创建多个任务"""
        return [self.create_task(content) for content in contents]

    async def process_task(self, task_id: str) -> Task:
        """处理任务"""
        task = self.get_task(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")
        
        try:
            # 更新任务状态为处理中
            task.status = TaskStatus.IN_PROGRESS.value
            task = self.task_repository.update(task)
            
            # 创建JSONL文件
            file_path = self._create_jsonl_file(task)
            task.file_path = file_path
            
            # 上传文件并获取file_id
            file_id = await self.batch_processor.upload_file(file_path)
            if not file_id:
                task.status = TaskStatus.FAILED.value
                task.error_message = "Failed to upload file: file_id is empty"
                return self.task_repository.update(task)
            
            task.file_id = file_id
            task = self.task_repository.update(task)  # 保存file_id
            
            # 创建批处理任务
            try:
                batch = self.batch_processor.create_batch(file_id)
                task.batch_id = batch.id
                task.status = batch.status
                # 已经请求成功后，如果内容超过200个字符，截断并添加省略号
                if len(task.content) > 200:
                    task.content = task.content[:200] + "..."
            
            except Exception as batch_error:
                task.status = TaskStatus.FAILED.value
                task.error_message = f"Failed to create batch: {str(batch_error)}"
                self.logger.error(f"创建批处理任务失败: {str(batch_error)}")
                return self.task_repository.update(task)
                
        except Exception as e:
            task.status = TaskStatus.FAILED.value
            task.error_message = str(e)
            self.logger.error(f"处理任务失败: {str(e)}")
        
        return self.task_repository.update(task)

    def get_task(self, task_id: str) -> Optional[Task]:
        """获取任务"""
        return self.task_repository.get(task_id)

    def list_tasks(self) -> list[Task]:
        """获取所有任务"""
        return self.task_repository.list_all()

    async def cancel_task(self, task_id: str) -> Task:
        """取消任务"""
        task = self.task_repository.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        if task.batch_id:
            # 取消批处理任务
            self.batch_processor.cancel_batch(task.batch_id)

        if task.file_id:
            # 删除远程文件
            self.batch_processor.delete_file(task.file_id)

        # 删除本地文件
        if task.file_path:
            Path(task.file_path).unlink(missing_ok=True)

        task.status = TaskStatus.CANCELLED.value
        db_task = self.task_repository.update(task)
        task = TaskRepository.to_model(db_task)
        return task

    async def delete_file(self, task_id: str) -> Task:
        """删除任务相关的文件"""
        task = self.task_repository.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        if task.file_id:
            self.batch_processor.delete_file(task.file_id)
            task.file_id = None

        if task.file_path:
            Path(task.file_path).unlink(missing_ok=True)
            task.file_path = None

        db_task = self.task_repository.update(task)
        task = TaskRepository.to_model(db_task)
        return task

    async def check_task_status(self, task_id: str) -> Task:
        """检查任务状态"""
        task = self.task_repository.get(task_id)
        if not task:
            self.logger.warning(f"Task {task_id} not found")
            raise ValueError(f"Task {task_id} not found")

        try:
            if task.status == TaskStatus.COMPLETED.value:
                # 任务已完成
                if task.result is None:
                    task.result = await self.download_file(task.output_file_id)
            elif task.status == TaskStatus.FAILED.value:
                # 任务失败，记录日志
                self.logger.error(f"Task {task_id} failed: {task.error_message}")
            else:
                self.logger.warning(f"Task {task_id} has unknown status: {task.status}")

            return task

        except Exception as e:
            self.logger.error(f"Error checking task status: {str(e)}")
            task.status = TaskStatus.FAILED.value
            task.error_message = str(e)
            self.task_repository.update(task)
            raise

    def _create_jsonl_file(self, task: Task) -> str:
        """为单个任务创建JSONL文件"""
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        file_path = temp_dir / f"batch_input_{task.id}.jsonl"
        return self.jsonl_generator.create_jsonl_file(task, str(file_path))

    async def download_file(self, file_id: str, save_path: str = None) -> str:
        """下载文件并保存到指定路径
        Args:
            file_id: 文件ID
            save_path: 保存路径，如果为空则保存到 results 目录
        Returns:
            str: 实际保存的文件路径
        """
        try:
            if save_path is None:
                # 创建 results 目录（如果不存在）
                results_dir = Path("results")
                results_dir.mkdir(exist_ok=True)
                # 生成默认文件名
                save_path = str(results_dir / f"{file_id}")

            response = await self.batch_processor.download_results(file_id, save_path)
            return response
        except Exception as e:
            self.logger.error(f"下载文件 {file_id} 失败: {str(e)}")
            raise

    def update_task(self, task: Task) -> Task:
        """更新任务信息"""
        db_task = self.task_repository.update(task)
        return TaskRepository.to_model(db_task)

    async def get_task_result_content(self, task_id: str) -> dict:
        """获取任务结果文件的内容"""
        task = self.get_task(task_id)
        if not task or not task.result:
            raise ValueError("任务不存在或没有结果")

        result_content = {}
        
        # 读取输出文件
        if task.output_file_path:
            try:
                async with aiofiles.open(task.output_file_path, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    # 解析JSON并提取content字段
                    data = json.loads(content)
                    if isinstance(data, dict):
                        # 正确的路径: response -> body -> choices[0] -> message -> content
                        response_body = data.get('response', {}).get('body', {})
                        choices = response_body.get('choices', [])
                        if choices:
                            message = choices[0].get('message', {})
                            result_content["output"] = message.get('content', '')
                        else:
                            result_content["output"] = "No content found in response"
                    else:
                        result_content["output"] = "Invalid response format"
            except Exception as e:
                self.logger.error(f"读取输出文件失败: {str(e)}")
                result_content["output_error"] = str(e)

        # 读取错误文件
        if task.error_file_path:
            try:
                async with aiofiles.open(task.error_file_path, 'r', encoding='utf-8') as f:
                    error_content = await f.read()
                    result_content["error"] = json.loads(error_content)
            except Exception as e:
                self.logger.error(f"读取错误文件失败: {str(e)}")
                result_content["error_file_error"] = str(e)

        return result_content

    async def delete_task(self, task_id: str) -> None:
        """删除任务及其相关资源"""
        task = self.task_repository.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        try:
            # 如果有批处理任务，尝试取消
            if task.batch_id:
                try:
                    self.batch_processor.cancel_batch(task.batch_id)
                except Exception as e:
                    self.logger.warning(f"Failed to cancel batch {task.batch_id}: {e}")

            # 如果有远程文件，尝试删除
            if task.file_id:
                try:
                    self.batch_processor.delete_file(task.file_id)
                except Exception as e:
                    self.logger.warning(f"Failed to delete remote file {task.file_id}: {e}")

            # 删除本地文件
            if task.file_path:
                try:
                    Path(task.file_path).unlink(missing_ok=True)
                except Exception as e:
                    self.logger.warning(f"Failed to delete local file {task.file_path}: {e}")
            
            if task.output_file_id:
                try:
                    self.batch_processor.delete_file(task.output_file_id)
                except Exception as e:
                    self.logger.warning(f"Failed to delete remote file {task.output_file_id}: {e}")
            
            if task.error_file_id:
                try:
                    self.batch_processor.delete_file(task.error_file_id)
                except Exception as e:
                    self.logger.warning(f"Failed to delete remote file {task.error_file_id}: {e}")
            
            if task.output_file_path:
                try:
                    Path(task.output_file_path).unlink(missing_ok=True)
                except Exception as e:
                    self.logger.warning(f"Failed to delete local file {task.output_file_path}: {e}")
            
            if task.error_file_path:
                try:
                    Path(task.error_file_path).unlink(missing_ok=True)
                except Exception as e:
                    self.logger.warning(f"Failed to delete local file {task.error_file_path}: {e}")


            # 从数据库中删除任务
            self.task_repository.delete(task_id)
            
        except Exception as e:
            self.logger.error(f"Error while deleting task {task_id}: {e}")
            raise Exception(f"Failed to delete task: {str(e)}") 

    def get_batch_status(self, batch_id: str) -> dict:
        """获取批处理详情"""
        try:
            batch_info = self.batch_processor.get_batch_status(batch_id)
            return batch_info
        except Exception as e:
            self.logger.error(f"Error getting batch status: {str(e)}")
            raise Exception(f"Failed to get batch status: {str(e)}") 
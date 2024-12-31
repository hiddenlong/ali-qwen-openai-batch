import asyncio
from ..services.task_service import TaskService
from ..models.task_entity import TaskStatus
from ..utils.logger import setup_logger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import json

class BatchScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.task_service = TaskService()
        self.logger = setup_logger(__name__)

    async def update_batch_status(self):
        """更新所有批处理任务的状态"""
        try:
            self.logger.info("开始批量更新任务状态")
            tasks = self.task_service.list_tasks()
            self.logger.info(f"找到 {len(tasks)} 个任务需要检查")
            
            for task in tasks:
                try:
                    self.logger.info(f"正在检查任务 {task.id}，当前状态: {task.status}")
                    
                    if task.status not in [TaskStatus.COMPLETED.value, TaskStatus.EXPIRED.value, 
                                         TaskStatus.CANCELLING.value, TaskStatus.CANCELLED.value]:
                        self.logger.info(f"任务 {task.id} 正在进行中，获取批处理状态 (batch_id: {task.batch_id})")
                        batch_info = self.task_service.get_batch_status(task.batch_id)
                        old_status = task.status
                        task.status = batch_info.status
                        self.logger.info(f"任务 {task.id} 状态从 {old_status} 更新为 {task.status}")
                        
                        if task.status == TaskStatus.COMPLETED.value and task.output_file_path is None:
                            self.logger.info(f"任务 {task.id} 已完成，开始处理输出文件")
                            
                            if batch_info.output_file_id:
                                self.logger.info(f"下载输出文件 (file_id: {batch_info.output_file_id})")
                                out_path = await self.task_service.download_file(batch_info.output_file_id)
                                task.output_file_path = out_path
                                self.logger.info(f"输出文件已保存到: {out_path}")
                                
                                with open(out_path, 'r', encoding='utf-8') as f:
                                    content = f.read()
                                    task.result = json.loads(content)
                                    task.output_file_id = batch_info.output_file_id
                                    self.logger.info(f"已解析输出文件内容到任务结果")
                            
                            if batch_info.error_file_id:
                                self.logger.info(f"发现错误文件 (error_file_id: {batch_info.error_file_id})")
                                error_path = await self.task_service.download_file(
                                    batch_info.error_file_id, 
                                    f"results/error_{task.id}.jsonl"
                                )
                                self.logger.info(f"错误文件已保存到: {error_path}")
                                
                                with open(error_path, 'r', encoding='utf-8') as f:
                                    error_content = f.read()
                                    if task.result is None:
                                        task.result = {}
                                    task.result['errors'] = json.loads(error_content)
                                    task.error_file_path = error_path
                                    task.error_file_id = batch_info.error_file_id
                                    self.logger.info(f"已解析错误文件内容到任务结果")

                        self.task_service.update_task(task)
                        self.logger.info(f"任务 {task.id} 更新完成")
                    else:
                        self.logger.debug(f"跳过任务 {task.id}，当前状态 {task.status} 无需更新")
                            
                except Exception as e:
                    self.logger.error(f"更新任务 {task.id} 时发生错误: {str(e)}", exc_info=True)
                    continue
        except Exception as e:
            self.logger.error(f"批量更新任务状态时发生错误: {str(e)}", exc_info=True)
        finally:
            self.logger.info("批量更新任务状态完成")

    def start(self):
        """启动调度器"""
        self.scheduler.add_job(
            self.update_batch_status,
            'interval',
            minutes=1,
            id='update_batch_status'
        )
        self.scheduler.start()

    def shutdown(self):
        """关闭调度器"""
        if self.scheduler:
            self.scheduler.shutdown() 
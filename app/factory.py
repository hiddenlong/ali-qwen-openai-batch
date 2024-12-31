from .controllers.task_controller import TaskController
from .controllers.batch_controller import BatchController
from .schedulers.batch_scheduler import BatchScheduler

class ApplicationFactory:
    @staticmethod
    def create_task_controller():
        return TaskController()
    
    @staticmethod
    def create_batch_controller():
        return BatchController()
    
    @staticmethod
    def create_batch_scheduler():
        return BatchScheduler()
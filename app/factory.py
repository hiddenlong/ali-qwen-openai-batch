from .controllers.task_controller import TaskController

class ApplicationFactory:
    @staticmethod
    def create_batch_controller():
        # 不再需要传递 batch_service
        return TaskController()
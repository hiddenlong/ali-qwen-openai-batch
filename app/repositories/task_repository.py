from ..models.database_models import TaskORM
from ..database.database import SessionLocal
from ..models.task_entity import Task
from typing import List, Optional

class TaskRepository:
    def __init__(self):
        self.db = SessionLocal

    def create(self, task: Task) -> Task:
        db = self.db()
        try:
            db_task = TaskORM(
                id=task.id,
                status=task.status,
                content=task.content,
                created_at=task.created_at,
                file_path=task.file_path,
                file_id=task.file_id,
                batch_id=task.batch_id,
                error_message=task.error_message,
                result=task.result,
                output_file_path=task.output_file_path,
                system_prompt=task.system_prompt,
                output_file_id=task.output_file_id,
                error_file_id=task.error_file_id
            )
            db.add(db_task)
            db.commit()
            db.refresh(db_task)
            return self.to_model(db_task)
        finally:
            db.close()

    def get(self, task_id: str) -> Optional[Task]:
        db = self.db()
        try:
            db_task = db.query(TaskORM).filter(TaskORM.id == task_id).first()
            return self.to_model(db_task) if db_task else None
        finally:
            db.close()

    def list_all(self) -> List[Task]:
        db = self.db()
        try:
            db_tasks = db.query(TaskORM).all()
            return [self.to_model(task) for task in db_tasks]
        finally:
            db.close()

    def update(self, task: Task) -> Task:
        db = self.db()
        try:
            db_task = db.query(TaskORM).filter(TaskORM.id == task.id).first()
            if db_task:
                for key, value in task.model_dump().items():
                    setattr(db_task, key, value)
                db.commit()
                db.refresh(db_task)
                return self.to_model(db_task)
            return None
        finally:
            db.close()

    def delete(self, task_id: str) -> None:
        db = self.db()
        try:
            task = db.query(TaskORM).filter(TaskORM.id == task_id).first()
            if task:
                db.delete(task)
                db.commit()
        finally:
            db.close()

    @staticmethod
    def to_model(task_orm: TaskORM) -> Task:
        return Task(
            id=task_orm.id,
            status=task_orm.status,
            content=task_orm.content,
            created_at=task_orm.created_at,
            file_path=task_orm.file_path,
            file_id=task_orm.file_id,
            batch_id=task_orm.batch_id,
            error_message=task_orm.error_message,
            result=task_orm.result,
            output_file_path=task_orm.output_file_path,
            system_prompt=task_orm.system_prompt,
            output_file_id=task_orm.output_file_id,
            error_file_id=task_orm.error_file_id
        ) 
from sqlalchemy import Column, String, DateTime, JSON
from ..database.database import Base

class TaskORM(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    file_path = Column(String, nullable=True)
    file_id = Column(String, nullable=True)
    output_file_id = Column(String, nullable=True)
    error_file_id = Column(String, nullable=True)
    batch_id = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    result = Column(JSON, nullable=True)
    output_file_path = Column(String, nullable=True)
    error_file_path = Column(String, nullable=True)
    system_prompt = Column(String, nullable=True)
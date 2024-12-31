import json
from typing import List, Dict, Any
from uuid import uuid4
from ..utils.logger import setup_logger
import os
from ..models.task_entity import Task

class JsonlGenerator:
    def __init__(self, model: str = "qwen-turbo"):
        self.model = model
        self.logger = setup_logger(__name__)

    def generate_request(self, content: str, system_prompt: str = "You are a helpful assistant.") -> Dict[str, Any]:
        """生成单个请求数据"""
        return {
            "custom_id": f"request-{str(uuid4())}",
            "method": "POST",
            "url": "/v1/chat/completions",
            "body": {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": content}
                ]
            }
        }

    def create_jsonl_file(self, task: Task, output_path: str) -> str:
        """
        生成JSONL文件，使用task的content和system_prompt
        """
        self.logger.info(f"Creating JSONL file for task {task.id}")
        with open(output_path, 'w', encoding='utf-8') as f:
            request = self.generate_request(
                task.content, 
                system_prompt=task.system_prompt or "You are a helpful assistant."
            )
            json_line = json.dumps(request, ensure_ascii=False)
            self.logger.debug(f"Generated JSONL line: {json_line}")
            f.write(json_line + '\n')
        
        self.logger.info(f"JSONL file created at: {output_path}")
        return output_path 
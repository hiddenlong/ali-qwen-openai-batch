import * as uiRenderer from './uiRenderer.js';
import { showMessage } from './messageService.js';
import { showConfirmDialog } from './dialogService.js';

// API请求相关的函数
export async function fetchTaskList() {
    const response = await fetch('/api/task/get');
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

export async function createTask(content, systemPrompt = null) {
    const response = await fetch('/api/task/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            content,
            system_prompt: systemPrompt 
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// 获取任务结果
export async function getTaskResult(taskId) {
    try {
        const response = await fetch(`/api/task/${taskId}/result`);
        const result = await response.json();
        if (result) {
            uiRenderer.showTaskResult(result);
            return result;
        } else {
            alert('任务还未完成或没有结果');
        }
    } catch (error) {
        console.error('获取任务结果失败:', error);
        alert('获取任务结果失败');
        throw error;
    }
}

// 检查任务状态
export async function checkTaskStatus(taskId) {
    try {
        const response = await fetch(`/api/task/${taskId}/status`);
        return await response.json();
    } catch (error) {
        console.error('检查任务状态失败:', error);
        alert('检查任务状态失败');
        throw error;
    }
}

// 取消任务
export async function cancelTask(taskId) {
    const confirmed = await showConfirmDialog('确定要取消此任务吗？');
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`/api/task/${taskId}/cancel`, {
            method: 'POST'
        });
        const result = await response.json();
        showMessage('任务已成功取消', 'success');
        return result;
    } catch (error) {
        console.error('取消任务失败:', error);
        showMessage('取消任务失败: ' + error.message, 'error');
        throw error;
    }
}

// 添加删除任务的函数
export async function deleteTask(taskId) {
    const confirmed = await showConfirmDialog('确定要删除此任务吗？');
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`/api/task/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        showMessage('任务已成功删除', 'success');
    } catch (error) {
        console.error('删除任务失败:', error);
        showMessage('删除任务失败: ' + error.message, 'error');
        throw error;
    }
}

// 添加检查批处理状态的函数
export async function checkBatchStatus(batchId) {
    try {
        const response = await fetch(`/api/task/batches/${batchId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const batchInfo = await response.json();
        uiRenderer.showBatchInfo(batchInfo);
        return batchInfo;
    } catch (error) {
        console.error('获取批处理状态失败:', error);
        alert('获取批处理状态失败: ' + error.message);
        throw error;
    }
}

export async function uploadTaskFiles(files, systemPrompt) {
    // 添加文件大小检查
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB in bytes
    for (let file of files) {
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`文件 "${file.name}" 超过1MB大小限制`);
        }
    }

    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    
    if (systemPrompt) {
        formData.append('system_prompt', systemPrompt);
    } else {
        formData.append('system_prompt', 'you are a helpful assistant');
    }   
    try {
        const response = await fetch('/api/task/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `上传失败 (${response.status})`);
        }

        const result = await response.json();
        showMessage(`成功上传 ${files.length} 个文件`, 'success');
        return result;
    } catch (error) {
        console.error('上传文件失败:', error);
        showMessage(error.message, 'error');
        throw error;
    }
}
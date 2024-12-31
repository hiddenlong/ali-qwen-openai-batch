import { showMessage } from './messageService.js';

// 加载批处理列表
export async function loadBatchList() {
    try {
        const response = await fetch('/api/batch/list');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('加载批处理列表失败:', error);
        throw error;
    }
}


// 加载文件列表
export async function loadFileList() {
    try {
        const response = await fetch('/api/batch/files');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('加载文件列表失败:', error);
        throw error;
    }
}

// 下载文件
export async function downloadFile(fileId) {
    try {
        window.location.href = `/api/batch/files/${fileId}/download`;
        showMessage('文件开始下载', 'success');
    } catch (error) {
        console.error('下载文件失败:', error);
        showMessage('下载文件失败: ' + error.message, 'error');
        throw error;
    }
}

// 删除文件
export async function deleteFile(fileId) {
    try {
        const response = await fetch(`/api/batch/files/${fileId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('删除失败');
        }
        
        showMessage('文件已删除', 'success');
        return true;
    } catch (error) {
        console.error('删除文件失败:', error);
        showMessage('删除文件失败', 'error');
        throw error;
    }
} 
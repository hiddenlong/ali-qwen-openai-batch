import { TaskStatus } from './constants.js';
import * as taskService from './taskService.js';
import * as uiRenderer from './uiRenderer.js';

// 获取任务列表
async function fetchTasks() {
    try {
        const tasks = await taskService.fetchTaskList();
        uiRenderer.renderTasks(tasks);
    } catch (error) {
        console.error('获取任务列表失败:', error);
        uiRenderer.renderTasks([]);
    }
}

// 添加 loading 状态控制函数
function setLoading(isLoading, type = 'create') {
    const btn = document.getElementById('createSingleTaskBtn');
    const uploadLabel = document.getElementById('uploadLabel');
    const fileInput = document.getElementById('fileUpload');
    const createBtnText = document.getElementById('createBtnText');
    const createBtnLoading = document.getElementById('createBtnLoading');
    const uploadBtnText = document.getElementById('uploadBtnText');
    const uploadBtnLoading = document.getElementById('uploadBtnLoading');

    if (type === 'create') {
        btn.disabled = isLoading;
        createBtnText.textContent = isLoading ? '创建中...' : '创建单个任务';
        createBtnLoading.classList.toggle('hidden', !isLoading);
    } else {
        uploadLabel.classList.toggle('cursor-not-allowed', isLoading);
        fileInput.disabled = isLoading;
        uploadBtnText.textContent = isLoading ? '上传中...' : '上传文件创建任务';
        uploadBtnLoading.classList.toggle('hidden', !isLoading);
    }
}

// 修改创建任务的函数
async function createSingleTask() {
    const content = document.getElementById('taskContent').value.trim();
    const systemPrompt = document.getElementById('systemPrompt').value.trim();
    
    if (!content) {
        alert('请输入任务内容');
        return;
    }

    try {
        setLoading(true, 'create');
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content,
                system_prompt: systemPrompt || undefined
            }),
        });

        if (!response.ok) {
            throw new Error('创建任务失败');
        }

        const task = await response.json();
        await refreshTaskList();
        document.getElementById('taskContent').value = '';
        document.getElementById('systemPrompt').value = '';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    } finally {
        setLoading(false, 'create');
    }
}

// 修改文件上传函数
async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    const systemPrompt = document.getElementById('systemPrompt').value.trim();
    const uploadLabel = document.getElementById('uploadLabel');
    const fileInput = document.getElementById('fileUpload');

    try {
        // 禁用上传按钮和输入
        setLoading(true, 'upload');
        uploadLabel.classList.add('opacity-50');
        fileInput.disabled = true;

        await taskService.uploadTaskFiles(files, systemPrompt);
        await fetchTasks();
        
        // 清空输入
        event.target.value = '';
        // document.getElementById('systemPrompt').value = '';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    } finally {
        // 恢复上传按钮和输入
        setLoading(false, 'upload');
        uploadLabel.classList.remove('opacity-50');
        fileInput.disabled = false;
    }
}

// 初始化事件监听
function initializeEventListeners() {
    document.getElementById('createSingleTaskBtn').addEventListener('click', createSingleTask);
    document.addEventListener('DOMContentLoaded', fetchTasks);
    
    // 添加事件委托处理任务列表的按钮点击
    document.getElementById('taskList').addEventListener('click', async (e) => {
        const target = e.target;
        if (target.tagName === 'BUTTON') {
            const taskId = target.dataset.taskId;
            const batchId = target.dataset.batchId;
            
            try {
                switch (target.dataset.action) {
                    case 'checkBatch':
                        await taskService.checkBatchStatus(batchId);
                        break;
                    case 'getResult':
                        await taskService.getTaskResult(taskId);
                        break;
                    case 'cancel':
                        await taskService.cancelTask(taskId);
                        await fetchTasks(); // 刷新任务列表
                        break;
                    case 'delete':
                        await taskService.deleteTask(taskId);
                        await fetchTasks(); // 刷新任务列表
                        break;
                }
            } catch (error) {
                console.error('操作失败:', error);
            }
        }
    });

    setInterval(fetchTasks, 30000);
}

// 将处理函数添加到 window 对象，使其在 HTML 中可访问
window.handleFileUpload = handleFileUpload;

initializeEventListeners();
import { TaskStatus } from './constants.js';
import * as taskService from './taskService.js';
import * as uiRenderer from './uiRenderer.js';
import { 
    deleteBatch, 
    viewBatchDetails, 
    downloadFile, 
    deleteFile,
    loadBatchList,
    loadFileList
} from './batchService.js';

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

    // 设置定时刷新任务列表
    setInterval(fetchTasks, 30000);
}

// 将处理函数添加到 window 对象，使其在 HTML 中可访问
window.handleFileUpload = handleFileUpload;

// Tab 切换控制
function setupTabs() {
    console.log('Setting up tabs...');
    const tabs = {
        tasks: document.getElementById('tasksTab'),
        batches: document.getElementById('batchesTab'),
        files: document.getElementById('filesTab')
    };

    // 检查元素是否存在
    for (const [name, element] of Object.entries(tabs)) {
        if (!element) {
            console.error(`${name} tab element not found`);
            return;
        }
    }

    // 初始状态设置
    showTab('tasks');

    // 添加点击事件监听器
    Object.entries(tabs).forEach(([name, tab]) => {
        tab.addEventListener('click', () => showTab(name));
    });
}

// 修改 showTab 函数
async function showTab(tabName) {
    console.log('Switching to tab:', tabName);
    const tasksTab = document.getElementById('tasksTab');
    const batchesTab = document.getElementById('batchesTab');
    const filesTab = document.getElementById('filesTab');
    const tasksContent = document.getElementById('tasksContent');
    const batchesContent = document.getElementById('batchesContent');
    const filesContent = document.getElementById('filesContent');

    // 重置所有 tab 和内容
    [tasksTab, batchesTab, filesTab].forEach(tab => tab.classList.remove('active'));
    [tasksContent, batchesContent, filesContent].forEach(content => content.classList.add('hidden'));

    // 根据选择的 tab 显示对应内容
    switch(tabName) {
        case 'tasks':
            tasksTab.classList.add('active');
            tasksContent.classList.remove('hidden');
            fetchTasks();
            break;
        case 'batches':
            batchesTab.classList.add('active');
            batchesContent.classList.remove('hidden');
            const batches = await loadBatchList();  // 获取批处理数据
            uiRenderer.renderBatches(batches);  // 渲染批处理数据
            break;
        case 'files':
            filesTab.classList.add('active');
            filesContent.classList.remove('hidden');
            const files = await loadFileList();  // 获取文件数据
            uiRenderer.renderFiles(files);  // 渲染文件数据
            break;
    }
}

// 将这些方法添加到全局作用域
window.deleteBatch = deleteBatch;
window.viewBatchDetails = viewBatchDetails;
window.downloadFile = downloadFile;
window.deleteFile = deleteFile;
window.loadBatchList = loadBatchList;
window.loadFileList = loadFileList;

// 在页面加载完成后初始化所有功能
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    initializeEventListeners();
    fetchTasks(); // 确保初始加载任务列表
});


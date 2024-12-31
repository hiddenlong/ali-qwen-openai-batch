import { TaskStatus, cancellableStatuses, deletableStatuses } from './constants.js';
import { marked } from './marked.esm.js';

export function renderTasks(tasks) {
    const taskList = document.getElementById('taskList');
    if (!Array.isArray(tasks)) {
        console.error('任务数据格式错误:', tasks);
        taskList.innerHTML = '<p class="text-red-500">加载任务列表失败</p>';
        return;
    }

    taskList.innerHTML = tasks.map(task => {
        // 确保 task 不为 null
        if (!task) return '';
        
        // 添加数据验证
        const content = task.content || '无内容';
        const status = task.status || 'UNKNOWN';
        const taskId = task.id || '';
        const batchId = task.batch_id || '';
        const result = task.result || '';
        
        return `
            <div class="bg-white p-4 rounded-lg shadow mb-4">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="text-sm text-gray-500">任务ID: ${taskId}</div>
                        <div class="mt-2 text-gray-600">
                            <p>提示词: ${task.system_prompt && task.system_prompt.length > 100 ? task.system_prompt.slice(0, 100) + '...' : task.system_prompt}</p>
                            <p>内容: ${content.length > 20 ? content.slice(0, 20) + '...' : content}</p>
                            ${batchId ? `<p class="text-sm text-gray-500">批次ID: ${batchId}</p>` : ''}
                            ${result ? `<p class="mt-2">结果: 
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 animate-pulse">
                                可查看</span></p>` : ''}
                        </div>
                    </div>
                    <div class="ml-4">
                        <span class="px-2 py-1 text-sm rounded ${getStatusClass(status)}">${getStatusText(status)}</span>
                    </div>
                </div>
                ${renderTaskButtons(task)}
            </div>
        `;
    }).join('');
}

function getStatusClass(status) {
    const statusClasses = {
        'validating': 'bg-yellow-100 text-yellow-800',
        'failed': 'bg-red-100 text-red-800',
        'in_progress': 'bg-blue-100 text-blue-800',
        'finalizing': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
        'expiring': 'bg-orange-100 text-orange-800',
        'expired': 'bg-gray-100 text-gray-800',
        'cancelling': 'bg-yellow-100 text-yellow-800',
        'cancelled': 'bg-gray-100 text-gray-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

function getStatusText(status) {
    const statusTexts = {
        'validating': '验证中',
        'failed': '失败',
        'in_progress': '处理中',
        'finalizing': '完成中',
        'completed': '已完成',
        'expiring': '即将过期',
        'expired': '已过期',
        'cancelling': '取消中',
        'cancelled': '已取消'
    };
    return statusTexts[status] || '未知状态';
}

function renderTaskButtons(task) {
    if (!task) return '';
    
    const buttons = [];
    
    if (task.batch_id) {
        buttons.push(`
            <button data-action="checkBatch" data-batch-id="${task.batch_id}"
                    class="text-blue-600 hover:text-blue-800">
                查看批次状态
            </button>
        `);
    }
    
    if (task.status === TaskStatus.COMPLETED) {
        buttons.push(`
            <button data-action="getResult" data-task-id="${task.id}"
                    class="text-green-600 hover:text-green-800">
                查看结果
            </button>
        `);
    }
    
    if (cancellableStatuses.includes(task.status)) {
        buttons.push(`
            <button data-action="cancel" data-task-id="${task.id}"
                    class="text-yellow-600 hover:text-yellow-800">
                取消任务
            </button>
        `);
    }
    
    if (deletableStatuses.includes(task.status)) {
        buttons.push(`
            <button data-action="delete" data-task-id="${task.id}"
                    class="text-red-600 hover:text-red-800">
                删除任务
            </button>
        `);
    }
    
    return `
        <div class="mt-4 space-x-4">
            ${buttons.join('')}
        </div>
    `;
}

// 通用的抽屉显示函数
function showDrawer(title, content) {
    const drawerContent = document.createElement('div');
    drawerContent.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-end opacity-0 transition-opacity duration-300">
            <div class="bg-white w-full max-w-3xl h-full transform transition-transform duration-300 translate-x-full"
                 id="resultDrawer">
                <div class="h-full flex flex-col p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">${title}</h3>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="flex-1 overflow-auto">
                        ${content}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(drawerContent);

    // 强制浏览器重排，确保初始状态被渲染
    drawerContent.offsetHeight;

    // 添加动画效果：先显示背景，然后滑入抽屉
    requestAnimationFrame(() => {
        drawerContent.firstElementChild.classList.remove('opacity-0');
        const drawer = document.getElementById('resultDrawer');
        drawer.classList.remove('translate-x-full');
    });

    // 点击背景关闭
    drawerContent.querySelector('.fixed').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            const drawer = document.getElementById('resultDrawer');
            const backdrop = drawerContent.firstElementChild;
            drawer.classList.add('translate-x-full');
            backdrop.classList.add('opacity-0');
            setTimeout(() => {
                drawerContent.remove();
            }, 300);
        }
    });

    // ESC键关闭
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            const drawer = document.getElementById('resultDrawer');
            const backdrop = drawerContent.firstElementChild;
            drawer.classList.add('translate-x-full');
            backdrop.classList.add('opacity-0');
            setTimeout(() => {
                drawerContent.remove();
            }, 300);
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);

    return drawerContent.querySelector('.bg-white'); // 返回抽屉内容元素
}

export function showTaskResult(result) {
    const content = `
        ${result.output ? `
            <div class="mb-4">
                <h4 class="font-semibold mb-2">输出内容：</h4>
                <div class="bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none">
                    ${marked(result.output, {
                        breaks: true,
                        gfm: true
                    })}
                </div>
            </div>
        ` : ''}
        ${result.error ? `
            <div class="mb-4">
                <h4 class="font-semibold mb-2">错误内容：</h4>
                <pre class="bg-red-50 p-4 rounded-lg text-red-700 whitespace-pre-wrap break-words">${result.error}</pre>
            </div>
        ` : ''}
    `;
    
    showDrawer('任务结果', content);
}

export function showBatchInfo(batchInfo) {
    const content = `
        <div class="space-y-2">
            <div class="grid grid-cols-1 gap-2">
                <p><span class="font-semibold">批处理ID:</span> ${batchInfo.id}</p>
                <p><span class="font-semibold">状态:</span> ${batchInfo.status}</p>
                
                <div class="mt-4">
                    <h4 class="font-semibold mb-2">文件信息:</h4>
                    <p><span class="font-semibold">输入文件ID:</span> ${batchInfo.input_file_id || '无'}</p>
                    <div class="flex items-center gap-2">
                        <p><span class="font-semibold">输出文件ID:</span> ${batchInfo.output_file_id || '无'}</p>
                    </div>
                    <p><span class="font-semibold">错误文件ID:</span> ${batchInfo.error_file_id || '无'}</p>
                </div>

                <div class="mt-4">
                    <h4 class="font-semibold mb-2">时间信息:</h4>
                    <p><span class="font-semibold">创建时间:</span> ${new Date(batchInfo.created_at * 1000).toLocaleString()}</p>
                    <p><span class="font-semibold">完成时间:</span> ${batchInfo.completed_at ? new Date(batchInfo.completed_at * 1000).toLocaleString() : '未完成'}</p>
                    <p><span class="font-semibold">过期时间:</span> ${batchInfo.expires_at ? new Date(batchInfo.expires_at * 1000).toLocaleString() : '未设置'}</p>
                    ${batchInfo.in_progress_at ? `<p><span class="font-semibold">开始处理时间:</span> ${new Date(batchInfo.in_progress_at * 1000).toLocaleString()}</p>` : ''}
                    ${batchInfo.finalizing_at ? `<p><span class="font-semibold">完成处理时间:</span> ${new Date(batchInfo.finalizing_at * 1000).toLocaleString()}</p>` : ''}
                </div>

                <div class="mt-4">
                    <h4 class="font-semibold mb-2">请求统计:</h4>
                    <div class="bg-gray-50 p-3 rounded">
                        <p>总请求数: ${batchInfo.request_counts?.total || 0}</p>
                        <p>已完成: ${batchInfo.request_counts?.completed || 0}</p>
                        <p>失败数: ${batchInfo.request_counts?.failed || 0}</p>
                    </div>
                </div>

                ${batchInfo.error ? `
                    <div class="mt-4">
                        <h4 class="font-semibold text-red-600 mb-2">错误信息:</h4>
                        <pre class="bg-red-50 p-3 rounded text-red-700">${batchInfo.error}</pre>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    const drawer = showDrawer('批处理详情', content);
} 
import { TaskStatus, cancellableStatuses, deletableStatuses } from './constants.js';
import { marked } from './marked.esm.js';

export function renderTasks(tasks) {
    const taskList = document.getElementById('taskList');
    if (!taskList) {
        console.error('找不到taskList元素');
        return;
    }

    if (!Array.isArray(tasks)) {
        console.error('任务数据格式错误:', tasks);
        taskList.innerHTML = '<p class="text-red-500">加载任务列表失败</p>';
        return;
    }

    // 清空现有内容
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        taskList.innerHTML = '<p class="text-gray-500 text-center py-4">暂无任务</p>';
        return;
    }

    const taskElements = tasks.map(task => {
        // 确保 task 不为 null
        if (!task) return '';
        
        // 添加数据验证
        const content = task.content || '无内容';
        const status = task.status || 'UNKNOWN';
        const taskId = task.id || '';
        const batchId = task.batch_id || '';
        const result = task.result || '';
        
        return `
            <div class="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="text-sm text-gray-500">任务ID: ${taskId}</div>
                        <div class="mt-2 text-gray-600">
                            ${task.system_prompt ? `
                                <p class="mb-2">提示词: ${task.system_prompt.length > 100 ? 
                                    task.system_prompt.slice(0, 100) + '...' : 
                                    task.system_prompt}</p>
                            ` : ''}
                            <p>内容: ${content.length > 20 ? content.slice(0, 20) + '...' : content}</p>
                            ${batchId ? `<p class="text-sm text-gray-500 mt-1">批次ID: ${batchId}</p>` : ''}
                            ${result ? `
                                <p class="mt-2">结果: 
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                        可查看
                                    </span>
                                </p>
                            ` : ''}
                        </div>
                    </div>
                    <div class="ml-4">
                        <span class="px-2 py-1 text-sm rounded ${getStatusClass(status)}">${getStatusText(status)}</span>
                    </div>
                </div>
                ${renderTaskButtons(task)}
            </div>
        `;
    });

    // 将所有任务元素添加到列表中
    taskList.innerHTML = taskElements.join('');

    // 添加调试日志
    console.log(`已渲染 ${tasks.length} 个任务`);
}

export function getStatusClass(status) {
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


// 添加状态统计函数
function getBatchStatusStats(batches) {
    const stats = batches.reduce((acc, batch) => {
        acc[batch.status] = (acc[batch.status] || 0) + 1;
        return acc;
    }, {});

    const statusTextMap = {
        'completed': '已完成',
        'in_progress': '处理中',
        'failed': '失败',
        'cancelled': '已取消'
    };

    return Object.entries(stats)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusClass(status)} bg-opacity-10">
                ${statusTextMap[status] || status}: ${count}
            </span>
        `).join(' ');
}

// 将批处理渲染逻辑抽取为独立函数
function renderBatchItem(batch) {
    const formatTimestamp = (timestamp) => {
        return timestamp ? new Date(timestamp * 1000).toLocaleString() : '无';
    };

    const getProgressBar = (counts) => {
        const total = counts.total;
        const completed = counts.completed;
        const failed = counts.failed;
        const completedPercent = (completed / total * 100).toFixed(1);
        const failedPercent = (failed / total * 100).toFixed(1);

        return `
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div class="bg-green-600 h-2.5 rounded-full" style="width: ${completedPercent}%"></div>
            </div>
            <div class="text-sm">
                <span class="text-green-600">完成: ${completed}(${completedPercent}%)</span>
                ${failed > 0 ? `<span class="text-red-600 ml-2">失败: ${failed}(${failedPercent}%)</span>` : ''}
                <span class="text-gray-600 ml-2">总数: ${total}</span>
            </div>
        `;
    };

    return `
        <div class="bg-white p-4 rounded-lg shadow mb-4">
            <div class="flex flex-col gap-3">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-lg">批处理任务 ID: ${batch.id}</h3>
                        <p class="text-sm ${getStatusClass(batch.status)}">状态: ${batch.status}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="viewBatchDetails('${batch.id}')" class="btn btn-blue px-4 py-2">查看详情</button>
                        <button onclick="deleteBatch('${batch.id}')" class="btn btn-red px-4 py-2">删除</button>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p class="text-gray-600">创建时间: ${formatTimestamp(batch.created_at)}</p>
                        <p class="text-gray-600">开始处理: ${formatTimestamp(batch.in_progress_at)}</p>
                        <p class="text-gray-600">完成时间: ${formatTimestamp(batch.completed_at)}</p>
                        ${batch.failed_at ? `<p class="text-red-600">失败时间: ${formatTimestamp(batch.failed_at)}</p>` : ''}
                    </div>
                    <div>
                        <p class="text-gray-600">输入文件: ${batch.input_file_id || '无'}</p>
                        <p class="text-gray-600">输出文件: ${batch.output_file_id || '无'}</p>
                        <p class="text-gray-600">错误文件: ${batch.error_file_id || '无'}</p>
                        <p class="text-gray-600">处理窗口: ${batch.completion_window}</p>
                    </div>
                </div>

                ${batch.request_counts ? `
                    <div class="mt-2">
                        <p class="font-semibold mb-1">处理进度:</p>
                        ${getProgressBar(batch.request_counts)}
                    </div>
                ` : ''}

                ${batch.errors ? `
                    <div class="mt-2 text-red-600">
                        <p class="font-semibold">错误信息:</p>
                        <p>${batch.errors}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// 修改渲染筛选后的批处理列表函数
function renderFilteredBatches(filteredBatches) {
    const batchesContainer = document.getElementById('batchesContent');
    
    // 保存筛选区域的HTML
    const filterArea = batchesContainer.querySelector('div:first-child').outerHTML;
    
    if (filteredBatches.length === 0) {
        batchesContainer.innerHTML = filterArea + '<p class="text-gray-500 text-center py-4">没有符合条件的批处理任务</p>';
        return;
    }

    const batchesList = filteredBatches.map(renderBatchItem).join('');
    batchesContainer.innerHTML = filterArea + batchesList;
}

// 修改原始的渲染批处理列表函数
export function renderBatches(batchesResponse) {
    const batches = batchesResponse?.data || [];
    const batchesContainer = document.getElementById('batchesContent');
    
    // 添加筛选和统计区域
    const filterAndStats = `
        <div class="mb-6 space-y-4">
            <div class="flex flex-wrap gap-4 items-center">
                <div class="flex items-center gap-2">
                    <label class="text-sm text-gray-600">时间范围：</label>
                    <input type="date" id="startDate" class="border rounded px-2 py-1 text-sm">
                    <span class="text-gray-500">至</span>
                    <input type="date" id="endDate" class="border rounded px-2 py-1 text-sm">
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-sm text-gray-600">状态：</label>
                    <select id="statusFilter" class="border rounded px-2 py-1 text-sm">
                        <option value="">全部</option>
                        <option value="completed">已完成</option>
                        <option value="in_progress">处理中</option>
                        <option value="failed">失败</option>
                        <option value="cancelled">已取消</option>
                    </select>
                </div>
                <button id="applyFilter" class="bg-blue-500 text-white px-4 py-1 rounded text-sm hover:bg-blue-600">
                    应用筛选
                </button>
            </div>
            
            <div class="flex items-center gap-4">
                <span class="text-sm text-gray-600">状态统计：</span>
                <div class="flex flex-wrap gap-2">
                    ${getBatchStatusStats(batches)}
                </div>
            </div>
        </div>
    `;

    if (!batches || batches.length === 0) {
        batchesContainer.innerHTML = filterAndStats + '<p class="text-gray-500 text-center py-4">暂无批处理任务</p>';
        return;
    }

    const batchesList = batches.map(renderBatchItem).join('');
    batchesContainer.innerHTML = filterAndStats + batchesList;

    // 添加筛选功能
    setupFilterHandlers(batches);
}


// 添加筛选处理函数
function setupFilterHandlers(originalBatches) {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const statusFilter = document.getElementById('statusFilter');
    const applyFilter = document.getElementById('applyFilter');

    // 设置默认日期范围（最近30天）
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    startDate.value = thirtyDaysAgo.toISOString().split('T')[0];
    endDate.value = today.toISOString().split('T')[0];

    applyFilter.addEventListener('click', () => {
        // 添加调试日志
        console.log('原始数据:', originalBatches);
        
        const start = startDate.value ? new Date(startDate.value).getTime() / 1000 : null;
        const end = endDate.value ? new Date(endDate.value).getTime() / 1000 : null;
        const status = statusFilter.value;
        
        // 打印筛选条件
        console.log('筛选条件:', {
            start,
            end,
            status,
            startDate: startDate.value,
            endDate: endDate.value
        });

        const filteredBatches = originalBatches.filter(batch => {
            // 时间筛选：只有当开始和结束时间都设置了才进行筛选
            const timeMatch = (!start || !end) ? true : 
                (batch.created_at >= start && batch.created_at <= end);
            // 状态筛选：只有当选择了状态时才进行筛选
            const statusMatch = !status || batch.status === status;
            
            // 打印每个批次的筛选结果
            console.log('批次筛选结果:', {
                batchId: batch.id,
                created_at: batch.created_at,
                status: batch.status,
                timeMatch,
                statusMatch
            });
            
            return timeMatch && statusMatch;
        });

        // 打印筛选后的结果
        console.log('筛选后的数据:', filteredBatches);

        renderFilteredBatches(filteredBatches);
    });
}

// 修改渲染文件列表的函数
export function renderFiles(filesResponse) {
    const files = filesResponse?.data || [];
    const filesContainer = document.getElementById('filesContent');
    
    if (!files || files.length === 0) {
        filesContainer.innerHTML = '<p class="text-gray-500 text-center py-4">暂无文件</p>';
        return;
    }

    // const getStatusClass = (status) => {
    //     switch(status) {
    //         case 'processed': return 'text-green-600';
    //         case 'processing': return 'text-yellow-600';
    //         case 'failed': return 'text-red-600';
    //         default: return 'text-gray-600';
    //     }
    // };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const filesList = files.map(file => `
        <div class="bg-white p-4 rounded-lg shadow mb-4">
            <div class="flex justify-between items-start">
                <div class="flex-grow">
                    <h3 class="font-bold text-lg mb-2">${file.filename}</h3>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-gray-600">文件ID: <span class="font-mono">${file.id}</span></p>
                            <p class="text-gray-600">大小: ${formatFileSize(file.bytes)}</p>
                            <p class="text-gray-600">用途: ${file.purpose}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">创建时间: ${new Date(file.created_at * 1000).toLocaleString()}</p>
                            <p class="${getStatusClass(file.status)}">状态: ${file.status}</p>
                            ${file.status_details ? `<p class="text-gray-600">详情: ${file.status_details}</p>` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <button onclick="downloadFile('${file.id}')" class="btn btn-blue px-4 py-2">下载</button>
                    <button onclick="deleteFile('${file.id}')" class="btn btn-red px-4 py-2">删除</button>
                </div>
            </div>
        </div>
    `).join('');

    filesContainer.innerHTML = filesList;
}

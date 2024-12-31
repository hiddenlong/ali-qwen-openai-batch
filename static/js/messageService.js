export function showMessage(message, type = 'success') {
    const container = document.getElementById('messageContainer');
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    const messageElement = document.createElement('div');
    messageElement.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between transform transition-all duration-300 translate-x-full`;
    
    messageElement.innerHTML = `
        <div class="flex items-center">
            ${getIcon(type)}
            <span class="ml-2">${message}</span>
        </div>
        <button class="ml-4 hover:text-gray-200 focus:outline-none" onclick="this.parentElement.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;
    
    container.appendChild(messageElement);
    
    // 触发动画
    requestAnimationFrame(() => {
        messageElement.classList.remove('translate-x-full');
    });
    
    // 3秒后自动消失
    setTimeout(() => {
        messageElement.classList.add('translate-x-full');
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    }, 3000);
}

function getIcon(type) {
    const icons = {
        success: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        `,
        error: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        `,
        info: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        `,
        warning: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
        `
    };
    return icons[type] || icons.info;
} 
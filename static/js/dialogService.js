export function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const dialog = document.createElement('div');
        dialog.className = 'bg-white rounded-lg p-6 max-w-sm w-full mx-4 transform transition-all';
        
        dialog.innerHTML = `
            <div class="text-lg font-semibold mb-4">${message}</div>
            <div class="flex justify-end space-x-4">
                <button class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors" id="cancelBtn">
                    取消
                </button>
                <button class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors" id="confirmBtn">
                    确认
                </button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // 添加动画效果
        requestAnimationFrame(() => {
            dialog.classList.add('scale-100');
            dialog.classList.remove('scale-95');
        });
        
        function closeDialog() {
            dialog.classList.add('scale-95');
            dialog.classList.remove('scale-100');
            dialogOverlay.classList.add('opacity-0');
            setTimeout(() => {
                dialogOverlay.remove();
            }, 200);
        }
        
        dialog.querySelector('#confirmBtn').addEventListener('click', () => {
            closeDialog();
            resolve(true);
        });
        
        dialog.querySelector('#cancelBtn').addEventListener('click', () => {
            closeDialog();
            resolve(false);
        });
        
        // 点击遮罩层关闭
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                closeDialog();
                resolve(false);
            }
        });
    });
} 
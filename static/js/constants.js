// 任务状态枚举
export const TaskStatus = {
    VALIDATING: 'validating',
    FAILED: 'failed',
    IN_PROGRESS: 'in_progress',
    FINALIZING: 'finalizing',
    COMPLETED: 'completed',
    EXPIRING: 'expiring',
    EXPIRED: 'expired',
    CANCELLING: 'cancelling',
    CANCELLED: 'cancelled'
};

export const cancellableStatuses = [
    TaskStatus.VALIDATING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.FINALIZING
];

export const deletableStatuses = [
    TaskStatus.COMPLETED,
    TaskStatus.EXPIRED,
    TaskStatus.CANCELLING,
    TaskStatus.CANCELLED
]; 
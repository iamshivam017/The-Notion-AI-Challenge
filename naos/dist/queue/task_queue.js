"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueTask = enqueueTask;
exports.dequeueTask = dequeueTask;
exports.peekQueue = peekQueue;
exports.clearTaskQueue = clearTaskQueue;
exports.taskQueueLength = taskQueueLength;
const PRIORITY_WEIGHTS = {
    critical: 1000,
    high: 100,
    medium: 10,
    low: 1,
};
const queue = [];
function enqueueTask(task) {
    const weight = PRIORITY_WEIGHTS[task.priority] + task.estimatedImpact;
    queue.push({ task, weight, enqueuedAt: Date.now() });
    // Keep sorted descending by weight, then by enqueue time ascending (FIFO within same weight)
    queue.sort((a, b) => b.weight !== a.weight ? b.weight - a.weight : a.enqueuedAt - b.enqueuedAt);
}
function dequeueTask() {
    const item = queue.shift();
    return item?.task ?? null;
}
function peekQueue() {
    return queue.map(i => i.task);
}
function clearTaskQueue() {
    queue.length = 0;
}
function taskQueueLength() {
    return queue.length;
}
//# sourceMappingURL=task_queue.js.map
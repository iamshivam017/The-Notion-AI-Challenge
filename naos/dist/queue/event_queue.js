"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueue = enqueue;
exports.dequeue = dequeue;
exports.queueLength = queueLength;
exports.drainQueue = drainQueue;
exports.closeRedis = closeRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const QUEUE_KEY = 'naos:events';
let _redis = null;
function redis() {
    if (!_redis) {
        _redis = new ioredis_1.default((0, config_1.getConfig)().REDIS_URL, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
        });
        _redis.on('error', err => console.error('[Redis] Error:', err));
    }
    return _redis;
}
async function enqueue(event) {
    const full = {
        ...event,
        id: crypto.randomUUID(),
        enqueuedAt: new Date().toISOString(),
    };
    await redis().rpush(QUEUE_KEY, JSON.stringify(full));
}
async function dequeue() {
    const raw = await redis().lpop(QUEUE_KEY);
    if (!raw)
        return null;
    return JSON.parse(raw);
}
async function queueLength() {
    return redis().llen(QUEUE_KEY);
}
async function drainQueue() {
    const events = [];
    let event;
    while ((event = await dequeue()) !== null) {
        events.push(event);
    }
    return events;
}
async function closeRedis() {
    if (_redis) {
        await _redis.quit();
        _redis = null;
    }
}
//# sourceMappingURL=event_queue.js.map
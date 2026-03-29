"use strict";
/**
 * Episodic memory — stores events from the current run in-process.
 * Cleared between runs. Used so agents can avoid duplicate actions within a run.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.remember = remember;
exports.recall = recall;
exports.hasActedOn = hasActedOn;
exports.clearEpisodicMemory = clearEpisodicMemory;
exports.episodicSummary = episodicSummary;
const events = [];
function remember(type, entityId, detail) {
    events.push({ timestamp: new Date().toISOString(), type, entityId, detail });
}
function recall(type, entityId) {
    return events.filter(e => (!type || e.type === type) &&
        (!entityId || e.entityId === entityId));
}
function hasActedOn(entityId, type) {
    return recall(type, entityId).length > 0;
}
function clearEpisodicMemory() {
    events.length = 0;
}
function episodicSummary() {
    if (events.length === 0)
        return 'No events this run.';
    return events
        .map(e => `[${e.type}] ${e.entityId}: ${e.detail}`)
        .join('\n');
}
//# sourceMappingURL=episodic.js.map
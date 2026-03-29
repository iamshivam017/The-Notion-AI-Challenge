"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticSet = semanticSet;
exports.semanticGet = semanticGet;
exports.semanticGetAll = semanticGetAll;
exports.semanticDelete = semanticDelete;
const fs_1 = require("fs");
const path_1 = require("path");
const MEMORY_PATH = (0, path_1.join)(process.cwd(), 'naos-memory.json');
function load() {
    if (!(0, fs_1.existsSync)(MEMORY_PATH))
        return new Map();
    try {
        const raw = JSON.parse((0, fs_1.readFileSync)(MEMORY_PATH, 'utf-8'));
        return new Map(raw.map(m => [m.key, m]));
    }
    catch {
        return new Map();
    }
}
function save(map) {
    (0, fs_1.writeFileSync)(MEMORY_PATH, JSON.stringify([...map.values()], null, 2));
}
function semanticSet(key, value) {
    const map = load();
    const existing = map.get(key);
    map.set(key, {
        key,
        value,
        updatedAt: new Date().toISOString(),
        accessCount: (existing?.accessCount ?? 0) + 1,
    });
    save(map);
}
function semanticGet(key) {
    const map = load();
    const entry = map.get(key);
    if (!entry)
        return undefined;
    // Bump access count
    entry.accessCount++;
    map.set(key, entry);
    save(map);
    return entry.value;
}
function semanticGetAll() {
    return [...load().values()];
}
function semanticDelete(key) {
    const map = load();
    map.delete(key);
    save(map);
}
//# sourceMappingURL=semantic.js.map
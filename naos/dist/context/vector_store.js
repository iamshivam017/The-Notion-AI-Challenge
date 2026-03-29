"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsert = upsert;
exports.similaritySearch = similaritySearch;
exports.clearStore = clearStore;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const store = [];
const client = new sdk_1.default();
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-9);
}
async function embed(text) {
    // Anthropic doesn't yet expose a public embeddings endpoint in the SDK;
    // this uses OpenAI-compatible shape as a placeholder.
    // Swap for your preferred embedding provider (OpenAI, Cohere, local model).
    console.warn('[VectorStore] Embeddings not yet available via Anthropic SDK — returning zero vector');
    return new Array(1536).fill(0);
}
async function upsert(id, text, metadata) {
    const embedding = await embed(text);
    const existing = store.findIndex(e => e.id === id);
    const entry = { id, text, metadata, embedding };
    if (existing >= 0) {
        store[existing] = entry;
    }
    else {
        store.push(entry);
    }
}
async function similaritySearch(query, topK = 5) {
    const queryEmbedding = await embed(query);
    return store
        .map(entry => ({ ...entry, score: cosineSimilarity(queryEmbedding, entry.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(({ id, text, metadata, score }) => ({ id, text, metadata, score }));
}
function clearStore() {
    store.length = 0;
}
//# sourceMappingURL=vector_store.js.map
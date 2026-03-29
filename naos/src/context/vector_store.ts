import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../config';

// ---------------------------------------------------------------------------
// Lightweight in-process vector store using Anthropic embeddings.
// For production, replace the storage backend with Pinecone / pgvector / Chroma.
// ---------------------------------------------------------------------------

interface VectorEntry {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

const store: VectorEntry[] = [];
const client = new Anthropic();

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-9);
}

async function embed(text: string): Promise<number[]> {
  // Anthropic doesn't yet expose a public embeddings endpoint in the SDK;
  // this uses OpenAI-compatible shape as a placeholder.
  // Swap for your preferred embedding provider (OpenAI, Cohere, local model).
  console.warn('[VectorStore] Embeddings not yet available via Anthropic SDK — returning zero vector');
  return new Array(1536).fill(0);
}

export async function upsert(
  id: string,
  text: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const embedding = await embed(text);
  const existing = store.findIndex(e => e.id === id);
  const entry: VectorEntry = { id, text, metadata, embedding };
  if (existing >= 0) {
    store[existing] = entry;
  } else {
    store.push(entry);
  }
}

export async function similaritySearch(
  query: string,
  topK = 5,
): Promise<Array<{ id: string; text: string; metadata: Record<string, unknown>; score: number }>> {
  const queryEmbedding = await embed(query);
  return store
    .map(entry => ({ ...entry, score: cosineSimilarity(queryEmbedding, entry.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ id, text, metadata, score }) => ({ id, text, metadata, score }));
}

export function clearStore(): void {
  store.length = 0;
}

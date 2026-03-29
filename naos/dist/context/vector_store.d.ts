export declare function upsert(id: string, text: string, metadata: Record<string, unknown>): Promise<void>;
export declare function similaritySearch(query: string, topK?: number): Promise<Array<{
    id: string;
    text: string;
    metadata: Record<string, unknown>;
    score: number;
}>>;
export declare function clearStore(): void;
//# sourceMappingURL=vector_store.d.ts.map
export interface SemanticMemory {
    key: string;
    value: unknown;
    updatedAt: string;
    accessCount: number;
}
export declare function semanticSet(key: string, value: unknown): void;
export declare function semanticGet<T = unknown>(key: string): T | undefined;
export declare function semanticGetAll(): SemanticMemory[];
export declare function semanticDelete(key: string): void;
//# sourceMappingURL=semantic.d.ts.map
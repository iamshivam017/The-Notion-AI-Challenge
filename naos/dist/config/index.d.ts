import { z } from 'zod';
declare const ConfigSchema: any;
export type Config = z.infer<typeof ConfigSchema>;
export declare function getConfig(): Config;
export declare function _resetConfig(): void;
export {};
//# sourceMappingURL=index.d.ts.map
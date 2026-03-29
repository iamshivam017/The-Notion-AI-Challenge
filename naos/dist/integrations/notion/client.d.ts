import type { DatabaseObjectResponse, PageObjectResponse, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
export declare function notionQueryDatabase(databaseId: string, filter?: QueryDatabaseParameters['filter'], sorts?: QueryDatabaseParameters['sorts']): Promise<PageObjectResponse[]>;
export declare function notionGetDatabase(databaseId: string): Promise<DatabaseObjectResponse>;
export declare function notionCreatePage(databaseId: string, properties: Record<string, unknown>, children?: object[]): Promise<PageObjectResponse>;
export declare function notionUpdatePage(pageId: string, properties: Record<string, unknown>): Promise<PageObjectResponse>;
export declare function notionArchivePage(pageId: string): Promise<PageObjectResponse>;
//# sourceMappingURL=client.d.ts.map
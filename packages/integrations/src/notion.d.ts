interface NotionConfig {
    token: string;
    parentPageId: string;
}
export declare class NotionClientWrapper {
    private client;
    private parentPageId;
    constructor(config: NotionConfig);
    createStandupPage(dateStr: string, weekday: string, memberResponses: Array<{
        displayName: string;
        answers: any;
        status: string;
    }>): Promise<string>;
    private createMemberBlocks;
    private createTodoBlock;
    getPageUrl(pageId: string): string;
}
export declare function createNotionClient(): NotionClientWrapper | null;
export declare function publishNotionReport(run: any): Promise<string | null>;
export {};
//# sourceMappingURL=notion.d.ts.map
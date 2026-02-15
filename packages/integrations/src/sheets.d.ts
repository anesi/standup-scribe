interface SheetsConfig {
    spreadsheetId: string;
    serviceAccountJson: string;
}
export declare class SheetsClient {
    private sheets;
    private spreadsheetId;
    constructor(config: SheetsConfig);
    createOrUpdateTab(tabName: string, headers: string[], rows: string[][]): Promise<void>;
    getTabUrl(tabName: string): Promise<string>;
}
export declare function createSheetsClient(): SheetsClient | null;
export declare function publishSheetsReport(run: any): Promise<string | null>;
export {};
//# sourceMappingURL=sheets.d.ts.map
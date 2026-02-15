"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsClient = void 0;
exports.createSheetsClient = createSheetsClient;
exports.publishSheetsReport = publishSheetsReport;
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const error_handling_1 = require("@standup-scribe/core/dist/src/utils/error-handling");
const luxon_1 = require("luxon");
class SheetsClient {
    sheets;
    spreadsheetId;
    constructor(config) {
        this.spreadsheetId = config.spreadsheetId;
        const credentials = JSON.parse(config.serviceAccountJson);
        const auth = new google_auth_library_1.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.sheets = googleapis_1.google.sheets({ version: 'v4', auth: auth });
    }
    async createOrUpdateTab(tabName, headers, rows) {
        try {
            // Check if tab exists
            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });
            const existingSheet = spreadsheet.data.sheets?.find((sheet) => sheet.properties.title === tabName);
            if (existingSheet) {
                // Clear existing tab
                await this.sheets.spreadsheets.values.clear({
                    spreadsheetId: this.spreadsheetId,
                    range: `${tabName}!A1:Z`,
                });
            }
            else {
                // Create new tab
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: tabName,
                                    },
                                },
                            },
                        ],
                    },
                });
            }
            // Write data
            const values = [headers, ...rows];
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${tabName}!A1`,
                valueInputOption: 'RAW',
                resource: { values },
            });
        }
        catch (error) {
            throw new error_handling_1.DeliveryError(`Failed to write to Google Sheets: ${error instanceof Error ? error.message : String(error)}`, 'SHEETS');
        }
    }
    async getTabUrl(tabName) {
        // Encode tab name for URL (replace spaces with %20, etc.)
        const encodedTabName = encodeURIComponent(tabName);
        return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit#gid=0&range=${encodedTabName}!A1`;
    }
}
exports.SheetsClient = SheetsClient;
function createSheetsClient() {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!spreadsheetId || !serviceAccountJson) {
        console.warn('Google Sheets credentials not configured');
        return null;
    }
    return new SheetsClient({ spreadsheetId, serviceAccountJson });
}
async function publishSheetsReport(run) {
    const client = createSheetsClient();
    if (!client) {
        throw new Error('Google Sheets not configured');
    }
    const responses = run.responses || [];
    const runDate = luxon_1.DateTime.fromJSDate(run.runDate);
    const tabName = runDate.toFormat('yyyy-MM-dd');
    // Headers
    const headers = [
        'Person',
        'What working on',
        'Appetite',
        'Start date',
        'Scheduled done',
        'Actual done',
        'Progress',
        'Expectations',
        'At risk',
        'Decisions',
        'Going well',
        'Going poorly',
        'Notes',
        'Status',
    ];
    // Build rows
    const rows = responses.map((response) => {
        const answers = response.answers || {};
        const member = response.rosterMember;
        const formatList = (val) => {
            if (Array.isArray(val)) {
                return val.filter((v) => v && v !== 'Nil').join('\n');
            }
            return val || '';
        };
        const formatDate = (val) => {
            if (typeof val === 'object' && val !== null) {
                return val.raw || '';
            }
            return val || '';
        };
        return [
            member.displayName,
            formatList(answers.what_working_on),
            answers.appetite || '',
            formatDate(answers.start_date),
            formatDate(answers.scheduled_done_date),
            formatDate(answers.actual_done_date),
            formatList(answers.progress_today),
            answers.expectations || '',
            formatList(answers.at_risk),
            formatList(answers.decisions),
            formatList(answers.going_well),
            formatList(answers.going_poorly),
            answers.notes || '',
            response.status,
        ];
    });
    await client.createOrUpdateTab(tabName, headers, rows);
    return await client.getTabUrl(tabName);
}
//# sourceMappingURL=sheets.js.map
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { DeliveryError } from '../utils/error-handling';

interface SheetsConfig {
  spreadsheetId: string;
  serviceAccountJson: string;
}

export class SheetsClient {
  private sheets: any;
  private spreadsheetId: string;

  constructor(config: SheetsConfig) {
    this.spreadsheetId = config.spreadsheetId;

    const credentials = JSON.parse(config.serviceAccountJson);
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: auth as any });
  }

  async createOrUpdateTab(
    tabName: string,
    headers: string[],
    rows: string[][],
  ): Promise<void> {
    try {
      // Check if tab exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const existingSheet = spreadsheet.data.sheets?.find(
        (sheet: any) => sheet.properties.title === tabName,
      );

      if (existingSheet) {
        // Clear existing tab
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: `${tabName}!A1:Z`,
        });
      } else {
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
    } catch (error) {
      throw new DeliveryError(
        `Failed to write to Google Sheets: ${error instanceof Error ? error.message : String(error)}`,
        'SHEETS',
      );
    }
  }

  async getTabUrl(tabName: string): Promise<string> {
    // Encode tab name for URL (replace spaces with %20, etc.)
    const encodedTabName = encodeURIComponent(tabName);
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit#gid=0&range=${encodedTabName}!A1`;
  }
}

export function createSheetsClient(): SheetsClient | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!spreadsheetId || !serviceAccountJson) {
    console.warn('Google Sheets credentials not configured');
    return null;
  }

  return new SheetsClient({ spreadsheetId, serviceAccountJson });
}

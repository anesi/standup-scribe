import { Client as NotionClient } from '@notionhq/client';
import { DeliveryError } from '@standup-scribe/core/dist/src/utils/error-handling';
import { DateTime } from 'luxon';

interface NotionConfig {
  token: string;
  parentPageId: string;
}

export class NotionClientWrapper {
  private client: NotionClient;
  private parentPageId: string;

  constructor(config: NotionConfig) {
    this.client = new NotionClient({
      auth: config.token,
    });
    this.parentPageId = config.parentPageId;
  }

  async createStandupPage(
    dateStr: string,
    weekday: string,
    memberResponses: Array<{
      displayName: string;
      answers: any;
      status: string;
    }>,
  ): Promise<string> {
    try {
      // Create the page
      const page = await this.client.pages.create({
        parent: { page_id: this.parentPageId },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: `${weekday} (${dateStr})`,
                },
              },
            ],
          },
        },
      });

      const pageId = page.id;
      const children: any[] = [];

      // Add reporting format header
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: 'Reporting Format:',
              },
            },
          ],
        },
      });

      // Add sample toggle
      children.push({
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: 'Sample (Click to expand format example)',
              },
            },
          ],
          children: [
            this.createTodoBlock('Task or deliverable name', true),
            this.createTodoBlock('Another task', false),
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: 'Free text field content goes here',
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      // Add each member's response as a toggle
      for (const response of memberResponses) {
        const memberChildren = this.createMemberBlocks(response.answers, response.status);

        children.push({
          object: 'block',
          type: 'toggle',
          toggle: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `@${response.displayName}`,
                },
              },
            ],
            children: memberChildren,
          },
        });
      }

      // Batch add blocks (Notion allows max 100 children per request)
      const batchSize = 100;
      for (let i = 0; i < children.length; i += batchSize) {
        const batch = children.slice(i, i + batchSize);
        await this.client.blocks.children.append({
          block_id: pageId,
          children: batch,
        });
      }

      return pageId;
    } catch (error) {
      throw new DeliveryError(
        `Failed to create Notion page: ${error instanceof Error ? error.message : String(error)}`,
        'NOTION',
      );
    }
  }

  private createMemberBlocks(answers: any, status: string): any[] {
    const blocks: any[] = [];

    // Helper to add section
    const addSection = (title: string, value: any) => {
      if (!value) return;

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `**${title}:**`,
              },
            },
          ],
        },
      });

      if (Array.isArray(value)) {
        value.forEach((item: string) => {
          if (item && item.trim()) {
            blocks.push(this.createTodoBlock(item, false));
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Date object with raw/iso
        const display = value.raw || (value.iso ? new Date(value.iso).toLocaleDateString() : '');
        if (display) {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: display },
                },
              ],
            },
          });
        }
      } else if (typeof value === 'string' && value.trim()) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: value },
              },
            ],
          },
        });
      }
    };

    addSection('What are you working on?', answers.what_working_on);
    addSection("Appetite", answers.appetite);
    addSection('Start date', answers.start_date);
    addSection('Scheduled completion', answers.scheduled_done_date);
    addSection('Actual completion', answers.actual_done_date);
    addSection('Progress today', answers.progress_today);
    addSection('Expectations', answers.expectations);
    addSection('At risk', answers.at_risk);
    addSection('Decisions needed', answers.decisions);
    addSection('Going well', answers.going_well);
    addSection('Going poorly', answers.going_poorly);
    addSection('Notes', answers.notes);

    // Add status if not submitted
    if (status !== 'SUBMITTED') {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `**Status:** ${status}`,
              },
            },
          ],
        },
      });
    }

    return blocks;
  }

  private createTodoBlock(text: string, checked: boolean): any {
    return {
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: [
          {
            type: 'text',
            text: { content: text },
          },
        ],
        checked: checked,
      },
    };
  }

  getPageUrl(pageId: string): string {
    return `https://notion.so/${pageId.replace(/-/g, '')}`;
  }
}

export function createNotionClient(): NotionClientWrapper | null {
  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  if (!token || !parentPageId) {
    console.warn('Notion credentials not configured');
    return null;
  }

  return new NotionClientWrapper({ token, parentPageId });
}

export async function publishNotionReport(run: any): Promise<string | null> {
  const client = createNotionClient();
  if (!client) {
    throw new Error('Notion not configured');
  }

  const responses = run.responses || [];
  const runDate = DateTime.fromJSDate(run.runDate);
  const dateStr = runDate.toISODate()!;
  const weekday = runDate.toFormat('cccc');

  // Prepare member responses
  const memberResponses = responses.map((response: any) => ({
    displayName: response.rosterMember.displayName,
    answers: response.answers || {},
    status: response.status,
  }));

  const pageId = await client.createStandupPage(dateStr, weekday, memberResponses);

  return client.getPageUrl(pageId);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionClientWrapper = void 0;
exports.createNotionClient = createNotionClient;
exports.publishNotionReport = publishNotionReport;
const client_1 = require("@notionhq/client");
const error_handling_1 = require("@standup-scribe/core/dist/src/utils/error-handling");
const luxon_1 = require("luxon");
class NotionClientWrapper {
    client;
    parentPageId;
    constructor(config) {
        this.client = new client_1.Client({
            auth: config.token,
        });
        this.parentPageId = config.parentPageId;
    }
    async createStandupPage(dateStr, weekday, memberResponses) {
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
            const children = [];
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
        }
        catch (error) {
            throw new error_handling_1.DeliveryError(`Failed to create Notion page: ${error instanceof Error ? error.message : String(error)}`, 'NOTION');
        }
    }
    createMemberBlocks(answers, status) {
        const blocks = [];
        // Helper to add section
        const addSection = (title, value) => {
            if (!value)
                return;
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
                value.forEach((item) => {
                    if (item && item.trim()) {
                        blocks.push(this.createTodoBlock(item, false));
                    }
                });
            }
            else if (typeof value === 'object' && value !== null) {
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
            }
            else if (typeof value === 'string' && value.trim()) {
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
    createTodoBlock(text, checked) {
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
    getPageUrl(pageId) {
        return `https://notion.so/${pageId.replace(/-/g, '')}`;
    }
}
exports.NotionClientWrapper = NotionClientWrapper;
function createNotionClient() {
    const token = process.env.NOTION_TOKEN;
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
    if (!token || !parentPageId) {
        console.warn('Notion credentials not configured');
        return null;
    }
    return new NotionClientWrapper({ token, parentPageId });
}
async function publishNotionReport(run) {
    const client = createNotionClient();
    if (!client) {
        throw new Error('Notion not configured');
    }
    const responses = run.responses || [];
    const runDate = luxon_1.DateTime.fromJSDate(run.runDate);
    const dateStr = runDate.toISODate();
    const weekday = runDate.toFormat('cccc');
    // Prepare member responses
    const memberResponses = responses.map((response) => ({
        displayName: response.rosterMember.displayName,
        answers: response.answers || {},
        status: response.status,
    }));
    const pageId = await client.createStandupPage(dateStr, weekday, memberResponses);
    return client.getPageUrl(pageId);
}
//# sourceMappingURL=notion.js.map
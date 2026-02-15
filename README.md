# Discord Standup Bot

A Discord-first standup bot that DMs participants, collects structured updates, and publishes daily reports to Discord, Google Sheets, Notion, and CSV.

## Features

- **Automated DM Workflow**: DMs team members at scheduled time to collect standup responses
- **13-Step Guided Flow**: Structured questions covering work progress, risks, decisions, and more
- **Multiple Destinations**: Publishes reports to Discord, Google Sheets, Notion, and CSV
- **Excusal Management**: Handle team absences with date-range excusals
- **Delivery Reliability**: Automatic retries with exponential backoff for failed deliveries
- **Audit Trail**: Track all admin actions

## Tech Stack

- **Runtime**: Node.js LTS + TypeScript
- **Discord**: discord.js v14
- **Database**: PostgreSQL + Prisma ORM
- **Timezone**: Luxon
- **Google**: googleapis (Sheets API)
- **Notion**: @notionhq/client

## Prerequisites: External Resource Setup

### 1. Discord Bot Application Setup

1. Go to https://discord.com/developers/applications
2. Create new application
3. Under "Bot" section:
   - Create bot
   - Enable **MESSAGE CONTENT INTENT**
   - Enable **SERVER MEMBERS INTENT**
   - Copy bot token (for `DISCORD_TOKEN`)
4. Under "OAuth2" > "URL Generator":
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Manage Guild`, `Send Messages`, `Embed Links`, `Use Slash Commands`
   - Use generated URL to invite bot to server
5. **Copy Application ID**:
   - In Discord Developer Portal, go to your application's **General Information** page
   - Copy the Application ID shown at the top
6. **Copy Guild (Server) ID**:
   - In Discord, enable **Developer Mode** (User Settings > Advanced)
   - Right-click on your server name in the left sidebar
   - Select **Copy ID**

### 2. PostgreSQL Database Setup

1. Install PostgreSQL locally OR use cloud provider (Supabase, Railway, Neon)
2. Create database for the bot
3. Get connection string for `DATABASE_URL`

### 3. Google Sheets Setup

1. Go to Google Cloud Console (console.cloud.google.com)
2. Create project
3. Enable "Google Sheets API"
4. Create Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Create service account
   - Download JSON key (for `GOOGLE_SERVICE_ACCOUNT_JSON`)
5. Create spreadsheet in Google Sheets
6. Share spreadsheet with service account email (Editor permission)
7. Copy spreadsheet ID from URL (for `GOOGLE_SHEETS_SPREADSHEET_ID`)

### 4. Notion Setup

1. Go to https://www.notion.so/my-integrations
2. Create new integration ("Discord Standup Bot")
3. Copy "Internal Integration Token" (for `NOTION_TOKEN`)
4. Create parent page in Notion workspace
5. Share page with integration (click "..." > "Add connections")
6. Copy page ID from URL (for `NOTION_PARENT_PAGE_ID`)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. Set up environment variables:
   ```bash
   # Discord
   DISCORD_TOKEN=your_bot_token_here

   # Database
   DATABASE_URL=postgresql://user:password@host:5432/dbname

   # Notion (optional)
   NOTION_TOKEN=your_notion_token
   NOTION_PARENT_PAGE_ID=your_page_id

   # Google Sheets (optional)
   GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id
   GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

   # Environment
   ENVIRONMENT=staging  # or 'prod'
   ```

5. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

6. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Commands

### Setup

```
/standup setup
```
Configure workspace settings including:
- Management channel for reports
- Team role mention
- Timezone
- Window times (default 09:00-16:00)
- Reminder times
- Notion/Google Sheets integration

### Roster Management

```
/standup roster add @user
/standup roster remove @user
/standup roster list
```

### Excusal Management

```
/standup excuse add @user start:YYYY-MM-DD end:YYYY-MM-DD reason:text
/standup excuse remove @user date:YYYY-MM-DD
/standup excuse list [@user]
```

### Run Control

```
/standup run              # Manually open today's run
/standup close            # Close and publish reports
/standup status [date]    # Check delivery status
/standup resend [date] [destination]  # Retry failed delivery
/standup export from:YYYY-MM-DD to:YYYY-MM-DD  # Export to CSV
```

## Standup Flow

When a standup run opens, each active roster member receives a DM with a "Start Standup" button. The guided flow collects:

1. What are you working on? (multi-item)
2. What's the appetite? (free text)
3. When did it start? (date)
4. When scheduled to be done? (date)
5. When actually done? (date or free text)
6. Progress made today? (multi-item)
7. Expectations? (select: ABOVE/AT/BELOW/NIL)
8. What is at risk? (multi-item)
9. What decisions to be made? (multi-item)
10. What is going well? (multi-item)
11. What is going poorly? (multi-item)
12. Notes (free text)
13. Submit confirmation

## Schedule

The bot runs on a minute-by-minute schedule:

- **09:00** (weekday): Opens standup run, sends DMs to active roster members
- **Reminder times** (configurable): Sends reminders to non-submitters
- **16:00**: Closes run, publishes reports to all configured destinations

## Delivery Destinations

### Discord
Posts to the configured management channel with:
- Summary stats
- Risks section
- Decisions section
- Links to other destinations
- CSV attachment

### Google Sheets
Creates a new tab for each day with all responses.

### Notion
Creates a daily page with toggle format for each team member.

### CSV
Generates a CSV file in the `exports/` directory.

## Troubleshooting

### Commands not appearing
- Make sure you have "Manage Guild" permission
- Wait up to 1 hour for global commands to register, or set `TEST_GUILD_ID` in `.env` for instant guild commands

### DMs not being sent
- Users must have "Allow direct messages from server members" enabled in their privacy settings
- Check `/standup status` to see DM_FAILED errors

### Google Sheets/Notion failures
- Check `/standup status` for error details
- Use `/standup resend` to retry failed deliveries
- Verify service account/email has proper permissions

## License

MIT

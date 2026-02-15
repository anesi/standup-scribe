# Standup Scribe - Discord Standup Bot

A Discord bot that automates daily standup collection for teams. Members receive DMs, submit responses via modals, and reports are delivered to your management channel, Notion, or Google Sheets.

## Features

- **Automated DM Workflow**: DMs team members at scheduled time to collect standup responses
- **13-Step Guided Flow**: Structured questions covering work progress, risks, decisions, and more
- **DM Subscription Verification**: `/standup subscribe` command ensures users can receive DMs
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
- **Deployment**: Docker (CapRover compatible)

## Quick Start for Your Team

### 1. Create Your Discord Bot Application

**Important**: Your team should create their own Discord bot application:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → Give it a name (e.g., "Team Standup Bot")
3. Go to **"Bot"** section → Click **"Add Bot"**
4. Under **"Privileged Gateway Intents"**, enable:
   - ✅ Message Content Intent
   - ✅ Server Members Intent
5. Click **"Reset Token"** and copy your bot token

### 2. Invite Bot to Your Server

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Manage Channels (optional)
   - Read Messages/View Channels
4. Copy the generated URL and open it in your browser
5. Authorize the bot for your server

### 3. Get Your Server ID

1. In Discord, enable **Developer Mode** (User Settings → Advanced)
2. Right-click your server name
3. Select **Copy ID**

### 4. Set Up Database (Neon - Recommended)

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project (free tier available)
3. Copy your **Connection String**
4. Format: `postgresql://user:password@host/database?sslmode=require`

### 5. Set Up Google Sheets (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google Sheets API**
4. Go to **IAM & Admin** → **Service Accounts**
5. Create service account
6. Download JSON key file
7. Share your spreadsheet with the service account email (Editor permission)
8. Copy spreadsheet ID from URL

### 6. Deploy to CapRover

#### Prerequisites
- Access to your team's CapRover instance
- The bot code (fork this repository)

#### Deployment Steps

1. **Fork this repository** to your GitHub account

2. **Create a new app in CapRover**:
   - Log in to CapRover dashboard
   - Click **"Create New App"**
   - Name it (e.g., `standup-bot`)

3. **Configure deployment from GitHub**:
   - Go to **"App Config"** → **"Deployment Method"**
   - Select **"GitHub"**
   - Connect your GitHub account
   - Select your forked repository
   - Select branch (usually `main`)

4. **Configure environment variables** (see below)

5. **Deploy**:
   - Click **"Deploy Latest Commit"**
   - Wait for deployment to complete

### 7. Configure Environment Variables

In CapRover, go to your app → **"Config"** → **"Environment Variables"**:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | `MTQ3MjU...` | ✅ Yes |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://...` | ✅ Yes |
| `TEST_GUILD_ID` | Your server ID | `957861579788009523` | ✅ Yes |
| `ENVIRONMENT` | Environment name | `production` | ✅ Yes |
| `NOTION_TOKEN` | Notion integration token | `secret_...` | ❌ No |
| `NOTION_PARENT_PAGE_ID` | Notion page ID | `abc123...` | ❌ No |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Sheet ID | `16jqBSoN...` | ❌ No |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account JSON | `{"type":"..."}` | ❌ No |

**For `GOOGLE_SERVICE_ACCOUNT_JSON`**: Convert the JSON to a single line:
```bash
cat your-service-account.json | jq -c
```

### 8. Run Database Migrations

1. SSH into your CapRover container (or use CapRover's terminal)
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

### 9. Initial Setup in Discord

Once deployed, run this in your Discord server:

```
/standup setup
```

Configure:
- **Channel**: Where to post standup reports
- **Team Role**: Role to mention (e.g., `@team`)
- **Timezone**: Your team's timezone (e.g., `Africa/Lagos`)
- **Window**: Standup open hours (e.g., `09:00` - `16:00`)
- **Reminders**: When to remind non-responders (e.g., `10:00,12:00,14:00`)

### 10. Add Team Members

```
/roster add @username
/roster list
```

### 11. Verify DMs Work

Tell team members to run:

```
/standup subscribe
```

This tests if they can receive DMs and provides instructions if DMs are blocked.

## Usage

### For Team Members

- **Daily Standup**: You'll receive a DM when standup opens
- **Submit**: Click the "Start Standup" button and fill out the form
- **Reminders**: If you forget, you'll get reminders at configured times
- **Verify**: Run `/standup subscribe` to ensure DMs work

### For Admins

```
/standup setup           # Configure standup settings
/standup subscribe       # Test DM delivery
/roster add @user        # Add team member
/roster remove @user     # Remove team member
/roster list             # View all members
/excuse add @user        # Add excuse/OOO
/excuse remove @user     # Remove excuse
/standup run             # Manually trigger standup
/standup close           # Close and send reports
/standup status          # Check delivery status
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

## Deployment Details

### CapRover Configuration

The bot includes a `Dockerfile` optimized for CapRover:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Resource Limits (Recommended)

- **Memory**: 512MB - 1GB
- **CPU**: 0.5 - 1 core
- **Restart Policy**: Always

### Domain Configuration

1. Go to your app in CapRover
2. Click **"Domains"**
3. Enable **"Enable HTTPS"**
4. Optional: Set a custom domain

### Persistent Storage (Optional)

If you want persistent logs:

1. In CapRover, go to **"App Config"** → **"Persistent Directories"**
2. Add mapping: `/app/logs` → `logs`

## Troubleshooting

### Bot commands not appearing

1. Ensure `TEST_GUILD_ID` is set correctly in CapRover
2. Restart the app in CapRover
3. Commands should appear instantly with guild commands

### DMs not being delivered

1. Team member runs `/standup subscribe`
2. If failed, they need to:
   - Go to **Server Settings** → **Privacy Settings**
   - Enable **"Allow direct messages from server members"**
   - Run `/standup subscribe` again

### Database connection errors

1. Verify `DATABASE_URL` is correct
2. Check Neon console for database status
3. Ensure SSL is enabled (`sslmode=require`)

### Google Sheets errors

1. Verify spreadsheet is shared with service account email
2. Check that `GOOGLE_SERVICE_ACCOUNT_JSON` is valid JSON (single line)
3. Ensure spreadsheet ID is correct

## Development

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env`
4. Fill in your environment variables
5. Run database migrations: `npx prisma migrate dev`
6. Start development server: `npm run dev`

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
standup-scribe/
├── src/
│   ├── commands/        # Discord slash commands
│   ├── components/      # Standup flow components
│   ├── scheduler/       # Standup scheduler
│   ├── deliveries/      # Report delivery
│   ├── workers/         # Background workers
│   ├── clients/         # Discord client
│   └── lib/             # Utilities (Prisma, etc.)
├── prisma/              # Database schema
├── Dockerfile           # CapRover deployment
├── package.json
└── README.md
```

## License

MIT License - feel free to use and modify for your team!

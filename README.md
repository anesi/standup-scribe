# Standup Scribe

**Platform-agnostic standup bot supporting Discord and Slack**

Standup Scribe is a comprehensive standup automation bot that helps teams collect daily standup updates through structured DMs and publishes reports to multiple destinations (Discord, Slack, Notion, Google Sheets, CSV).

## 🚀 Features

- **Multi-Platform Support**: Works on both Discord and Slack with the same core logic
- **Automated Standups**: Scheduled daily standups with timezone support
- **Structured Responses**: 13-question flow covering all aspects of daily updates
- **Multiple Destinations**: Publish reports to Discord, Slack, Notion, Google Sheets, or CSV
- **User-Friendly**: Interactive modals/buttons with save/continue functionality
- **Excusal Management**: Easy user absence tracking
- **Roster Management**: Add/remove team members easily
- **Comprehensive Reports**: Detailed standup reports with submission tracking

## 📋 Table of Contents

- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Platform Support](#platform-support)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Standup Questions](#standup-questions)

## 🏗️ Architecture

Standup Scribe uses a **platform-adapter architecture** that separates platform-specific code from core business logic:

```
┌─────────────────────────────────────────────────────────────┐
│                     Standup Scribe                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Discord    │      │    Slack     │                    │
│  │   Adapter    │      │   Adapter    │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                              │
│         └──────────┬──────────┘                              │
│                    ▼                                         │
│         ┌──────────────────┐                                │
│         │  Platform Adapter│                                │
│         │    Interface     │                                │
│         └────────┬─────────┘                                │
│                  ▼                                          │
│         ┌──────────────────┐                                │
│         │  Core Services   │                                │
│         │                  │                                │
│         │  • Standup       │                                │
│         │  • Scheduler     │                                │
│         │  • Roster        │                                │
│         │  • Excusals      │                                │
│         └────────┬─────────┘                                │
│                  ▼                                          │
│         ┌──────────────────┐                                │
│         │   Database       │                                │
│         │   (Prisma)       │                                │
│         └──────────────────┘                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Platform Adapter Interface

The `PlatformAdapter` interface defines a contract that all platform adapters must implement:

```typescript
interface PlatformAdapter {
  readonly platformType: 'discord' | 'slack';
  initialize(token: string): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  fetchUser(userId: string): Promise<PlatformUser>;
  fetchWorkspace(workspaceId: string): Promise<PlatformWorkspace>;
  sendDirectMessage(userId: string, message: PlatformMessage): Promise<void>;
  sendChannelMessage(channelId: string, message: PlatformMessage): Promise<void>;
  replyToInteraction(interaction: PlatformInteraction, message: PlatformMessage): Promise<void>;
  showModal(interaction: PlatformInteraction, modal: PlatformModal): Promise<void>;
  registerCommands(commands: PlatformCommand[], workspaceId?: string): Promise<void>;
  onButton(handler: (interaction: PlatformInteraction) => void): void;
  onModal(handler: (interaction: PlatformInteraction) => void): void;
  // ... more methods
}
```

This allows the core business logic to remain platform-agnostic while each platform adapter handles platform-specific implementation details.

## 📦 Monorepo Structure

```
standup-scribe/
├── packages/
│   ├── core/                    # Platform-agnostic business logic
│   │   ├── src/
│   │   │   ├── services/        # State, date parsing
│   │   │   ├── workers/         # Delivery & cleanup workers
│   │   │   ├── utils/           # Constants, error handling
│   │   │   ├── types/           # Platform interfaces
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── platform-discord/        # Discord adapter
│   │   ├── src/
│   │   │   ├── client/          # Discord client wrapper
│   │   │   ├── commands/        # Discord slash commands
│   │   │   ├── components/      # Discord modals/buttons
│   │   │   ├── deliveries/      # Discord report delivery
│   │   │   ├── scheduler/       # Discord scheduler
│   │   │   └── discord-adapter.ts
│   │   └── package.json
│   │
│   ├── platform-slack/          # Slack adapter
│   │   ├── src/
│   │   │   ├── client/          # Slack WebClient wrapper
│   │   │   ├── commands/        # Slack slash commands
│   │   │   ├── components/      # Slack modals/blocks
│   │   │   ├── deliveries/      # Slack report delivery
│   │   │   └── slack-adapter.ts
│   │   └── package.json
│   │
│   ├── integrations/            # External integrations (shared)
│   │   ├── src/
│   │   │   ├── notion.ts
│   │   │   ├── sheets.ts
│   │   │   └── csv.ts
│   │   └── package.json
│   │
│   ├── database/                # Shared database layer
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── prisma.ts
│   │       └── workspace-helper.ts
│   │   └── package.json
│   │
│   ├── app-discord/             # Discord bot application
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   └── app-slack/               # Slack bot application
│       ├── src/index.ts
│       └── package.json
│
├── package.json                 # Root (workspaces)
└── pnpm-workspace.yaml
```

### Package Dependencies

```
app-discord ──┐
              ├──► platform-discord ──┐
app-slack ────┘                     │
               ┌────────────────────┘
               ▼
          ┌──────────┐
          │   core   │
          └────┬─────┘
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
   database   │   integrations
             ▼
      platform-discord
      platform-slack
```

## 🎯 Platform Support

### Discord

- **Slash Commands**: `/setup`, `/roster`, `/excuse`, `/run`, `/config`
- **Interactive Components**: Modals, buttons, embeds
- **DM Support**: Direct messages for standup flow
- **Permissions**: Role-based access control

### Slack (Coming Soon)

- **Slash Commands**: Same commands as Discord
- **Interactive Components**: Modals, blocks, buttons
- **DM Support**: Direct messages for standup flow
- **Permissions**: Workspace admin checks

## 📥 Installation

### Prerequisites

- Node.js 18+ and pnpm 8+
- PostgreSQL database
- Discord bot token (for Discord)
- Slack app credentials (for Slack)

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/standup-scribe.git
cd standup-scribe

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Build all packages
pnpm build
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

#### Discord Bot

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/standup_scribe"
DISCORD_TOKEN="your_discord_bot_token"

# Optional (for development)
TEST_GUILD_ID="your_test_guild_id"
ENVIRONMENT="development"
```

#### Slack Bot

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/standup_scribe"
SLACK_BOT_TOKEN="xoxb-your-token"
SLACK_SIGNING_SECRET="your_signing_secret"

# Optional
SLACK_PORT="3000"
ENVIRONMENT="development"
```

#### Integrations

```env
# Notion (optional)
NOTION_API_KEY="your_notion_api_key"

# Google Sheets (optional)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### Database Setup

```bash
# Create the database
createdb standup_scribe

# Run migrations
pnpm prisma:migrate

# (Optional) Open Prisma Studio to view data
pnpm prisma:studio
```

## 🛠️ Development

### Discord Bot

```bash
# Start in development mode
pnpm dev

# Build only Discord
pnpm build:discord

# Start production build
pnpm start
```

### Slack Bot

```bash
# Start in development mode
pnpm dev:slack

# Build only Slack
pnpm build:slack

# Start production build
pnpm start:slack
```

### Building All Packages

```bash
# Build everything
pnpm build

# Clean all build artifacts
pnpm clean
```

## 📊 Standup Questions

The bot asks users 13 structured questions:

1. **Date**: What date are you reporting for?
2. **Yesterday**: What did you accomplish yesterday?
3. **Today**: What do you plan to accomplish today?
4. **Blockers**: Are there any blockers or issues?
5. **Support Needed**: Do you need any support or resources?
6. **Learnings**: What did you learn yesterday?
7. **Wins**: What were your wins or achievements?
8. **Tomorrow's Plan**: Any specific goals for tomorrow?
9. **This Week**: Any goals for this week?
10. **Expectations**: What type of work are you focusing on?
11. **Collaboration**: Are you collaborating with anyone?
12. **Updates**: Any updates or announcements?
13. **Feedback**: Any feedback or suggestions?

## 🔑 Key Concepts

### Workspaces

A workspace represents a Discord guild or Slack workspace. Each workspace has:
- Unique configuration (timezone, hours, delivery destinations)
- Roster of active members
- Scheduled standup runs
- Audit trail

### Standup Runs

A standup run represents a day's standup:
- Created at the scheduled time
- Collects responses from all active roster members
- Can be manually triggered or closed
- Generates delivery jobs for configured destinations

### Roster Members

Users who participate in standups:
- Can be added/removed via commands
- Have excusal periods for absences
- Receive DM prompts during standup window

### Delivery Jobs

Jobs that export standup data to external systems:
- Discord channel posts
- Slack channel posts
- Notion database pages
- Google Sheets rows
- CSV file generation

## 🚀 Deployment

### Docker (Recommended)

```bash
# Build Discord image
docker build -f docker/Dockerfile.discord -t standup-scribe:discord .

# Build Slack image
docker build -f docker/Dockerfile.slack -t standup-scribe:slack .

# Run Discord
docker run -d \
  --name standup-discord \
  -e DATABASE_URL="..." \
  -e DISCORD_TOKEN="..." \
  standup-scribe:discord

# Run Slack
docker run -d \
  --name standup-slack \
  -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e SLACK_BOT_TOKEN="..." \
  -e SLACK_SIGNING_SECRET="..." \
  standup-scribe:slack
```

### Traditional Deployment

```bash
# Build
pnpm build

# Copy files to server
scp -r packages/ user@server:/path/to/app

# On server
cd /path/to/app/packages/app-discord
npm install --production
npm start
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📧 Support

For issues and questions, please use the GitHub issue tracker.

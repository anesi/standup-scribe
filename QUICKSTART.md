# Quick Start Guide - Standup Scribe Platform Refactoring

This guide will help you quickly understand and work with the refactored platform-agnostic architecture.

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│              Platform-Agnostic Core                  │
│  (Standup logic, scheduling, state management)       │
└──────────────┬───────────────────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐  ┌──────────────┐
│ Discord      │  │ Slack        │
│ Adapter      │  │ Adapter      │
└──────────────┘  └──────────────┘
```

## 📦 Package Structure

```
packages/
├── core/              # Platform-agnostic business logic
├── database/          # Database layer (Prisma)
├── integrations/      # External integrations
├── platform-discord/  # Discord implementation
├── platform-slack/    # Slack implementation
├── app-discord/       # Discord bot app
└── app-slack/         # Slack bot app
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Database

```bash
# Create database
createdb standup_scribe

# Run migrations
pnpm prisma:migrate

# Generate Prisma client
pnpm prisma:generate
```

### 3. Configure Environment

Create `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/standup_scribe"

# Discord (for Discord bot)
DISCORD_TOKEN="your_discord_bot_token"

# Slack (for Slack bot)
SLACK_BOT_TOKEN="xoxb-your-token"
SLACK_SIGNING_SECRET="your_signing_secret"
```

### 4. Build Packages

```bash
# Build all packages
pnpm build

# Or build specific platforms
pnpm build:discord
pnpm build:slack
```

### 5. Run Bots

```bash
# Discord bot
pnpm dev

# Slack bot
pnpm dev:slack
```

## 🔑 Key Concepts

### Platform Adapter Interface

All platforms implement the `PlatformAdapter` interface:

```typescript
interface PlatformAdapter {
  readonly platformType: 'discord' | 'slack';
  initialize(token: string): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  fetchUser(userId: string): Promise<PlatformUser>;
  sendDirectMessage(userId: string, message: PlatformMessage): Promise<void>;
  // ... more methods
}
```

### Platform-Agnostic Types

```typescript
import { PlatformMessage, PlatformEmbed, PlatformComponent } from '@standup-scribe/core';

// Create a message
const message: PlatformMessage = {
  content: 'Hello from the platform-agnostic core!',
  embeds: [{
    title: 'Standup Report',
    description: 'Daily standup summary',
  }],
  components: [{
    type: 'action_row',
    components: [{
      type: 'button',
      label: 'Start Standup',
      customId: 'standup_start',
      style: 'primary',
    }],
  }],
};
```

### Database Helpers

```typescript
import { findWorkspaceByPlatformId, createWorkspace } from '@standup-scribe/database';

// Find workspace
const workspace = await findWorkspaceByPlatformId(guildId, 'DISCORD');

// Create workspace
await createWorkspace({
  workspaceId: guildId,
  platformType: 'DISCORD',
  managementChannelId: channelId,
  teamRoleMention: '@team',
});
```

## 🛠️ Development Workflow

### Adding a New Platform

1. **Create Platform Package**
   ```bash
   mkdir -p packages/platform-telegram/src
   ```

2. **Implement PlatformAdapter**
   ```typescript
   export class TelegramAdapter implements PlatformAdapter {
     readonly platformType = 'telegram';
     // Implement all required methods
   }
   ```

3. **Create App Package**
   ```bash
   mkdir -p packages/app-telegram/src
   ```

4. **Update Core Types** (if needed)
   - Add to `PlatformType` enum
   - Update platform-specific types

### Adding Core Features

1. **Add Service Interface** (in `packages/core/src/types/services.interface.ts`)

2. **Implement Service** (in `packages/core/src/services/`)

3. **Update Database Schema** (if needed)
   ```bash
   cd packages/database
   # Edit prisma/schema.prisma
   pnpm prisma:migrate
   ```

4. **Use from Platform Adapters**
   ```typescript
   import { MyService } from '@standup-scribe/core';
   ```

## 🧪 Testing

### Test Discord Adapter

```bash
cd packages/platform-discord
pnpm test
```

### Test Slack Adapter

```bash
cd packages/platform-slack
pnpm test
```

### Integration Tests

```bash
pnpm test:integration
```

## 📊 Database Schema

### Key Tables

- **WorkspaceConfig**: Platform workspace settings
- **RosterMember**: Standup participants
- **StandupRun**: Daily standup instances
- **StandupResponse**: User responses
- **DeliveryJob**: Export tasks

### Platform Support

All tables use `workspaceId` (platform-agnostic) instead of `guildId` (Discord-specific).

## 🔄 Migration from Old Discord Bot

### Database Migration

```bash
# Backup first!
pg_dump standup_db > backup.sql

# Run migration
pnpm prisma:migrate

# Verify
pnpm prisma:studio
```

### Code Migration

Old code:
```typescript
import { discordClient } from './clients/discord';
await discordClient.getRawClient().channels.send(channelId, message);
```

New code:
```typescript
import { createDiscordAdapter } from '@standup-scribe/platform-discord';
const adapter = createDiscordAdapter();
await adapter.sendChannelMessage(channelId, platformMessage);
```

## 🐛 Troubleshooting

### Build Errors

```bash
# Clean all builds
pnpm clean

# Rebuild
pnpm build
```

### Database Issues

```bash
# Reset database (dev only)
dropdb standup_scribe
createdb standup_scribe
pnpm prisma:migrate
```

### Type Errors

```bash
# Regenerate types
pnpm prisma:generate

# Check TypeScript
pnpm --filter @standup-scribe/core build -- --noEmit
```

## 📚 Resources

- **Architecture**: See README.md
- **Implementation**: See MIGRATION_SUMMARY.md
- **Type Definitions**: See packages/core/src/types/
- **Database Schema**: See packages/database/prisma/schema.prisma

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Add tests
4. Update documentation
5. Submit PR

## 💡 Tips

- Use platform-agnostic types from `@standup-scribe/core`
- Implement `PlatformAdapter` for new platforms
- Use database helpers from `@standup-scribe/database`
- Keep platform-specific code in platform packages
- Share common logic in core package

---

**Need Help?**
- Check the main README.md
- Review MIGRATION_SUMMARY.md
- Look at existing adapter implementations
- Open an issue on GitHub

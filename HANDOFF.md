# Team Handoff Guide - Standup Scribe Bot

## Overview

This bot automates daily standup collection for your team. It DMs team members, collects responses via interactive forms, and publishes reports to Discord, Google Sheets, or Notion.

## What You'll Need to Set Up

### 1. Discord Bot Application (5 minutes)

1. Go to https://discord.com/developers/applications
2. Click **"New Application"** → Name it (e.g., "[Your Team] Standup Bot")
3. Go to **"Bot"** → Click **"Add Bot"**
4. Enable these intents:
   - ✅ Message Content Intent
   - ✅ Server Members Intent
5. Copy your **Bot Token** (you'll need this for CapRover)

### 2. Invite Bot to Your Server (2 minutes)

1. In Discord Developer Portal, go to **"OAuth2"** → **"URL Generator"**
2. Select scopes: `bot` and `applications.commands`
3. Select permissions: Send Messages, Embed Links, Use Slash Commands
4. Copy the URL, open it in browser, and authorize

### 3. Get Your Server ID (1 minute)

1. In Discord: **User Settings** → **Advanced** → Enable **Developer Mode**
2. Right-click your server → **Copy ID**

### 4. Set Up Database (Neon) - Free Tier Available

1. Go to https://console.neon.tech
2. Sign up/login → Click **"Create a project"**
3. Copy the **Connection String** (looks like: `postgresql://...`)

### 5. Deploy to CapRover (5 minutes)

1. **Fork** this repository to your GitHub
2. In CapRover, create a new app called `standup-bot`
3. Go to **"App Config"** → **"Deployment Method"** → Select **"GitHub"**
4. Connect GitHub and select your forked repository
5. Add these environment variables:

```
DISCORD_TOKEN=paste_your_token_here
DATABASE_URL=paste_your_neon_connection_string
TEST_GUILD_ID=paste_your_server_id
ENVIRONMENT=production
```

6. Click **"Deploy Latest Commit"**
7. Wait ~2-3 minutes for deployment

### 6. Run Database Migrations (1 minute)

1. In CapRover, go to your app → **"CLI"** (or click the terminal icon)
2. Run: `npx prisma migrate deploy`

### 7. Configure the Bot (2 minutes)

In your Discord server, type:

```
/standup setup
```

Fill in:
- **Channel**: Select where you want reports posted
- **Team Role**: `@team` (or create one first)
- **Timezone**: Your timezone (e.g., `America/New_York`, `Europe/London`)
- **Window**: Standup hours (default: `09:00` - `16:00`)
- **Reminders**: When to remind (e.g., `10:00,12:00,14:00`)

### 8. Add Team Members (1 minute per person)

```
/roster add @teammate
```

### 9. Tell Team to Verify DMs

Ask everyone to run:

```
/standup subscribe
```

If it fails, they need to:
- **Server Settings** → **Privacy Settings**
- Enable **"Allow direct messages from server members"**
- Run `/standup subscribe` again

## Optional: Google Sheets Integration

If you want reports in a Google Sheet:

1. Go to https://console.cloud.google.com
2. Create a project → Enable **Sheets API**
3. Go to **IAM & Admin** → **Service Accounts**
4. Create service account → Download JSON key
5. In CapRover, add to environment variables:

```
GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id_from_url
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

6. Share your sheet with the service account email
7. Re-run `/standup setup` and enter the Sheet ID

## Optional: Notion Integration

Similar to Google Sheets - get a token from https://www.notion.so/my-integrations

## Daily Usage

### For Team Members

- You'll get a DM at your configured standup time
- Click **"Start Standup"** button
- Fill out the form (13 questions, takes ~2-3 minutes)
- Submit!

### For Admins

```
/roster add @newhire           # Add someone
/roster remove @person         # Remove someone
/excuse add @person 2024-02-20 2024-02-25 "Vacation"
/standup run                   # Manually trigger standup
/standup close                 # Close and send reports
/standup status                # Check who hasn't submitted
```

## Troubleshooting

### Commands not showing up?

1. Check `TEST_GUILD_ID` is correct in CapRover
2. Restart the app in CapRover
3. Wait 30 seconds and try again

### DMs not working?

Ask the person to:
1. Run `/standup subscribe`
2. If it fails, check privacy settings (see step 9 above)

### Bot crashed?

1. Go to CapRover → Your app → **"Logs"**
2. Check the error message
3. Common issues:
   - Wrong database URL
   - Missing environment variable
   - Database needs migration

### Need to update the bot?

1. Push changes to your GitHub fork
2. In CapRover, click **"Deploy Latest Commit"**

## Questions?

- Check the main README.md for more details
- Look at CapRover logs for errors
- Discord Developer Portal: https://discord.com/developers/applications

## Resources

- **Discord Bot Dashboard**: https://discord.com/developers/applications
- **Neon Database**: https://console.neon.tech
- **CapRover Docs**: https://caprover.com/docs

---

**That's it!** The bot should now be fully functional for your team. 🎉

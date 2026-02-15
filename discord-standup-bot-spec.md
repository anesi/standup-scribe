# Discord Standup Bot — Technical Specification & Build Plan (v1.0)

> Discord-first, single-company standup bot that DMs participants, collects structured updates, and publishes immutable daily reports to Discord, Google Sheets (new tab/day), Notion (new page/day), and CSV — with retries and resend controls.

## 0) Confidence check (what I validated)
- **Discord Interactions do not provide a native date picker** in message components or modals today; implement date entry as text + quick buttons + parsing fallback.  
  References: Discord component reference shows interactive components as buttons/select menus/text input; community feature request asks for datepicker support.  
  - https://discord.com/developers/docs/components/reference  
  - https://support.discord.com/hc/en-us/community/posts/23330220516375-Slash-Command-Option-Datepicker
- **Notion API supports toggle and to-do blocks (with children)**, so we can reproduce your Notion structure reliably without using “tables”.  
  References: Notion Blocks + Append children docs.  
  - https://developers.notion.com/reference/block  
  - https://developers.notion.com/reference/patch-block-children  
  - https://developers.notion.com/reference/post-page

## 1) Product Decisions (Locked)
- **One company-wide standup** (no sub-teams).
- **Handpicked roster** (admins manage).
- **One Discord server**.
- **Weekdays only**.
- **Timezone:** team-based (workspace config).
- **Daily window:** 09:00 → 16:00.
- **Reminders:** 3 max, DM-only, only to non-submitters.
- **Report immutability:** do **not** update after 16:00.
- **No LLM summaries**.
- **Retention:** 5 years.
- **Destinations:**
  - Discord management channel (includes “Risks/Decisions” surfaced there)
  - Google Sheets: **new tab per day**
  - Notion: **new page per day** (toggle-based format; no top risks section)
  - CSV export (per day + date-range export)
- **Prod + staging bots** (separate tokens + env).

## 2) Recommended Tech Stack
- Runtime: **Node.js LTS**
- Language: **TypeScript**
- Discord: **discord.js v14**
- DB: **PostgreSQL** + **Prisma**
- Scheduling: internal cron/tick (every minute) + durable job table
- Google: **googleapis** (Sheets API) via service account
- Notion: **@notionhq/client**
- Timezone: **Luxon** (or Day.js + timezone plugin)

## 3) Core Domain Model (Postgres)
### 3.1 Tables

**WorkspaceConfig** (1 per guild)
- id (uuid)
- guildId (string, unique)
- timezone (string, e.g., `Africa/Lagos`)
- managementChannelId (string)
- teamRoleId (string) — role to mention
- windowStart (string, `09:00`)
- windowEnd (string, `16:00`)
- reminderTimes (string[]) — e.g., `["11:00","14:00","15:30"]`
- notionToken (string, encrypted/secret manager preferred)
- notionParentPageId (string)
- googleSpreadsheetId (string)
- googleServiceAccountJson (text, encrypted/secret manager preferred)
- retentionDays (int, default 1825)
- createdAt, updatedAt

**RosterMember**
- id (uuid)
- guildId (string, indexed)
- userId (string, indexed)
- displayName (string)
- isActive (bool, default true)
- createdAt, updatedAt
- unique(guildId, userId)

**Excusal**
- id (uuid)
- guildId (string)
- userId (string)
- startDate (date) — inclusive
- endDate (date) — inclusive
- reason (text)
- createdByUserId (string)
- createdAt
- index(guildId, userId, startDate, endDate)

**StandupRun**
- id (uuid)
- guildId (string)
- runDate (date) — in workspace timezone
- status (enum: OPEN, CLOSED)
- openedAt (timestamp)
- closedAt (timestamp)
- createdAt, updatedAt
- unique(guildId, runDate)

**StandupResponse**
- id (uuid)
- runId (uuid, FK)
- userId (string)
- status (enum: IN_PROGRESS, SUBMITTED, MISSING, EXCUSED, DM_FAILED)
- currentStep (int)
- answers (jsonb)
- submittedAt (timestamp nullable)
- updatedAt
- unique(runId, userId)

**DeliveryJob**
- id (uuid)
- runId (uuid)
- destination (enum: DISCORD, SHEETS, NOTION, CSV)
- status (enum: PENDING, SUCCESS, FAILED, RETRYING)
- attemptCount (int)
- lastError (text)
- nextAttemptAt (timestamp)
- createdAt, updatedAt
- unique(runId, destination)

**AuditEvent**
- id (uuid)
- guildId (string)
- actorUserId (string)
- action (string)
- payload (jsonb)
- createdAt

### 3.2 Answer JSON Schema
Store everything you need to render to Sheet/Notion/CSV:

```json
{
  "what_working_on": ["item 1", "item 2"],
  "appetite": "free text",
  "start_date": {"raw":"15/02/2026","iso":"2026-02-15"},
  "scheduled_done_date": {"raw":"20/02/2026","iso":"2026-02-20"},
  "actual_done_date": {"raw":"next Tuesday","iso":null},
  "progress_today": ["did x", "did y"],
  "expectations": "ABOVE|AT|BELOW|NIL",
  "at_risk": ["risk 1"],
  "decisions": ["decision 1"],
  "going_well": ["..."],
  "going_poorly": ["..."],
  "notes": "..."
}
```

### 3.3 Multi-item parsing
- If input contains newlines, split by newline.
- Trim leading bullet chars (`-`, `*`, `•`) and whitespace.
- Drop empty lines.
- If user enters a single paragraph, store as a single-item array for list-fields.

## 4) Discord UX Spec

### 4.1 Commands (Admin)
- `/standup setup`
  - set management channel
  - set team role mention
  - set timezone
  - set reminder times (3)
  - set Notion parent page ID (and token via env/secure store)
  - set Google spreadsheet ID (and service account via env/secure store)
- `/standup roster add @user`
- `/standup roster remove @user`
- `/standup roster list`
- `/standup excuse add @user start:YYYY-MM-DD end:YYYY-MM-DD reason:text`
- `/standup excuse remove @user date:YYYY-MM-DD`
- `/standup run` (manual open now)
- `/standup close` (manual close now, publish immediately)
- `/standup status date:YYYY-MM-DD` (shows delivery status)
- `/standup resend date:YYYY-MM-DD destination:(all|discord|sheets|notion|csv)`
- `/standup export from:YYYY-MM-DD to:YYYY-MM-DD`

**Admin auth**: require `Manage Guild` permission OR a configured admin role (choose one).

### 4.2 DM Standup Flow (Participant)
Guided, resumable, one question at a time.
Each step message includes:
- **Nil** button
- Back (optional)
- Continue/Next (as needed)

**Steps (ordered)**
1. What are you working on (multi-item)
2. What’s the appetite (free text)
3. When did it start (date input)
4. When are you scheduled to be done (date input)
5. When do you think you will actually be done (date input or free text)
6. What was the progress made today? (multi-item)
7. Expectations (select menu: Above / At / Below / Nil)
8. What is at risk (multi-item)
9. What decisions are there to be made (multi-item)
10. What is going well? (multi-item)
11. What is going poorly? (multi-item)
12. Notes (free text)
13. Submit confirmation (button)

**Date handling**
- Provide quick buttons: Today / Tomorrow / Next Week / Nil
- Accept typed: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, etc.
- Parse into ISO when possible; else store raw and leave iso null.

**Resume behavior**
- Save every step.
- Reminder includes “Continue” button to resume.

**Locking**
- After run closes (16:00), respond with “Standup closed for today; contact admin if needed.”
- No editing after close (simplest, matches immutability).

## 5) Scheduler & Run Lifecycle

### 5.1 Minute Tick
Run a tick job every minute:

**At 09:00 (weekday)**
- Determine `runDate` in workspace timezone.
- Create StandupRun if missing (`OPEN`).
- For each active roster member:
  - if excused for date: mark/ensure response status EXCUSED (optional) and skip DM
  - else send DM start message:
    - on DM error: mark response status DM_FAILED

**At reminder times**
- For each active roster member:
  - if SUBMITTED/EXCUSED: skip
  - else DM reminder with Continue button

**At 16:00**
- Close run:
  - set StandupRun.status = CLOSED, closedAt = now
  - For each member:
    - if excused: response EXCUSED
    - else if submitted: keep
    - else if DM failed: DM_FAILED
    - else: MISSING
- Enqueue DeliveryJobs for DISCORD, SHEETS, NOTION, CSV with status PENDING and nextAttemptAt = now

### 5.2 Manual run / close
- `/standup run`: open run immediately (same day only).
- `/standup close`: close and publish immediately.

## 6) Deliveries (Output Specs)

## 6.1 Discord Management Post
Destination: WorkspaceConfig.managementChannelId  
Mention: WorkspaceConfig.teamRoleId once at top.

Content:
- Title: `Daily Standup — YYYY-MM-DD`
- Stats: submitted/total + missing + excused + dm_failed
- **Risks** (non-empty `at_risk` lists where not Nil)
- **Decisions** (non-empty `decisions`)
- Link placeholders:
  - Google Sheet tab (constructed as spreadsheet link + gid once known)
  - Notion page URL (from API response)
- Optional: attach CSV (or link)

Notes:
- Keep message length within Discord limits; if too long, post summary + links and attach CSV.

## 6.2 Google Sheets (New tab per day)
- Tab name: `YYYY-MM-DD`
- If tab exists: clear and rewrite.
- Row 1 headers (your columns) + extra fields at end:
  - Status
  - SubmittedAt

Columns (in order):
1. Person
2. What are you working on
3. What's the appetite
4. When did it start
5. When are you scheduled to be done
6. When do you think you will actually be done
7. What was the progress made today?
8. Is the progress made above-, at-, or below- expectations?
9. What is at risk
10. What decisions are there to be made
11. What is going well?
12. What is going poorly?
13. Notes
14. Status
15. SubmittedAt

Rendering rules:
- list arrays join with newline `\n` in a single cell.

## 6.3 Notion (New page per day, toggle format)
Create a page under WorkspaceConfig.notionParentPageId.

**Title format**
`@{Weekday} ({YYYY-MM-DD})`

**Blocks**
1) Paragraph: `Reporting Format:`
2) Toggle: `Sample`
   - children: to_do blocks showing example structure (you can keep minimal)
3) For each roster member (active):
   - Toggle block title: `@DisplayName`
   - children blocks:
     - For list fields: use to_do blocks for each item (unchecked)
     - For scalar fields: use paragraph blocks `Field: value`

**Important**: Do not add a top “Risks/Decisions” section in Notion.

## 6.4 CSV
- Generate `exports/YYYY-MM-DD.csv`
- Same columns as Sheets.
- Store file path in DeliveryJob payload or in StandupRun metadata.
- `/standup export` generates a zipped CSV bundle or a single CSV merged by date.

## 7) Delivery Reliability

### 7.1 Delivery Job Worker
Every minute:
- Pull jobs where `status in (PENDING, RETRYING)` and `nextAttemptAt <= now`.
- Attempt delivery.
- On success:
  - status = SUCCESS
- On failure:
  - attemptCount += 1
  - status = RETRYING (or FAILED after cap)
  - nextAttemptAt = now + backoff
  - lastError saved

Backoff schedule:
- 1m, 5m, 15m, 60m, 6h, 24h (cap at 24h)
After max attempts (e.g., 8), set status FAILED.

### 7.2 Status & Resend
- `/standup status date` shows each destination job state + last error.
- `/standup resend date destination` re-queues by setting status PENDING, attemptCount=0, nextAttemptAt=now.

### 7.3 Failure visibility
If any destination fails at close:
- DM admins OR post into a configured admin channel:
  - `Sheets failed; retrying at HH:MM; error: ...`

## 8) Environment & Secrets

### 8.1 Required env vars
- DISCORD_TOKEN
- DATABASE_URL
- NOTION_TOKEN
- NOTION_PARENT_PAGE_ID
- GOOGLE_SHEETS_SPREADSHEET_ID
- GOOGLE_SERVICE_ACCOUNT_JSON (stringified JSON)
- ENVIRONMENT = staging|prod

### 8.2 Staging vs Prod
Use separate:
- Discord app + token
- DB
- Notion integration (optional but recommended)
- Google service account (optional separate)

## 9) Implementation Plan (GLM 4.5 / Claude Code Tasks)

## Phase A — Project setup
1) Create TS project, lint/format, dotenv.
2) Add prisma schema and migrate.
3) Add discord client skeleton and command registration.

## Phase B — Admin configuration
4) Implement `/standup setup` + config persistence.
5) Implement roster add/remove/list.
6) Implement excusals add/remove.

## Phase C — Scheduler + run lifecycle
7) Implement minute tick:
   - open run
   - reminders
   - close run and enqueue delivery jobs

## Phase D — DM standup flow
8) Implement guided steps with components:
   - buttons (Nil, Continue)
   - select menu (Expectations)
   - text input via DM messages (or modals for specific fields)
9) Save progress per step and resume.

## Phase E — Deliveries
10) Implement CSV generation.
11) Implement Sheets write (new tab per day).
12) Implement Notion page creation with toggles + to_do children.
13) Implement Discord management post.

## Phase F — Reliability
14) Implement DeliveryJob worker with retries.
15) Implement `/standup status` and `/standup resend`.

## Phase G — Hardening
16) Handle DM disabled users (DM_FAILED).
17) Handle message length limits in Discord post (fallback to links + CSV).
18) Add basic logging + error boundaries.

## 10) Test Plan (Manual)
- Setup config and roster.
- Run manual open + submit 2 participants + one missing.
- Verify:
  - reminders only to missing
  - close freezes responses
  - Discord post created
  - Sheets tab created + correct columns
  - Notion page created + structure matches screenshot
  - CSV generated
- Simulate API failure (invalid Sheets creds):
  - Discord still posts; DeliveryJob retries; `/status` shows error.
- DM blocked user:
  - user marked DM_FAILED; appears in report.

## 11) Acceptance Criteria (MVP)
- Weekdays: 09:00 DM prompt to roster (excluding excused).
- Collect answers for all fields; multi-item supported; Nil supported.
- 3 DM-only reminders to non-submitters.
- 16:00 close creates immutable report.
- Outputs land:
  - Discord management post
  - Google Sheets new tab/day
  - Notion new page/day with toggles
  - CSV generated
- Delivery reliability:
  - retries on Sheets/Notion/CSV
  - `/standup status` + `/standup resend` works
- Data stored with 5-year retention policy in config.

---

## Appendix A — Notion Block Mapping Cheat Sheet
- Page: POST /v1/pages with `children` to create initial blocks.
- Toggle block type: `toggle` with `rich_text` title and `children`.
- To-do block type: `to_do` with `rich_text` text and `checked: false`.
- Paragraph block type: `paragraph` with `rich_text`.

(Use Append children endpoint for large pages to avoid payload limits.)

## Appendix B — Discord Component Notes
- Use select menus for expectations.
- Use buttons for Nil/Continue/Snooze.
- Use DM messages (or modals) for free text.
- No native date picker; parse typed dates and provide quick date buttons.


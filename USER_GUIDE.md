# Standup Scribe Bot - User Guide

## Welcome! 👋

**Standup Scribe** is your friendly Discord bot that makes daily standups quick and easy. You'll receive a private message (DM) when it's time to fill out your standup, answer a few questions about your work, and that's it!

Your responses are shared with your team in the standup report channel, and optionally in Google Sheets or Notion (depending on your team's setup).

**Time commitment:** About 2-3 minutes per day.

---

## Why Do We Do Standups?

Standups help the team:
- Stay aligned on what everyone is working on
- Identify blockers or risks early
- Make better decisions with full context
- Celebrate wins and support each other through challenges

---

## Getting Started (First Time)

### Step 1: Verify DMs Work

In any channel where the bot is active, type:

```
/standup subscribe
```

This tests whether the bot can send you direct messages.

**If successful:** You'll see a confirmation message.

**If it fails:** You'll see instructions to enable DMs (see below).

---

### Step 2: Enable DMs (If Blocked)

If you can't receive DMs from the bot, follow these steps:

1. Open Discord
2. Go to **Server Settings** (right-click your server name)
3. Select **Privacy Settings**
4. Find **"Allow direct messages from server members"**
5. Toggle it **ON**
6. Go back and run `/standup subscribe` again

---

### What Happens Next?

- When standup opens (usually at 9 AM your time), you'll receive a DM
- Click the **"Start Standup"** button to begin
- Fill out 13 quick questions (one at a time)
- Review your answers and submit

That's it! The bot will remind you if you forget.

---

## Daily Standup: Step-by-Step

### 1. You Receive a DM

When standup opens, you'll get a message like this:

```
📋 Standup is now open!

Click the button below to start filling out your standup.
[Start Standup] button
```

### 2. Click "Start Standup"

This opens the first question in a popup form (called a "modal").

### 3. Fill Out the Questions

You'll see 13 questions, one at a time. Each question has:
- **Clear instructions** on what to enter
- **Helpful placeholder text** showing the format
- **Optional fields** - you can skip anything by leaving it blank or typing "Nil"

### 4. Navigate Between Questions

- After answering each question, click **"Continue →"** to go to the next one
- You can always go back using the **"← Edit"** button during the final review
- Your progress is saved automatically as you go

### 5. Review and Submit

At the end, you'll see a summary of all your answers. Review them carefully, then:
- Click **"← Edit"** to go back and change something
- Click **"✓ Submit Standup"** to finalize

**Important:** You cannot edit your submission after you submit, so review carefully!

---

## The 13 Questions Explained

Here's a quick reference for each question you'll be asked:

### 1. What are you working on?

**Type:** Multi-item list (one item per line)

**What it's asking:** What are your main tasks or projects right now?

**How to answer:** Enter each task on a new line. Be concise but specific.

**Examples:**

Good:
```
Building user authentication flow
Fixing bug in payment integration
Planning sprint retro
```

Too vague:
```
Work stuff
Coding
```

**Can I say "Nil"?** Yes, if you truly have nothing to report (e.g., first day, onboarding).

---

### 2. What's the appetite?

**Type:** Free text (paragraph)

**What it's asking:** Why is this work important? What's the business impact or ROI?

**How to answer:** Explain the value or goal. Keep it to 1-2 sentences.

**Examples:**

Good:
```
Need to launch before Q2 end to hit revenue targets
Security requirement for compliance audit
User feedback shows this is top friction point
```

---

### 3. When did it start?

**Type:** Date

**What it's asking:** When did you start working on this?

**How to answer:** Enter a date in any common format, or type "Nil" if not applicable.

**Accepted formats:**
- `15/02/2026` or `15-02-2026`
- `2026-02-15`
- `today`, `tomorrow`, `next Tuesday`
- `Nil` (if not applicable)

**Examples:**

```
Started last Monday: 10/02/2026
Started today: today
Ongoing project: 01/02/2026
Not applicable: Nil
```

---

### 4. When scheduled to be done?

**Type:** Date

**What it's asking:** When is this task or project supposed to be finished?

**How to answer:** Same date formats as above. Use your best estimate if uncertain.

**Examples:**

```
Deadline: 20/02/2026
End of sprint: next Friday
No deadline: Nil
```

---

### 5. When actually done?

**Type:** Date or free text

**What it's asking:** When did you (or will you) actually complete this?

**How to answer:** Enter the actual or estimated completion date, or "Nil" if not done yet.

**Examples:**

```
Finished yesterday: 14/02/2026
Will finish tomorrow: tomorrow
Not done yet: Nil
```

---

### 6. Progress made today?

**Type:** Multi-item list (one item per line)

**What it's asking:** What did you accomplish today on this work?

**How to answer:** List specific tasks completed, progress made, or milestones hit.

**Examples:**

Good:
```
Completed login form UI
Fixed authentication API bug
Wrote unit tests for payment flow
```

Poor:
```
Did some work
Progress
```

**Can I say "Nil"?** Yes, if you made no progress today.

---

### 7. Expectations?

**Type:** Select one option

**Options:**
- `ABOVE` - Progress exceeded expectations
- `AT` - Progress met expectations
- `BELOW` - Progress fell below expectations
- `NIL` - Not applicable or no expectations set

**What it's asking:** How does your progress compare to what was expected?

**How to answer:** Type one of the four options exactly as shown.

**Examples:**

```
ABOVE  (finished ahead of schedule)
AT      (on track)
BELOW   (blocked or behind)
NIL     (no expectations set)
```

---

### 8. What is at risk?

**Type:** Multi-item list (one item per line)

**What it's asking:** What could go wrong? What are the blockers or risks?

**How to answer:** List any risks, dependencies, blockers, or concerns.

**Examples:**

Good:
```
Waiting on design assets
API dependency is deprecated
Teammate on vacation until Monday
```

**Can I say "Nil"?** Yes, if there are no known risks.

---

### 9. What decisions need to be made?

**Type:** Multi-item list (one item per line)

**What it's asking:** What does the team need to decide or clarify?

**How to answer:** List pending decisions or areas needing team input.

**Examples:**

Good:
```
Choose between PostgreSQL vs. MongoDB for new feature
Approve budget for third-party API
Decide on launch date for beta
```

**Can I say "Nil"?** Yes, if no decisions are needed.

---

### 10. What is going well?

**Type:** Multi-item list (one item per line)

**What it's asking:** What's positive? What should we celebrate?

**How to answer:** List wins, successes, or positive developments.

**Examples:**

Good:
```
New onboarding docs reduced support tickets by 30%
Team velocity improved after sprint retrospective
Client loved the new dashboard designs
```

**Can I say "Nil"?** Yes, if nothing notable is going well (but try to find at least one thing!).

---

### 11. What is going poorly?

**Type:** Multi-item list (one item per line)

**What it's asking:** What's challenging? What needs attention?

**How to answer:** List challenges, issues, or areas for improvement.

**Examples:**

Good:
```
Code review backlog is growing
Staging environment keeps crashing
Communication with design team is unclear
```

**Can I say "Nil"?** Yes, if everything is going smoothly.

---

### 12. Any notes?

**Type:** Free text (paragraph)

**What it's asking:** Anything else you want to share?

**How to answer:** Free-form text. Use this for context, shout-outs, or anything that doesn't fit elsewhere.

**Examples:**

```
Big thanks to @sarah for helping with the deployment!
Working from home tomorrow.
Need to leave early Friday for dentist appointment.
```

**Can I leave it blank?** Yes, this is completely optional.

---

### 13. Confirm & Submit

**Type:** Review summary

**What you'll see:** A summary of all your answers organized by question.

**What to do:**
- Review everything carefully
- Click **"← Edit"** if you need to change anything
- Click **"✓ Submit Standup"** when you're satisfied

**Remember:** No edits after submission!

---

## Common Scenarios

| Scenario | What to Do |
|----------|------------|
| **On vacation / OOO** | Your admin should excuse you in advance. If not, just enter "Nil" in list questions. |
| **Blocked on something** | Add it to "What is at risk?" with details. |
| **Nothing to report** | Enter "Nil" in list questions, leave text questions blank. |
| **Working on multiple things** | Enter each task/progress item on a new line in the list questions. |
| **Finished yesterday** | Put yesterday's date in "When actually done?" |
| **Forgot to submit** | Contact your admin to re-open if possible. Otherwise, it'll be marked as missing. |
| **Made a mistake** | You can't edit after submitting. Be careful to review before clicking submit! |
| **Running late** | Submissions are accepted until standup closes (usually 4 PM). No need to rush. |
| **Received DM but can't click button** | Try restarting the Discord app. If that doesn't work, contact your admin. |

---

## Tips & Best Practices

### Do's ✅
- **Be concise:** Keep each item to 1-2 sentences
- **Focus on impact:** Explain why something matters, not just what it is
- **Call out blockers early:** Use "What is at risk?" to flag issues
- **Celebrate wins:** Share successes in "What is going well?"
- **Be honest:** If progress is below expectations, say so—it helps the team support you
- **Use "Nil" when appropriate:** It's better than making things up

### Don'ts ❌
- **Don't write novels:** Keep it brief and skimmable
- **Don't hide problems:** Blockers don't go away if you don't mention them
- **Don't forget to review:** You can't edit after submitting
- **Don't stress if late:** You have until close time (usually 4 PM)
- **Don't skip standup:** If you have nothing, just say "Nil"—it still counts!

---

## Understanding Multi-Item Lists

Several questions ask for multi-item lists. Here's how they work:

### Format
- Enter each item on a **new line**
- Each line becomes a **bullet point** in the report
- No need to add bullet characters (•, -, *)—the bot handles that

### Example Input

```
Built login form
Fixed authentication bug
Wrote unit tests
```

### Becomes This in the Report

- Built login form
- Fixed authentication bug
- Wrote unit tests

### What "Nil" Means

When you enter "Nil" in a list question, it shows as:
- _Nil_ (italicized, indicating "nothing to report")

This is different from leaving it blank, which shows as empty. Use "Nil" when you want to be explicit that there's nothing to report.

---

## Understanding Dates

The bot is flexible about date formats:

### Accepted Formats
- ** slashes:** `15/02/2026`
- ** dashes:** `15-02-2026`
- ** ISO format:** `2026-02-15`
- ** Relative:** `today`, `tomorrow`, `next Tuesday`, `next Monday`
- ** Literal:** `Nil` (if not applicable)

### Timezone Handling
Dates are interpreted in your **team's configured timezone**. If your team is set to `America/New_York`, then "today" means today in New York time.

### Examples

| What you type | What it means |
|---------------|---------------|
| `today` | Today's date in your team's timezone |
| `15/02/2026` | February 15, 2026 |
| `next Tuesday` | The upcoming Tuesday |
| `Nil` | Not applicable / no date set |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **No DM arrived** | Run `/standup subscribe` to verify DMs work. If it fails, enable DMs in server privacy settings. |
| **DM is blocked** | Go to **Server Settings** → **Privacy Settings** → Enable **"Allow direct messages from server members"** |
| **Can't click buttons** | Restart the Discord app. If that doesn't work, contact your admin. |
| **Submission error** | Try again. If it persists, contact your admin. |
| **Missed deadline** | Contact your admin. They may be able to re-open the standup for you. |
| **Want to edit after submit** | Unfortunately, you can't. Be careful to review before submitting! |
| **Accidentally submitted** | Contact your admin ASAP. They may be able to help if caught early. |
| **Wrong timezone** | Ask your admin to check the team timezone configuration. |
| **Bot commands not appearing** | Make sure you're typing in a server channel, not in DMs. Some commands only work in the server. |

---

## FAQ

### How long does standup take?

About 2-3 minutes if you're concise. Some people take 5 minutes if they write detailed responses.

### Can I edit my submission after submitting?

**No.** Once you click "Submit," your responses are locked. This is intentional—standup reports are meant to be a snapshot in time. Review carefully before submitting!

### What if I'm late?

No worries! You can submit anytime before standup closes (usually 4 PM your time). Reminders are sent at configurable times to help you remember.

### Who sees my responses?

Your entire team sees your responses in the standup report channel (e.g., `#standup-reports`). Depending on your team's setup, responses may also be visible in Google Sheets or Notion.

### Can I skip questions?

Yes! Enter "Nil" in list questions or leave text questions blank. Only the questions that matter to you need answers.

### What if I'm on vacation?

Your admin should "excuse" you in advance using the `/excuse` command. If they forget, just enter "Nil" in your standup and let them know.

### Can I do standup early?

Yes! As soon as the standup opens (usually 9 AM), you can submit. You don't need to wait for reminders.

### What timezone does the bot use?

Your team's configured timezone. Check with your admin if you're unsure.

### What happens if I never submit?

You'll be marked as "missing" in the report. Your team may follow up with you to make sure everything is okay.

### Is my data private?

Your standup responses are visible to your team. Treat them like any other team communication. Don't share sensitive information you wouldn't normally discuss in the team channel.

### Can I use the bot on mobile?

Yes! The bot works on Discord's mobile app. The modals may look slightly different, but all functionality is the same.

---

## Need Help?

If you're having trouble with the bot:

1. **Check this guide first** - The answer is probably here!
2. **Ask a teammate** - Someone else may have had the same issue
3. **Contact your admin** - They can check the bot status and help troubleshoot
4. **Check the standup channel** - Admins often post updates there

---

## Quick Reference Card

### Slash Commands You Can Use

```
/standup subscribe     Test if DMs work
```

### The 13 Questions (Quick List)

1. What are you working on? (list)
2. What's the appetite? (text)
3. When did it start? (date)
4. When scheduled to be done? (date)
5. When actually done? (date)
6. Progress made today? (list)
7. Expectations? (ABOVE/AT/BELOW/NIL)
8. What is at risk? (list)
9. What decisions need to be made? (list)
10. What is going well? (list)
11. What is going poorly? (list)
12. Any notes? (text)
13. Confirm & Submit

### Date Formats

- `15/02/2026` or `15-02-2026`
- `2026-02-15`
- `today`, `tomorrow`, `next Tuesday`
- `Nil` (not applicable)

### List Format

- One item per line
- No bullets needed
- Type "Nil" for empty lists

---

## That's It!

You're now ready to use Standup Scribe like a pro. Remember:

- Be concise but complete
- Call out blockers early
- Review before submitting
- Ask for help if you need it

Happy standup-ing! 🚀

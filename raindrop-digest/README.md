# Raindrop Digest

A GitHub Action that sends you a daily email digest of your saved Raindrop.io bookmarks — complete with clean formatting, dark/light mode support, and AI-powered article recommendations.

### ✨ Features

- Pulls up to 7 of your most recent Read Later saves
- Uses the Raindrop.io API
- GPT-4 powered article recommendations based on your archive tags
- Responsive email layout with native Apple dark mode support
- Includes favicons, cover images, excerpts, and source metadata
- Fully automated via GitHub Actions
- Friendly sign-off at the end of each email

### 📬 What It Looks Like

Emails are styled to feel like a lightweight editorial newsletter:
- Serif title
- Blockquoted summaries
- Clear tags and source metadata
- Responsive for both macOS Mail and iOS Mail

### 🔧 Setup

1. **Fork this repo**
2. Add these repository secrets (Settings → Secrets and variables → Actions):
   - `RAINDROP_TOKEN` — Raindrop.io API token
   - `COLLECTION_ID` — ID of your "Read Later" collection
   - `ARCHIVE_ID` — (optional) ID of an archive collection for generating recommendations
   - `SMTP_USER` — iCloud (or other) SMTP username
   - `SMTP_PASS` — SMTP app-specific password
   - `TO_EMAIL` — Your email address (e.g. `you@icloud.com`)
   - `FROM_EMAIL` — From address (same as above for iCloud)
   - `PERPLEXITY_API_KEY` or `OPENAI_API_KEY` — (optional) For AI-powered recommendations

3. **Push to `main`**, GitHub Actions will send you a daily digest
4. **Manual run:** You can also trigger it manually from the Actions tab

### 🕒 Schedule

Runs every day at 8:00 AM Pacific Time (11:00 AM Eastern) via cron:
```yaml
schedule:
  - cron: '0 15 * * *'
```
The cron expression uses Coordinated Universal Time (UTC), so `0 15 * * *`
corresponds to 15:00 UTC.
You can modify `.github/workflows/digest.yml` to change the send time or
adjust the schedule as needed.

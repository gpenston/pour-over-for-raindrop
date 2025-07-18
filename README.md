# Raindrop Digest

A GitHub Action that sends you a daily email digest of your saved Raindrop.io bookmarks — complete with clean formatting, dark/light mode support, estimated read times, and optional GPT-powered summaries.

### ✨ Features

- Pulls 3–5 recent saves and 2 older random ones
- Uses the Raindrop.io API
- GPT summaries added to the email and Raindrop note field
- Responsive email layout with native Apple dark mode support
- Includes favicons, source metadata, and estimated read time
- Fully automated via GitHub Actions

### 📬 What It Looks Like

Emails are styled to feel like a lightweight editorial newsletter:
- Serif title
- Blockquoted summaries
- Clear tags and source metadata
- Responsive for both macOS Mail and iOS Mail

### 🔧 Setup

1. **Fork this repo**
2. Add these repository secrets:
   - `RAINDROP_TOKEN` — Raindrop.io API token
   - `COLLECTION_ID` — ID of your “Read Later” collection
   - `ARCHIVE_ID` — (optional) archive collection to pull tags for OpenAI recs
   - `SMTP_USER` — Your iCloud (or other) SMTP username
   - `SMTP_PASS` — SMTP app-specific password
   - `TO_EMAIL` — Your email address (e.g. `you@icloud.com`)
   - `FROM_EMAIL` — From address (same as above for iCloud)
   - `OPENAI_API_KEY` — (optional) for GPT summaries

3. **Push to `main`**, GitHub Actions will send you a daily digest

### 🕒 Schedule

Runs every day at 8:00 AM Pacific Time (11:00 AM Eastern) via cron:
```yaml
schedule:
  - cron: '0 15 * * *'
```
The cron expression uses Coordinated Universal Time (UTC), so `0 15 * * *`
corresponds to 15:00 UTC.

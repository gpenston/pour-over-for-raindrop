# CLAUDE.md - AI Assistant Context

## Project Overview

**Name**: Raindrop Digest
**Owner**: George Penston (gpenston@gmail.com)
**Type**: Personal automation project
**Repository**: https://github.com/gpenston/raindrop-digest
**Status**: Production, actively running via GitHub Actions

A Node.js script that sends a beautifully formatted email digest of Raindrop.io bookmarks with AI-powered article recommendations. Runs automatically via GitHub Actions on a schedule.

## Quick Reference

### Commands
```bash
npm install          # Install dependencies
npm start            # Run the digest script (sends email)
```

### Key Files
| File | Purpose |
|------|---------|
| `raindrop-digest.js` | Main script (~500 lines) - orchestrates everything |
| `.github/workflows/digest.yml` | GitHub Actions automation |
| `.env` | Local credentials (gitignored) |
| `env.example` | Template for .env setup |

### Important Constants (in raindrop-digest.js)
```javascript
MAX_ITEMS_TO_SHOW = 7          // Recent items in digest
ARCHIVE_FETCH_LIMIT = 100      // Archive items for tag analysis
TOP_TAGS_COUNT = 10            // Tags used for recommendations
RECOMMENDATIONS_COUNT = 5      // AI recommendations per digest
MIN_ITEMS_THRESHOLD = 5        // Minimum items to send digest (skips if <=5)
MAX_RETRIES = 3                // API retry attempts
RETRY_DELAY_MS = 1000          // Initial retry delay (doubles each attempt)
```

## Architecture

### How It Works
1. **Validates environment** - Checks all required variables exist
2. **Fetches bookmarks** - Gets recent items from Read Later collection via Raindrop API
3. **Analyzes tags** - Weights tags from Read Later (3x) and Archive (1x) collections
4. **Filters tags** - Removes year tags (2024, 2025) to avoid trend-chasing
5. **Generates recommendations** - Uses Perplexity/OpenAI to find relevant articles
6. **Filters listicles** - Rejects "Top X" and numbered tip lists
7. **Builds HTML email** - Creates responsive dark/light mode email
8. **Sends via SMTP** - Delivers through iCloud Mail

### Main Functions
| Function | Purpose |
|----------|---------|
| `validateEnv()` | Check required environment variables at startup |
| `retryWithBackoff()` | Exponential backoff wrapper (3 retries) |
| `getRaindropItems()` | Fetch bookmarks from Raindrop API |
| `groupSimilarTags()` | Categorize tags to improve recommendation diversity |
| `getRecommendations()` | Get AI-powered article suggestions |
| `buildEmailHtml()` | Generate responsive HTML email |
| `sendEmail()` | Send via iCloud SMTP |

### API Integrations
- **Raindrop.io API** - Fetches bookmarks from collections
- **Perplexity API** (primary) - `sonar-pro` model with web search
- **OpenAI API** (fallback) - `gpt-4o-mini` model
- **iCloud SMTP** - `smtp.mail.me.com:587` for email delivery

## Configuration

### Environment Variables

**Required:**
| Variable | Description |
|----------|-------------|
| `RAINDROP_TOKEN` | Raindrop.io API token |
| `COLLECTION_ID` | Read Later collection ID |
| `SMTP_USER` | iCloud email address |
| `SMTP_PASS` | iCloud app-specific password |
| `FROM_EMAIL` | Sender email address |
| `TO_EMAIL` | Recipient email address |

**Optional:**
| Variable | Description | Default |
|----------|-------------|---------|
| `ARCHIVE_ID` | Archive collection ID for tag analysis | None |
| `PERPLEXITY_API_KEY` | Perplexity API key | None |
| `OPENAI_API_KEY` | OpenAI API key | None |
| `AI_PROVIDER` | `'perplexity'` or `'openai'` | `'openai'` |

### Personal Collection IDs
- **Read Later**: 49504400
- **Archive**: 45122018

## GitHub Actions

### Schedule
- **Runs**: Weekly on Sunday
- **Time**: 8:00 AM Pacific (15:00 UTC)
- **Cron**: `0 15 * * 0`
- **Manual trigger**: Available from Actions tab

### Secrets Required
All environment variables must be set as repository secrets in GitHub:
Settings > Secrets and variables > Actions

## Development Guidelines

### Code Style
- ES Modules (`import`/`export`)
- Async/await for all asynchronous operations
- Console logging with emoji prefixes for status
- Graceful error handling with retries

### Error Handling Philosophy
- **Retry on 5xx errors** - Server issues are transient
- **Retry on 429** - Rate limits pass with time
- **Fail fast on 4xx** - Client errors won't fix themselves
- **Graceful degradation** - Skip recommendations if AI fails, still send digest

### Testing Locally
```bash
# 1. Copy env template
cp env.example .env

# 2. Fill in credentials
# Edit .env with your values

# 3. Run
npm start
```

### Preview Email Without Sending
```javascript
// Temporarily modify raindrop-digest.js:
import { writeFileSync } from 'fs';
writeFileSync('preview.html', html);
console.log('Preview saved to preview.html');
// Comment out: await sendEmail(html);
```

## AI Recommendation Strategy

### Tag Weighting
- Read Later tags: **3x weight** (current active interests)
- Archive tags: **1x weight** (historical interests)
- Year tags filtered out (2024, 2025, etc.)

### Content Preferences by Category
| Category | Prefer | Avoid |
|----------|--------|-------|
| Media (games, movies, books) | Thoughtful essays, cultural criticism, personal reflections | Industry news, revenue reports, "Top X" lists |
| Personal development | Research-backed analyses, first-person narratives | "X strategies", numbered tips, generic advice |
| Professional | Case studies, technical deep-dives, research papers | Trend forecasts, prediction pieces |

### Listicle Detection
Titles are rejected if they match:
- Start with "Top" or "Best"
- "5 Essential Tips" pattern
- "X Strategies/Ways/Things/Trends" pattern
- Retries up to 2 times per tag group

## File Structure

```
raindrop-digest/
├── .github/
│   └── workflows/
│       └── digest.yml        # GitHub Actions automation
├── .gitignore                # Ignores .env, node_modules
├── CLAUDE.md                 # This file - AI assistant context
├── README.md                 # Public documentation
├── SETUP.md                  # Local development guide
├── TODO.md                   # Task list and roadmap
├── env.example               # Template for .env
├── package.json              # Dependencies
├── package-lock.json         # Locked versions
└── raindrop-digest.js        # Main script
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| axios | ^1.6.8 | HTTP client for API calls |
| dayjs | ^1.11.10 | Date formatting |
| dotenv | ^16.3.1 | Environment variable loading |
| nodemailer | ^7.0.11 | Email sending via SMTP |

## Troubleshooting

### No Digest Sent
- Check if >5 items in Read Later collection (MIN_ITEMS_THRESHOLD)
- Verify COLLECTION_ID matches your collection
- Check GitHub Actions logs for errors

### Email Not Arriving
- Verify SMTP credentials
- Ensure using app-specific password (not regular iCloud password)
- Test locally with `npm start`

### AI Recommendations Failing
- Script gracefully skips recommendations on failure
- Check API key validity and billing status
- Perplexity status: https://status.perplexity.ai/
- OpenAI status: https://status.openai.com/

## Context for AI Assistants

When working on this project:

1. **Personal project** - Built for George's daily use, not public distribution
2. **Reliability over features** - Must work consistently every scheduled run
3. **Simplicity valued** - Avoid over-engineering; it's one 500-line file by design
4. **Email quality matters** - George reads these daily; formatting is important
5. **Substantive recommendations** - Avoid clickbait; prefer deep, thoughtful content
6. **Production-ready** - The code works; suggest improvements, not fixes
7. **Git identity** - Use gpenston@gmail.com for any git operations

### What NOT to Do
- Don't add tests (overhead not worth it for personal project)
- Don't split into multiple files (single-file simplicity is intentional)
- Don't add TypeScript (plain JS is fine for this scale)
- Don't add complex abstractions for one-time operations
- Don't commit .env or any credentials

### Potential Future Improvements (from TODO.md)
- Refactor `buildEmailHtml()` function (extract styles, separate renderers)
- Add email preview mode (`--preview` flag)
- Implement read time estimation
- Better duplicate filtering in recommendations

---

**Last Updated**: 2026-02-04
**Maintained By**: Claude AI assistant

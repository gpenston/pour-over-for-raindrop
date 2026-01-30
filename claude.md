# Raindrop Digest - Claude Context

## Project Overview

**Owner**: George Penston (gpenston@gmail.com)
**Type**: Personal automation project
**Purpose**: Daily email digest of Raindrop.io bookmarks with AI-powered recommendations

This is a Node.js script that:
1. Fetches recent bookmarks from Raindrop.io "Read Later" collection
2. Analyzes tags from both Read Later and Archive collections
3. Generates AI-powered article recommendations using Perplexity or OpenAI
4. Sends a beautifully formatted HTML email digest via iCloud SMTP
5. Runs automatically via GitHub Actions

## Key Information

### Personal Configuration
- **Email**: gpenston@me.com (iCloud)
- **GitHub**: Personal account (gpenston@gmail.com, not LinkedIn account)
- **Repository**: https://github.com/gpenston/raindrop-digest.git
- **Deployment**: GitHub Actions (automated daily)

### Collections
- **Read Later**: Collection ID 49504400
- **Archive**: Collection ID 45122018

### AI Provider
- **Primary**: Perplexity (with web search capabilities)
- **Fallback**: OpenAI (gpt-4o-mini)
- Both API keys are configured

## Architecture

### Main Components

**raindrop-digest.js** (500 lines)
- Entry point and orchestrator
- Functions:
  - `validateEnv()` - Check required environment variables
  - `retryWithBackoff()` - Exponential backoff for API calls (3 retries)
  - `getRaindropItems()` - Fetch bookmarks from Raindrop API
  - `groupSimilarTags()` - Categorize tags to avoid duplication
  - `getRecommendations()` - AI-powered article suggestions
  - `buildEmailHtml()` - Generate responsive HTML email
  - `sendEmail()` - SMTP delivery via iCloud

### Configuration Constants
```javascript
MAX_ITEMS_TO_SHOW = 7          // Recent items in digest
ARCHIVE_FETCH_LIMIT = 100      // Archive items for tag analysis
TOP_TAGS_COUNT = 10            // Tags used for recommendations
RECOMMENDATIONS_COUNT = 5      // AI recommendations per digest
MIN_ITEMS_THRESHOLD = 5        // Minimum items to send digest
MAX_RETRIES = 3                // API retry attempts
```

### Tag Weighting Strategy
- Read Later tags: 3x weight (current active interests)
- Archive tags: 1x weight (historical interests)
- Filters out year tags (2024, 2025, etc.) to avoid trend-chasing

### Listicle Filtering
AI recommendations are filtered to avoid:
- Titles starting with "Top" or "Best"
- Numbered tip lists ("5 Essential Tips")
- Generic advice compilations
- Retries up to 2 times if listicle detected

## Email Features

### Responsive Design
- Dark/light mode support via `prefers-color-scheme`
- Mobile-friendly layout
- Serif typography for editorial feel
- Favicons and cover images
- Tag links to Raindrop collections

### Content Sections
1. **Your Read Later Digest** - Up to 7 recent bookmarks
2. **Recommended for You** - 5 AI-powered suggestions
3. **Sign-off** - Friendly closing message

## Development Workflow

### Local Development
```bash
cd /Users/gpenston/Projects/raindrop-digest
npm install
npm start  # Runs the digest script
```

### Environment Variables
Located in `.env` (gitignored):
- Raindrop API token and collection IDs
- OpenAI and Perplexity API keys
- iCloud SMTP credentials
- Email addresses

### GitHub Actions
- **Schedule**: Every other day (Mon, Wed, Fri, Sun) at 8:00 AM Pacific (15:00 UTC)
- **Manual trigger**: Available from Actions tab
- **Secrets**: All env vars stored as GitHub repository secrets

## File Structure

```
raindrop-digest/
├── .env                      # Personal credentials (NOT committed)
├── .github/
│   └── workflows/
│       └── digest.yml        # GitHub Actions automation
├── .gitignore                # Ignores .env, node_modules
├── env.example               # Template for .env
├── package.json              # Dependencies
├── raindrop-digest.js        # Main script (500 lines)
├── README.md                 # Public documentation
├── SETUP.md                  # Local development guide
├── TODO.md                   # Task list and roadmap
└── claude.md                 # This file
```

## Dependencies

### Core
- **axios** (^1.6.8) - HTTP client for API calls
- **nodemailer** (^7.0.11) - Email sending via SMTP
- **dayjs** (^1.11.10) - Date formatting
- **dotenv** (^16.3.1) - Environment variable management

### Updates Needed
- axios: 1.13.2 → 1.13.4
- dotenv: 16.6.1 → 17.2.3
- nodemailer: 6.10.1 → 7.0.13

## Common Tasks

### Test Locally
```bash
npm start
```

### Preview Email Without Sending
```javascript
// Temporarily modify raindrop-digest.js:
import { writeFileSync } from 'fs';
writeFileSync('preview.html', html);
console.log('📄 Preview saved');
// Comment out: await sendEmail(html);
```

### Trigger Manual GitHub Actions Run
1. Go to https://github.com/gpenston/raindrop-digest/actions
2. Select "Raindrop Digest" workflow
3. Click "Run workflow"

### Update Dependencies
```bash
npm update
npm audit fix
```

## Important Notes

### Security
- `.env` file contains sensitive credentials (API keys, passwords)
- Must remain gitignored
- GitHub Actions uses repository secrets instead

### Error Handling
- Exponential backoff with 3 retries for all API calls
- Skips 4xx errors (except rate limits) - no retry
- Detailed logging at each step
- Gracefully skips recommendations if AI APIs fail

### Email Delivery
- Uses iCloud SMTP (smtp.mail.me.com:587)
- Requires app-specific password (not regular iCloud password)
- Sends to gpenston@me.com

### Digest Thresholds
- Requires >5 items in Read Later to send
- Fetches up to 7 most recent items
- Archive analyzed for up to 100 items (tag weighting)

## Code Quality Notes

### Strengths
- Excellent error handling and retry logic
- Clear logging throughout execution
- Smart tag grouping to avoid duplicate recommendations
- Listicle filtering for better content quality
- Well-documented with README, SETUP, TODO

### Potential Improvements
1. **Refactor `buildEmailHtml()`** (70 lines)
   - Extract styles to constant
   - Separate item/recommendation rendering
2. **Make API calls concurrent** (lines 432-445)
   - Fetch Read Later and Archive in parallel
3. **Add email preview mode**
   - Save HTML to file for testing
4. **Extract domain/favicon logic** (duplicated)
5. **Add TypeScript** (optional, for type safety)

## AI Recommendation Strategy

### Perplexity (Preferred)
- Model: `sonar-pro`
- Web search capabilities for current articles
- Better at finding recent, substantive content
- Preference for essays, case studies, deep-dives

### OpenAI (Fallback)
- Model: `gpt-4o-mini`
- Cost-effective
- Good general knowledge
- Less effective at finding recent articles

### Content Preferences
- **Prefer**: Thoughtful essays, research papers, cultural criticism, technical deep-dives
- **Avoid**: Listicles, trend forecasts, numbered tips, generic advice
- **Media tags**: Personal essays about games, movies, TV, books
- **Professional tags**: Case studies, technical content
- **Personal tags**: Research-backed analyses, first-person narratives

## Troubleshooting

### No Digest Sent
- Check if >5 items in Read Later collection
- Verify COLLECTION_ID is correct
- Check GitHub Actions logs for errors

### Email Not Arriving
- Verify SMTP credentials in .env
- Check iCloud app-specific password is valid
- Test with `npm start` locally first

### AI Recommendations Failing
- Check API keys are valid and have credits
- Perplexity API status: https://status.perplexity.ai/
- OpenAI API status: https://status.openai.com/
- Script will gracefully skip recommendations on failure

### GitHub Actions Failing
- Verify all secrets are set in repository settings
- Check Actions tab for detailed logs
- Test locally first to ensure code works

## Git Workflow

### Current Status
- **Branch**: main
- **Remote**: origin (https://github.com/gpenston/raindrop-digest.git)
- **User**: gpenston@gmail.com (Personal account)

### Making Changes
```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push origin main

# GitHub Actions will use the updated version
```

## Context for Claude

When working on this project:
1. This is a **personal project** for George, not for public distribution
2. Focus on **reliability** over features - it needs to work consistently
3. **Simplicity** is valued - avoid over-engineering
4. Email formatting is important - George reads these daily
5. AI recommendations should be **substantive**, not clickbait
6. The project is **production-ready** - only suggest improvements, not fixes
7. Any git operations should use **gpenston@gmail.com** (personal account)

## Future Considerations

From TODO.md, potential enhancements:
- Refactor email HTML generation
- Add email preview mode
- Implement read time estimation
- Better recommendation filtering (check for duplicates in Read Later)
- Make SMTP provider flexible (currently hardcoded to iCloud)

---

**Last Updated**: 2026-01-30
**Status**: Production, actively running via GitHub Actions

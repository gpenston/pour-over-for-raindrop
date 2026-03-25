# Pour Over for Raindrop ☕

Your read later bookmarks, brewed fresh and delivered to your inbox. Clean formatting, dark/light mode support, and AI-powered article recommendations. Works as a GitHub Action for automated delivery or run locally.

## ✨ Features

- **📚 Recent Bookmarks**: Pulls up to 7 of your most recent "Read Later" saves
- **🤖 AI Recommendations**: GPT-4 or Perplexity-powered article recommendations based on your archive tags
- **🎨 Beautiful Emails**: Responsive email layout with native dark mode support
- **📱 Mobile Friendly**: Optimized for both macOS Mail and iOS Mail
- **🔄 Fully Automated**: Runs daily via GitHub Actions (or manually)
- **🛡️ Robust Error Handling**: Retry logic with exponential backoff for API calls
- **📊 Rich Metadata**: Includes favicons, cover images, excerpts, tags, and source information

## 📬 Email Preview

Emails are styled to feel like a lightweight editorial newsletter:
- Serif title typography
- Blockquoted summaries
- Clear tags and source metadata
- Responsive design that adapts to light/dark mode
- Friendly sign-off message

## 🚀 Quick Start

### Option 1: GitHub Actions (Recommended)

1. **Fork this repository**
2. **Add repository secrets** (Settings → Secrets and variables → Actions):
   - `RAINDROP_TOKEN` — Get from [Raindrop.io Settings](https://app.raindrop.io/settings/integrations)
   - `COLLECTION_ID` — Find in your collection URL: `https://app.raindrop.io/my/{COLLECTION_ID}`
   - `ARCHIVE_ID` — (optional) ID of an archive collection for generating recommendations
   - `SMTP_USER` — Your iCloud email address
   - `SMTP_PASS` — iCloud app-specific password ([generate here](https://appleid.apple.com/account/manage))
   - `TO_EMAIL` — Where to send the digest
   - `FROM_EMAIL` — From address (same as SMTP_USER for iCloud)
   - `PERPLEXITY_API_KEY` or `OPENAI_API_KEY` — (optional) For AI-powered recommendations
   - `AI_PROVIDER` — (optional) `'openai'` or `'perplexity'` (defaults to `'openai'`)

3. **Push to `main`** — GitHub Actions will automatically send you a daily digest
4. **Manual trigger**: Go to Actions tab → "Pour Over for Raindrop" → "Run workflow"

### Option 2: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pour-over-for-raindrop.git
   cd pour-over-for-raindrop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

4. **Run the script**
   ```bash
   npm start
   ```

See [SETUP.md](./SETUP.md) for detailed local development instructions.

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `RAINDROP_TOKEN` | Raindrop.io API token | [Raindrop.io Settings](https://app.raindrop.io/settings/integrations) |
| `COLLECTION_ID` | Your "Read Later" collection ID | URL: `https://app.raindrop.io/my/{COLLECTION_ID}` |
| `SMTP_USER` | SMTP username (iCloud email) | Your @icloud.com address |
| `SMTP_PASS` | SMTP app-specific password | [Apple ID Management](https://appleid.apple.com/account/manage) |
| `FROM_EMAIL` | From email address | Same as SMTP_USER for iCloud |
| `TO_EMAIL` | Recipient email address | Your email address |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ARCHIVE_ID` | Archive collection ID for recommendations | None |
| `OPENAI_API_KEY` | OpenAI API key for recommendations | None |
| `PERPLEXITY_API_KEY` | Perplexity API key for recommendations | None |
| `AI_PROVIDER` | AI provider: `'openai'` or `'perplexity'` | `'openai'` |

### Customization

You can modify these constants in `pour-over.js`:

- `MAX_ITEMS_TO_SHOW` (default: 7) — Number of recent items to include
- `MIN_ITEMS_THRESHOLD` (default: 5) — Minimum items required to send digest
- `RECOMMENDATIONS_COUNT` (default: 5) — Number of AI recommendations
- `TOP_TAGS_COUNT` (default: 10) — Number of top tags to use for recommendations

## 🕒 Schedule

The GitHub Action runs daily at **8:00 AM Pacific Time** (11:00 AM Eastern, 15:00 UTC) via cron:

```yaml
schedule:
  - cron: '0 15 * * *'
```

To change the schedule, edit `.github/workflows/digest.yml` and modify the cron expression. Use [crontab.guru](https://crontab.guru/) to help create your schedule.

## 🛠️ How It Works

1. **Fetches Recent Bookmarks**: Retrieves your most recent "Read Later" items from Raindrop.io
2. **Analyzes Tags**: (Optional) If `ARCHIVE_ID` is set, analyzes tags from both Read Later and Archive collections
3. **Generates Recommendations**: (Optional) Uses AI to find relevant articles based on your interests
4. **Builds Email**: Creates a beautifully formatted HTML email with all content
5. **Sends Digest**: Delivers the email via SMTP (iCloud Mail)

## 🔧 Troubleshooting

### Email Not Sending

- Verify SMTP credentials in your `.env` file or GitHub secrets
- Ensure you're using an app-specific password (not your regular iCloud password)
- Check that `FROM_EMAIL` and `TO_EMAIL` are set correctly
- Test SMTP connection: The script will verify the connection before sending

### No Items in Digest

- The script requires at least 5 items in your Read Later collection (configurable via `MIN_ITEMS_THRESHOLD`)
- Check that `COLLECTION_ID` matches your actual Read Later collection
- Verify your `RAINDROP_TOKEN` is valid and has access to the collection

### Recommendations Not Working

- Ensure either `OPENAI_API_KEY` or `PERPLEXITY_API_KEY` is set
- Verify `ARCHIVE_ID` is set if you want tag-based recommendations
- Check API key validity and billing status
- The script will gracefully skip recommendations if APIs fail

### GitHub Actions Failing

- Verify all required secrets are set in repository settings
- Check the Actions tab for detailed error logs
- Test locally first: `npm start` to ensure code works
- Ensure Node.js version in workflow matches your local version

## 📁 Project Structure

```
pour-over-for-raindrop/
├── .github/
│   └── workflows/
│       └── digest.yml        # GitHub Actions automation
├── .env                      # Your secrets (gitignored)
├── env.example               # Template for .env
├── package.json              # Dependencies and scripts
├── pour-over.js              # Main script
├── README.md                 # This file
├── SETUP.md                  # Detailed setup guide
└── TODO.md                   # Development roadmap
```

## 🧪 Development

### Running Locally

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Edit .env with your credentials
# Then run:
npm start
```

### Testing Without Sending Email

You can modify the script to save HTML to a file instead of sending:

```javascript
// In pour-over.js, comment out:
// await sendEmail(html);

// Add instead:
import { writeFileSync } from 'fs';
writeFileSync('preview.html', html);
console.log('Preview saved to preview.html');
```

## 📝 License

This project is for personal use. Feel free to fork and modify for your own needs.

## 🙏 Acknowledgments

- [Raindrop.io](https://raindrop.io/) for the bookmarking API
- [OpenAI](https://openai.com/) and [Perplexity](https://www.perplexity.ai/) for AI recommendations
- Built with Node.js, Axios, Nodemailer, and Day.js

---

**Made with ❤️ for better bookmark management**

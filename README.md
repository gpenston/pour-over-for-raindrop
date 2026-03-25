# Pour Over for Raindrop ☕

Your read later bookmarks, brewed fresh and delivered to your inbox. Clean formatting, dark/light mode support, and AI-powered article recommendations. Works as a GitHub Action for automated delivery or run locally.

## ✨ Features

- **📚 Recent Bookmarks**: Pulls up to 7 of your most recent "Read Later" saves
- **🤖 Smart Recommendations**: NewsAPI-powered article recommendations based on your archive tags
- **🎨 Beautiful Emails**: Responsive email layout with native dark mode support
- **📱 Mobile Friendly**: Optimized for both macOS Mail and iOS Mail
- **🔄 Fully Automated**: Runs on a configurable schedule via GitHub Actions (or manually)
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
   - `SMTP_USER` — Your email address (login for your SMTP provider)
   - `SMTP_PASS` — Your SMTP password or app-specific password
   - `TO_EMAIL` — Where to send the digest
   - `FROM_EMAIL` — From address (usually same as SMTP_USER)
   - `NEWS_API_KEY` — (optional, recommended) Free key from [newsapi.org](https://newsapi.org/register) for article recommendations

   > **Note:** The default SMTP configuration uses iCloud Mail (`smtp.mail.me.com`). To use Gmail, Outlook, or another provider, also set `SMTP_HOST` and `SMTP_PORT` secrets. See [Email Providers](#-email-providers) below.

3. **Push to `main`** — GitHub Actions will automatically run on the configured schedule
4. **Manual trigger**: Go to Actions tab → "Pour Over for Raindrop" → "Run workflow"

### Option 2: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pour-over-for-raindrop.git
   cd pour-over-for-raindrop
   ```

2. **Install dependencies** *(local testing only — not needed for GitHub Actions)*
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
| `SMTP_USER` | SMTP login (your email address) | Your email provider |
| `SMTP_PASS` | SMTP password or app-specific password | Your email provider |
| `FROM_EMAIL` | From email address | Usually same as SMTP_USER |
| `TO_EMAIL` | Recipient email address | Your email address |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ARCHIVE_ID` | Archive collection ID for tag-based recommendations | None |
| `NEWS_API_KEY` | NewsAPI key for recommendations (free at [newsapi.org](https://newsapi.org)) | None |
| `DIGEST_SCHEDULE` | When to send: `daily`, `weekly`, or day names like `mon,wed,fri` | `weekly` (Sunday) |
| `DIGEST_TIME` | Time of day: `morning`, `noon`, or `night` | `morning` (8am PT) |
| `SMTP_HOST` | SMTP server hostname | `smtp.mail.me.com` (iCloud) |
| `SMTP_PORT` | SMTP server port | `587` |

### Customization

You can modify these constants in `pour-over.js`:

- `MAX_ITEMS_TO_SHOW` (default: 7) — Number of recent items to include
- `MIN_ITEMS_THRESHOLD` (default: 5) — Minimum items required to send digest
- `RECOMMENDATIONS_COUNT` (default: 5) — Number of AI recommendations
- `TOP_TAGS_COUNT` (default: 10) — Number of top tags to use for recommendations

## 🕒 Schedule

No cron editing required. Set two GitHub secrets to control when your digest arrives:

| Secret | Options | Default |
|--------|---------|---------|
| `DIGEST_SCHEDULE` | `daily`, `weekly`, `monday`, `mon,wed,fri`, `tue-thu`, `sat,sun` | `weekly` (Sunday) |
| `DIGEST_TIME` | `morning` (8am PT), `noon` (12pm PT), `night` (8pm PT) | `morning` |

**Examples:**
- Every weekday morning → `DIGEST_SCHEDULE=mon,tue,wed,thu,fri` + `DIGEST_TIME=morning`
- Tuesday and Thursday at noon → `DIGEST_SCHEDULE=tue,thu` + `DIGEST_TIME=noon`
- Daily at night → `DIGEST_SCHEDULE=daily` + `DIGEST_TIME=night`
- Just Sundays in the morning (default) → no secrets needed

## 🛠️ How It Works

1. **Fetches Recent Bookmarks**: Retrieves your most recent "Read Later" items from Raindrop.io
2. **Analyzes Tags**: (Optional) If `ARCHIVE_ID` is set, analyzes tags from both Read Later and Archive collections
3. **Generates Recommendations**: (Optional) Finds related articles via NewsAPI based on your top tags
4. **Builds Email**: Creates a beautifully formatted HTML email with all content
5. **Sends Digest**: Delivers the email via SMTP

## 🔧 Troubleshooting

### Email Not Sending

- Verify SMTP credentials in your `.env` file or GitHub secrets
- Many providers require an app-specific password rather than your regular account password
- Check that `FROM_EMAIL` and `TO_EMAIL` are set correctly
- If using a non-iCloud provider, make sure `SMTP_HOST` and `SMTP_PORT` are set correctly
- Test SMTP connection: The script will verify the connection before sending

### No Items in Digest

- The script requires at least 5 items in your Read Later collection (configurable via `MIN_ITEMS_THRESHOLD`)
- Check that `COLLECTION_ID` matches your actual Read Later collection
- Verify your `RAINDROP_TOKEN` is valid and has access to the collection

### Recommendations Not Working

- Ensure both `ARCHIVE_ID` and `NEWS_API_KEY` are set
- Recommendations are based on your archive tags — no archive collection means no recommendations
- Get a free NewsAPI key at [newsapi.org](https://newsapi.org/register)
- The script will gracefully skip recommendations if NewsAPI fails

### GitHub Actions Failing

- Verify all required secrets are set in repository settings
- Check the Actions tab for detailed error logs
- Test locally first: `npm start` to ensure code works
- Ensure Node.js version in workflow matches your local version

## 📨 Email Providers

By default, Pour Over uses **iCloud Mail**. To use a different provider, set `SMTP_HOST` and `SMTP_PORT` in your `.env` file (local) or as GitHub secrets (Actions).

| Provider | `SMTP_HOST` | `SMTP_PORT` | Notes |
|----------|-------------|-------------|-------|
| **iCloud** *(default)* | `smtp.mail.me.com` | `587` | Requires [app-specific password](https://appleid.apple.com/account/manage) |
| **Gmail** | `smtp.gmail.com` | `587` | Requires [app password](https://myaccount.google.com/apppasswords) (2FA must be on) |
| **Outlook / Hotmail** | `smtp-mail.outlook.com` | `587` | Use your full email as `SMTP_USER` |
| **Yahoo Mail** | `smtp.mail.yahoo.com` | `587` | Requires [app password](https://login.yahoo.com/account/security) |
| **Fastmail** | `smtp.fastmail.com` | `587` | Use your full email as `SMTP_USER` |

> **Note:** Most providers require an app-specific password (not your regular login password). Check your email provider's security settings to generate one.

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

> **Note:** `npm install` is only required for local testing. GitHub Actions handles dependencies automatically.

```bash
# Install dependencies (local only)
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
- [NewsAPI](https://newsapi.org/) for article recommendations
- Built with Node.js, Axios, Nodemailer, and Day.js

---

**Made with ❤️ for better bookmark management**

# Local Development Setup

> **Note:** `npm install` and a local `.env` file are only needed for local testing. GitHub Actions handles all of this automatically via repository secrets.

## Quick Start

### 1. Install Node.js

**Option A: Using Homebrew (Recommended)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify installation
node --version  # Should show v20.x or higher
npm --version   # Should show v10.x or higher
```

**Option B: Download from nodejs.org**
- Visit https://nodejs.org/
- Download the LTS version (Long Term Support)
- Run the installer
- Restart your terminal

### 2. Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/yourusername/pour-over-for-raindrop.git
cd pour-over-for-raindrop

# Install dependencies (local testing only)
npm install

# This creates node_modules/ and package-lock.json
```

### 3. Configure Environment Variables

```bash
# Copy the example file
cp env.example .env

# Edit .env with your actual values
# You can use any text editor, like:
open -a TextEdit .env
```

**Required values:**
- `RAINDROP_TOKEN` - Get from https://app.raindrop.io/settings/integrations
- `COLLECTION_ID` - Find in URL: https://app.raindrop.io/my/[THIS_NUMBER]
- `SMTP_USER` - Your email address (login for your SMTP provider)
- `SMTP_PASS` - App-specific password (see env.example for provider-specific instructions)
- `FROM_EMAIL` - Same as SMTP_USER
- `TO_EMAIL` - Where to send the digest

**Optional values:**
- `SMTP_HOST` - SMTP server (defaults to iCloud: smtp.mail.me.com)
- `SMTP_PORT` - SMTP port (defaults to 587)
- `ARCHIVE_ID` - Another collection for recommendation tags
- `NEWS_API_KEY` - Free key from https://newsapi.org/register for article recommendations
- `SMTP_HOST` - SMTP server hostname (default: `smtp.mail.me.com` for iCloud)
- `SMTP_PORT` - SMTP server port (default: `587`)
- `SMTP_SECURE` - Use TLS, set to `true` for port 465 (default: `false`)

### 4. Test Locally

```bash
# Run the script
npm start

# You should see output like:
# ✅ Environment variables validated
# 🔑 CONFIG: { COLLECTION_ID: '...', ... }
# 🔍 Fetching items from ...
# 📧 Sent
```

## Email Provider Configuration

By default, Pour Over uses iCloud Mail. To use Gmail, Outlook, or another provider, set `SMTP_HOST` and `SMTP_PORT` in your `.env`:

| Provider | `SMTP_HOST` | `SMTP_PORT` | Notes |
|----------|-------------|-------------|-------|
| **iCloud** *(default)* | `smtp.mail.me.com` | `587` | Requires [app-specific password](https://appleid.apple.com/account/manage) |
| **Gmail** | `smtp.gmail.com` | `587` | Requires [app password](https://myaccount.google.com/apppasswords) (2FA must be on) |
| **Outlook / Hotmail** | `smtp-mail.outlook.com` | `587` | Use your full email as `SMTP_USER` |
| **Yahoo Mail** | `smtp.mail.yahoo.com` | `587` | Requires [app password](https://login.yahoo.com/account/security) |
| **Fastmail** | `smtp.fastmail.com` | `587` | Use your full email as `SMTP_USER` |

## Development Workflow

### Making Changes

1. Edit `pour-over.js` locally using Cursor
2. Test changes: `npm start`
3. Commit and push to GitHub
4. GitHub Actions will use the updated version

### Debugging

If something fails locally:
- Check `.env` file has all required values
- Verify your Raindrop token is valid
- Check your app-specific password for your email provider
- Look for error messages in the console

### Testing Email Without Sending

If you want to preview the email HTML without sending:

```javascript
// Temporarily comment out in pour-over.js:
// await sendEmail(html);

// Add this instead:
import { writeFileSync } from 'fs';
writeFileSync('preview.html', html);
console.log('Preview saved to preview.html');
```

Then open `preview.html` in your browser to see what the email looks like.

## GitHub Actions Configuration

### Setting Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each variable from your `.env` file:
   - `RAINDROP_TOKEN`
   - `COLLECTION_ID`
   - `ARCHIVE_ID` (optional)
   - `NEWSAPI_KEY` (optional, recommended)
   - `DIGEST_SCHEDULE` (optional, e.g. `weekly`, `daily`, `mon,wed,fri`)
   - `DIGEST_TIME` (optional, e.g. `morning`, `noon`, `night`)
   - `SMTP_USER`
   - `SMTP_PASS`
   - `FROM_EMAIL`
   - `TO_EMAIL`
   - `SMTP_HOST` (optional, for non-iCloud providers)
   - `SMTP_PORT` (optional, for non-iCloud providers)

### Testing GitHub Actions

After pushing your changes:
1. Go to Actions tab in GitHub
2. Select "Pour Over for Raindrop"
3. Click "Run workflow" (manual trigger)
4. Watch it run and check for errors

### Schedule

No cron editing needed. Set these two secrets in your repo to control timing:

- `DIGEST_SCHEDULE` — `daily`, `weekly` (default, Sunday), or specific days like `mon,wed,fri` or `tue-thu`
- `DIGEST_TIME` — `morning` (8am PT, default), `noon` (12pm PT), or `night` (8pm PT)

## Troubleshooting

### "npm: command not found"
- Node.js isn't installed or not in PATH
- Restart terminal after installing
- Try: `which node` to see if it's installed

### "Cannot find module 'dotenv'"
- Dependencies not installed
- Run: `npm install`

### Email not sending
- Check SMTP credentials in `.env`
- Verify app-specific password (not your regular password)
- If using a non-iCloud provider, confirm `SMTP_HOST` and `SMTP_PORT` are correct
- Test with: `npm start` and check console output

### Recommendations not showing
- Ensure both `ARCHIVE_ID` and `NEWS_API_KEY` are set
- Get a free key at [newsapi.org](https://newsapi.org/register)

### No items to send
- Script requires >5 items in your Read Later collection
- Add more bookmarks to Raindrop.io
- Or lower `MIN_ITEMS_THRESHOLD` in the code

### GitHub Actions failing
- Check secrets are set correctly in repo settings
- Look at the Actions tab for error logs
- Test locally first to ensure code works

## Next Steps

Now that you're set up:
- [ ] Test the script runs successfully locally
- [ ] Push changes to GitHub
- [ ] Set up GitHub repository secrets
- [ ] Test manual GitHub Actions run
- [ ] Wait for the scheduled run!

## File Structure

```
pour-over-for-raindrop/
├── .github/
│   └── workflows/
│       └── digest.yml        # GitHub Actions automation
├── .gitignore                # Ignore node_modules, .env, etc.
├── .env                      # Your secrets (DO NOT COMMIT)
├── env.example               # Template for .env
├── package.json              # Dependencies
├── package-lock.json         # Locked dependency versions
├── pour-over.js              # Main script
├── README.md                 # Project overview
├── TODO.md                   # Task list
└── SETUP.md                  # This file
```

# Pour Over for Raindrop - TODO
*Personal project - prioritized for solo use & GitHub Actions deployment*

---

## 🔴 Critical - Prevents Failures

- [x] **Create GitHub Actions workflow** ✅ DONE
  - Add `.github/workflows/digest.yml`
  - Configure cron schedule for daily runs
  - Set up secrets in GitHub repo settings
  - Includes manual trigger for testing

- [x] **Fix unsafe JSON parsing from OpenAI** ✅ DONE
  - OpenAI sometimes wraps JSON in ```json...``` code blocks
  - Added extraction logic to handle this
  - Wrapped in try-catch with fallback

- [x] **Add safe URL parsing** ✅ DONE
  - `new URL(it.link)` wrapped in try-catch
  - Logs warning and gracefully handles bad URLs
  - Prevents crashes on invalid URLs

- [x] **Add environment variable validation** ✅ DONE
  - Check required vars exist at startup
  - Fail fast with clear error message
  - Makes GitHub Actions failures easier to debug

- [x] **Validate API responses** ✅ DONE
  - Check `data.items` exists before accessing
  - Raindrop API validated with error handling
  - Prevents cryptic "cannot read property of undefined" errors

## 🟡 High Priority - Quality of Life

- [x] **Fix README-Code mismatch** ✅ DONE
  - Removed mentions of unimplemented features
  - Updated to accurately describe 7 latest items
  - Clarified AI recommendations functionality
  - README now matches actual implementation

- [x] **Replace magic numbers with constants** ✅ DONE
  - Define `MAX_ITEMS_TO_SHOW = 7` at top of file
  - Define `ARCHIVE_FETCH_LIMIT = 100`
  - Define `TOP_TAGS_COUNT = 10`
  - Define `RECOMMENDATIONS_COUNT = 5`
  - Define `MIN_ITEMS_THRESHOLD = 5`
  - Added retry constants too

- [x] **Add retry logic for API calls** ✅ DONE
  - Implemented exponential backoff with 3 retries
  - Applied to Raindrop API, OpenAI API, and SMTP
  - Smart retry: skips 4xx errors (except rate limits)
  - Detailed logging for each retry attempt
  - Would prevent missed digests from temporary issues

- [x] **Better error messages** ✅ DONE
  - Added context about which API call failed
  - Include status codes and response snippets
  - Clear logging at each step
  - Makes debugging GitHub Actions failures easier

## 🟢 Medium Priority - Nice Improvements

- [x] **Consider local development setup** ✅ READY
  - `.gitignore` already exists and properly configured
  - `SETUP.md` has comprehensive local dev instructions
  - `package-lock.json` now tracked in git
  - Ready to develop locally with Cursor!

- [x] **Upgrade OpenAI model** ✅ DONE
  - Changed from `gpt-3.5-turbo` to `gpt-4o-mini`
  - Better recommendations quality
  - More cost-effective than GPT-4

- [ ] **Refactor `buildEmailHtml` function**
  - Currently 70 lines in one function
  - Extract item/recommendation rendering
  - Extract styles to constant
  - Makes customizing email layout easier

- [ ] **Add email preview mode**
  - Save HTML to file instead of sending
  - Test email layout changes without spam
  - Add `--preview` CLI flag or env var

## 🔵 Maybe Someday - Future Features

- [ ] **Implement read time estimation**
  - Since README mentions it
  - Calculate based on excerpt word count (200-250 wpm avg)
  - Display in email metadata

- [ ] **Add GPT summaries to items**
  - Generate summary for each bookmark (costs more tokens)
  - Add to email as blockquotes
  - Could optionally update Raindrop notes field via API

- [ ] **Implement random article selection**
  - Mix recent items with older random ones
  - Match README description (3-5 recent + 2 random)
  - More variety in daily digest

- [ ] **Improve recommendation quality**
  - Currently recommendations can be hit-or-miss
  - Better prompt engineering
  - Filter out duplicates already in Read Later
  - Include context from archive item descriptions

## 📦 If Making Public Someday

*Skip these for now - only needed if you decide to open-source*

- [ ] **Add comprehensive documentation**
  - Setup screenshots (Raindrop token, collection IDs, iCloud SMTP)
  - Troubleshooting section
  - Email layout examples/screenshots

- [ ] **Make SMTP provider flexible**
  - Support Gmail, Outlook, etc.
  - Currently hardcoded to iCloud (fine for you)
  - Add env vars for SMTP_HOST and SMTP_PORT

- [ ] **Add tests**
  - Unit tests for core functions
  - Not worth the overhead for personal project

- [ ] **Security hardening**
  - Input sanitization for HTML content
  - Rate limiting awareness
  - Dependency vulnerability scanning
  - (Less critical since you control all inputs)

- [ ] **Create `.env.example`**
  - Template for other users
  - Not needed since you're the only user

---

## 🎯 Next Steps - Ready to Deploy!

### **All Critical & High Priority Items Complete!** ✅

The script is now production-ready with:
- ✅ GitHub Actions workflow configured
- ✅ Robust error handling and retry logic
- ✅ Environment validation
- ✅ Accurate documentation
- ✅ Local development ready

### **To Deploy:**
1. **Commit and push** all changes to GitHub
2. **Add secrets** in GitHub repo Settings → Secrets and variables → Actions:
   - `RAINDROP_TOKEN`
   - `COLLECTION_ID`
   - `ARCHIVE_ID` (optional)
   - `OPENAI_API_KEY` (optional)
   - `SMTP_USER`
   - `SMTP_PASS`
   - `FROM_EMAIL`
   - `TO_EMAIL`
3. **Test manually** from Actions tab → "Pour Over for Raindrop" → "Run workflow"
4. **Check your email!** 📧

### **Or Test Locally First:**
1. Copy `env.example` to `.env`
2. Fill in your credentials
3. Run `npm install`
4. Run `npm start`
5. Verify email arrives

## 🚀 Quick Wins ✅ ALL COMPLETE!

These high-impact fixes are now done:

- [x] **Add GitHub Actions workflow** ✅ - Automation ready!
- [x] **Add URL try-catch** ✅ - Prevents crashes on bad URLs
- [x] **Replace magic numbers** ✅ - Easy to tweak behavior
- [x] **Fix README** ✅ - Accurate documentation
- [x] **Wrap JSON.parse** ✅ - Handles OpenAI code blocks
- [x] **BONUS: Add retry logic** ✅ - Resilient against transient failures

**The script is now production-ready!**

---

## 💡 Questions for Future Iterations

1. **Are you happy with 7 latest items?** (Or want the 3-5 recent + 2 random approach?)
2. **Do you actually want item summaries?** (Would cost more OpenAI tokens per run)
3. **Are recommendations working well?** (Could improve prompt engineering if needed)
4. **Want email preview mode?** (Test layouts without sending emails)


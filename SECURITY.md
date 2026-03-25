# Security

## Credential Handling

This project requires several API keys and credentials. Handle them carefully:

### What NOT to Commit

Never commit these to version control:
- `.env` file (contains your credentials)
- API keys (Raindrop, OpenAI, Perplexity)
- SMTP passwords
- Any app-specific passwords

The `.gitignore` file is configured to exclude `.env`, but always double-check before committing.

### GitHub Actions Secrets

When using GitHub Actions, store credentials as repository secrets:
1. Go to Settings > Secrets and variables > Actions
2. Add each credential as a secret
3. Secrets are encrypted and not visible in logs

### API Key Scopes

Use minimal permissions where possible:
- **Raindrop.io**: Read-only access is sufficient for this project
- **OpenAI/Perplexity**: Standard API access
- **SMTP**: Use app-specific passwords, not your main account password

## If Credentials Are Compromised

If you accidentally expose credentials:

1. **Raindrop.io**: Regenerate your API token at https://app.raindrop.io/settings/integrations
2. **OpenAI**: Rotate your API key at https://platform.openai.com/api-keys
3. **Perplexity**: Rotate your API key at https://www.perplexity.ai/settings/api
4. **iCloud**: Revoke the app-specific password at https://appleid.apple.com/account/manage
5. **Gmail**: Revoke the app password in your Google Account security settings

## Known Considerations

### Email Content

- Bookmark titles and excerpts from Raindrop.io are included in emails
- AI-generated recommendation titles are included
- All user-controlled content is HTML-escaped to prevent injection

### Data Flow

- Your Raindrop.io bookmarks are fetched via API (read-only)
- Bookmark titles are sent to AI providers for recommendation context
- Emails are sent via your configured SMTP provider
- No data is stored or logged beyond the current execution

## Reporting Security Issues

If you discover a security vulnerability, please open an issue or contact the maintainer directly. We appreciate responsible disclosure.

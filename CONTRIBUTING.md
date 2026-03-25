# Contributing to Raindrop Digest

Thanks for your interest in contributing! This is a straightforward project, and contributions are welcome.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/raindrop-digest.git`
3. Install dependencies: `npm install`
4. Copy `env.example` to `.env` and fill in your credentials
5. Test locally: `npm start`

## Project Philosophy

This project values **simplicity over complexity**:

- **Single file design** - The entire script lives in `raindrop-digest.js` (~500 lines). This is intentional. Don't split it into modules unless there's a very compelling reason.
- **Minimal dependencies** - Only add dependencies if absolutely necessary.
- **No TypeScript** - Plain JavaScript is fine for this scale.
- **No tests** - The project is simple enough that manual testing is sufficient.

## Making Changes

### Before You Start

- Check existing issues to see if your idea has been discussed
- For major changes, open an issue first to discuss the approach

### Code Style

- Use ES Modules (`import`/`export`)
- Use `async/await` for asynchronous operations
- Use emoji prefixes in console logs for visual scanning
- Keep functions focused and reasonably sized

### Submitting Changes

1. Create a branch for your changes
2. Make your changes
3. Test locally with `npm start`
4. Commit with a clear message describing what and why
5. Push to your fork
6. Open a Pull Request

### Pull Request Guidelines

- Keep PRs focused on a single change
- Describe what the change does and why
- Include any relevant testing you've done
- Be open to feedback and iteration

## Types of Contributions

### Especially Welcome

- Bug fixes
- Documentation improvements
- SMTP provider guides and examples
- Email template improvements
- Better error messages

### Please Discuss First

- New features that add complexity
- Changes to the core workflow
- Adding new dependencies
- Significant refactoring

## Questions?

Open an issue if you have questions about contributing.

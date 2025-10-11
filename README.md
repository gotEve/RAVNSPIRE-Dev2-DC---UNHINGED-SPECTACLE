# RAVNSPIRE Discord Bot

A Discord bot for the RAVNSPIRE community with automated deployment via GitHub Actions.

## Features

- 🤖 Discord.js v14 integration
- ⚡ Automated deployment with GitHub Actions
- 🔧 Slash command support
- 🛡️ Environment-based configuration
- 📊 PM2 process management

## Quick Start

1. Clone this repository
2. Copy `.env.example` to `.env` and add your bot token
3. Run `npm install` to install dependencies
4. Run `node index.js` to start the bot locally

## Environment Variables

Create a `.env` file with the following variables:

```bash
DISCORD_TOKEN=your_discord_bot_token_here
```

Get your bot token from the [Discord Developer Portal](https://discord.com/developers/applications).

## Deployment

This bot uses GitHub Actions for automated deployment:

- **Trigger**: Push to main branch
- **Server**: Oracle Cloud Infrastructure
- **Process Manager**: PM2
- **Auto-restart**: On deployment

## Commands

- `/ping` - Test bot connectivity
- `/server` - Display server information
- `/user` - Display user information

## Security

- ✅ Environment variables for sensitive data
- ✅ GitHub Secrets for deployment credentials
- ✅ Private documentation excluded from version control
- ✅ Minimal Discord bot permissions

**Never commit your `.env` file or private documentation to version control.**

## Development

### Local Development
```bash
npm install
node index.js
```

### Deploy Commands
```bash
node deploy-commands.js
```

### PM2 Management (Production)
```bash
pm2 status
pm2 logs ravnspire-bot
pm2 restart ravnspire-bot
```

## Contributing

1. Make your changes
2. Test locally
3. Commit and push to main branch
4. GitHub Actions will automatically deploy

## License

ISC License - See package.json for details
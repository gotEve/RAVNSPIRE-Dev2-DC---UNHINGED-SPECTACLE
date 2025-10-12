# RAVNSPIRE Discord Bot

A comprehensive Discord bot for the RAVNSPIRE community featuring games, guild management, achievements, and automated deployment.

## 🟢 **CURRENT STATUS: FULLY OPERATIONAL**

- ✅ **Bot Online**: RavnSpire#0606 connected to Discord
- ✅ **All Commands Working**: 34 slash commands deployed and functional
- ✅ **Database Connected**: PostgreSQL with full schema
- ✅ **Automated Deployment**: GitHub Actions working perfectly
- ✅ **All Features Active**: Games, guilds, achievements, lore management

**Last Updated**: October 12, 2025 | **Version**: Production Ready

## 🎮 Features

### Core Functionality
- 🤖 Discord.js v14 integration with slash commands
- 🎯 Multiple game types (Tetris, Tic Tac Toe)
- 🏰 Guild system with wars and competitions
- 🏆 Achievement system with rewards
- 📚 Lore management system (admin-only)
- 🏘️ Neighborhood system for inter-guild interaction

### Infrastructure
- ⚡ Automated deployment with GitHub Actions
- 🛡️ Advanced security and anti-cheat systems
- 📊 PostgreSQL database with SQLite fallback
- 🔧 PM2 process management
- 🚀 Oracle Cloud Infrastructure hosting

## 🚀 Quick Start

### Local Development
1. Clone this repository
2. Create `.env` file with required variables (see Environment Variables)
3. Run `npm install` to install dependencies
4. Run `node database/setup.js` to initialize database
5. Run `node index.js` to start the bot locally

### Production Deployment
✅ **FULLY AUTOMATED** - The bot automatically deploys when you push to the main branch via GitHub Actions.

**Current Status**: Bot is live and operational with all features working!

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ravnspire

# Environment
NODE_ENV=development
```

Get your bot token and client ID from the [Discord Developer Portal](https://discord.com/developers/applications).

## 🎮 Available Commands

### ✅ **Currently Working Commands**

#### Basic Commands
- `/ping` - Test bot connectivity
- `/server` - Display server information  
- `/user` - Display user information

#### Game Commands
- `/games-play` - Start playing a game (Tetris, Tic Tac Toe)
- `/test-games` - Test the games system
- `/games-leaderboard` - View game leaderboards
- `/games-stats` - View game statistics

#### Profile Commands
- `/profile` - View your profile
- `/profile-edit` - Edit your profile
- `/profile-stats` - View detailed statistics
- `/profile-badges` - View your badges

#### Guild Commands
- `/guild-create` - Create a new guild
- `/guild-join` - Join a guild
- `/guild-info` - View guild information
- `/guild-leaderboard` - View guild rankings
- `/guild-wars` - Manage guild wars
- `/guild-competitions` - Guild competitions

#### Neighborhood Commands
- `/neighborhood-join` - Join a neighborhood
- `/neighborhood-info` - View neighborhood info
- `/neighborhood-vote` - Vote on proposals
- `/neighborhood-defense` - Manage defenses

#### Achievement Commands
- `/achievements` - View available achievements
- `/achievements-progress` - View your progress
- `/achievements-recent` - Recent achievements

#### Admin Commands
- `/lore-manage` - Manage lore entries (Administrator only)

#### Community Commands
- `/community-stats` - View community statistics
- `/help` - Get help with commands

## 🗄️ Database

The bot uses a hybrid database system:
- **Production**: PostgreSQL
- **Development**: SQLite (fallback)

### Database Setup
```bash
# Initialize database schema and data
node database/setup.js

# Clear lore entries (if needed)
node database/clear-lore.js
```

## 🚀 Deployment

### ✅ **Automated Deployment (WORKING)**
- **Trigger**: Push to main branch
- **Server**: Oracle Cloud Infrastructure (150.136.123.137)
- **Process Manager**: PM2
- **Auto-restart**: On deployment
- **Secrets**: Uses GitHub Secrets (ORACLE_HOST, ORACLE_USERNAME, ORACLE_SSH_KEY)
- **Status**: ✅ **FULLY OPERATIONAL** - All deployments working perfectly

### Manual Deployment (If Needed)
```bash
# On production server
cd ~/discord-bots/ravnspire
git pull origin main
npm install
node deploy-commands.js
pm2 restart ravnspire-bot
```

### 🔧 **Deployment Troubleshooting**
- **Issue**: Commands not showing in Discord
- **Solution**: Run `node deploy-commands.js` manually to refresh commands
- **Issue**: Bot offline after deployment
- **Solution**: Check Discord intents in Developer Portal

## 🛡️ Security Features

### Anti-Cheat System
- Rate limiting and cooldowns
- Score validation and game duration checks
- Rapid-fire detection and win streak monitoring
- Session tokens and user status tracking
- Audit logging and real-time validation
- Suspicious activity flagging
- Behavioral pattern analysis

### Security Best Practices
- ✅ Environment variables for sensitive data
- ✅ GitHub Secrets for deployment credentials
- ✅ Private documentation excluded from version control
- ✅ Minimal Discord bot permissions
- ✅ Comprehensive audit logging

**Never commit your `.env` file or private documentation to version control.**

## 🧪 Testing

### Security Tests
```bash
# Run security tests with mock database
node tests/runTestsMock.js

# Run system verification
node scripts/verifySystem.js
```

## 📁 Project Structure

```
RAVNSPIRE-Dev2-DC---UNHINGED-SPECTACLE/
├── .github/workflows/          # GitHub Actions
├── commands/                   # Discord slash commands
│   ├── admin/                  # Admin-only commands
│   ├── games/                  # Game-related commands
│   ├── guild/                  # Guild management
│   └── neighborhood/           # Neighborhood system
├── database/                   # Database files
│   ├── db.js                   # Database connection
│   ├── schema.sql              # PostgreSQL schema
│   └── setup.js                # Database initialization
├── games/                      # Game implementations
│   ├── engine/                 # Game engine
│   └── types/                  # Specific game types
├── utils/                      # Utility functions
│   ├── securityCore.js         # Security system
│   └── databaseCore.js         # Database abstraction
├── tests/                      # Test suites
└── scripts/                    # Utility scripts
```

## 🔧 Development

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

## 📋 Contributing

1. Make your changes
2. Test locally using the test suites
3. Commit and push to main branch
4. GitHub Actions will automatically deploy

## 📄 License

ISC License - See package.json for details
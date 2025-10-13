# 🚀 RAVNSPIRE BOT - QUICK REFERENCE GUIDE

## 📋 **ESSENTIAL COMMANDS**

### **🎮 Player Commands**
```bash
# Get started
/faction create [name] [faction]    # Create your first character
/games list                         # See available games
/games play [game]                  # Start playing
/profile view                       # View your profile

# Social features
/marry propose [user] [type]        # Propose marriage
/affection interact [partner]       # Build relationships
/children attempt [partner]         # Try for children
/plot buy [neighborhood] [size]     # Buy a home

# Progression
/stats global                       # View your statistics
/stats variety                      # Check variety bonus
/resources view                     # Check your resources
/achievements view                  # See available achievements
```

### **👑 Admin Commands**
```bash
# Balance management
/admin-balance view                 # View current balance settings
/admin-balance set [game] [setting] [value]  # Adjust rewards

# Anti-cheat monitoring
/anti-cheat stats [days]            # View anti-cheat statistics
/anti-cheat validate-user [user]    # Manually validate user
/anti-cheat logs [user] [limit]     # Review user logs

# Arena management
/crucible-admin create-competition [type] [game]  # Create competition
/crucible-admin start-boss-raid [boss] [health]   # Start boss raid

# Content management
/admin-lore add [entry_id] [title] [content]      # Add lore entry
/admin-lore update [entry_id] [field] [value]     # Update lore
```

---

## 🗄️ **DATABASE QUICK REFERENCE**

### **Key Tables**
```sql
-- Core user data
users, user_profiles, player_characters, player_factions

-- Social systems
marriages, marriage_participants, relationship_affection, children

-- Housing & governance
neighborhoods, residential_plots, plot_occupants, neighborhood_proposals

-- Guild systems
guilds, guild_members, guild_district_plots, guild_upgrades

-- Arena & competitions
arena_competitions, arena_matches, arena_leaderboards, arena_events

-- Resources & economy
player_resources, resource_consumption_log, faction_resources

-- Security & anti-cheat
anti_cheat_logs, resource_transfers, security_flags

-- Global stats & progression
player_global_stats, game_variety_log, achievements, user_achievements
```

### **Common Queries**
```sql
-- Get user's active character
SELECT * FROM player_characters WHERE discord_id = ? AND is_active = true;

-- Check user's resources
SELECT * FROM player_resources WHERE discord_id = ?;

-- Get user's marriage status
SELECT m.* FROM marriages m 
JOIN marriage_participants mp ON m.id = mp.marriage_id 
JOIN player_characters pc ON mp.character_id = pc.id 
WHERE pc.discord_id = ? AND m.status = 'active';

-- View user's global stats
SELECT * FROM player_global_stats WHERE discord_id = ?;
```

---

## 🛠️ **DEVELOPMENT QUICK START**

### **Local Setup**
```bash
# Clone and setup
git clone [repository]
cd RAVNSPIRE-Dev2-DC---UNHINGED-SPECTACLE
npm install

# Database setup
node database/setup.js                    # PostgreSQL
node database/sqlite-setup.js             # SQLite fallback

# Import lore
node database/import-lore-codex.js

# Start development
node index.js
```

### **Testing**
```bash
# Run comprehensive tests
node tests/qc-core-systems.js

# Test specific systems
node tests/test-faction-system.js
node tests/test-marriage-family-system.js
node tests/test-arena-system.js
node tests/test-guild-district.js
node tests/test-residential-plots.js
node tests/test-neighborhood-governance.js
node tests/test-resource-system.js
node tests/test-enhanced-anticheat.js

# Security tests
node tests/securityTests.js
```

### **Deployment**
```bash
# Deploy commands
node deploy-commands.js

# Manual deployment (if needed)
git add .
git commit -m "Your changes"
git push origin main
# GitHub Actions handles the rest
```

---

## 🎯 **MANAGER CLASSES REFERENCE**

### **Core Managers**
```javascript
// Faction system
const factionManager = require('./utils/factionManager');
await factionManager.createCharacter(userId, name, faction);
await factionManager.getCurrentCharacter(userId);
await factionManager.switchCharacter(userId, characterId);

// Family system
const familyManager = require('./utils/familyManager');
await familyManager.createMarriageProposal(proposerId, targetId, type);
await familyManager.getMarriageStatus(userId);
await familyManager.attemptConception(userId, partnerId);

// Resource system
const resourceManager = require('./utils/resourceManager');
await resourceManager.getPlayerResources(userId);
await resourceManager.processDailyConsumption(userId);
await resourceManager.addResources(userId, resources);

// Global stats
const globalStatsManager = require('./utils/globalStatsManager');
await globalStatsManager.calculateVarietyBonus(userId);
await globalStatsManager.updateUserGlobalStats(userId, activityType, data);
await globalStatsManager.getGlobalLeaderboards(category);
```

### **System Managers**
```javascript
// Arena system
const arenaManager = require('./utils/arenaManager');
await arenaManager.createCompetition(type, gameType, settings);
await arenaManager.joinCompetition(userId, competitionId);
await arenaManager.startBossRaid(bossName, health);

// Guild District
const guildDistrictManager = require('./utils/guildDistrictManager');
await guildDistrictManager.purchasePlot(guildId, plotNumber, size);
await guildDistrictManager.buildOnPlot(plotId, buildingType);
await guildDistrictManager.collectResources(guildId);

// Residential plots
const residentialManager = require('./utils/residentialManager');
await residentialManager.purchasePlot(userId, neighborhoodId, size);
await residentialManager.inviteOccupant(plotId, userId, rent);
await residentialManager.upgradePlot(plotId);

// Anti-cheat
const enhancedAntiCheat = require('./utils/enhancedAntiCheat');
await enhancedAntiCheat.validateGameCompletion(userId, gameData);
await enhancedAntiCheat.detectMultiAccount(userId);
await enhancedAntiCheat.getAntiCheatStats(days);
```

---

## 🔧 **CONFIGURATION REFERENCE**

### **Environment Variables**
```bash
# Required
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id

# Database (optional - defaults to SQLite)
DATABASE_URL=postgresql://user:pass@host:5432/ravnspire

# Environment
NODE_ENV=development|production
```

### **Key Configuration Files**
```javascript
// config/gameRewards.js - Reward system configuration
const STANDARD_GAME_REWARDS = {
    base: { currency: 10, xp: 50 },
    factionResources: { /* faction-specific resources */ },
    multipliers: { /* various bonus multipliers */ }
};

// config/achievementConfig.js - Achievement definitions
const ACHIEVEMENTS = {
    easy: { /* easy achievements */ },
    medium: { /* medium achievements */ },
    hard: { /* hard achievements */ },
    legendary: { /* legendary achievements */ }
};
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**
```bash
# Commands not showing in Discord
node deploy-commands.js

# Database connection issues
node database/setup.js  # Reinitialize database

# Bot offline after deployment
# Check Discord intents in Developer Portal
# Verify DISCORD_TOKEN is correct

# Game initiation issues
node tests/test-game-initiation.js  # Test game systems

# Anti-cheat false positives
# Check accessibility patterns in enhancedAntiCheat.js
# Review user behavior patterns
```

### **Debug Commands**
```bash
# Test specific systems
node tests/test-[system-name].js

# Verify database schema
node scripts/verifySystem.js

# Check security systems
node tests/securityTests.js

# Run comprehensive validation
node tests/qc-core-systems.js
```

---

## 📊 **MONITORING & METRICS**

### **Key Metrics to Monitor**
- **User Engagement**: Daily active users, command usage
- **System Performance**: Response times, database queries
- **Security**: Anti-cheat flags, suspicious activity
- **Economy**: Resource balance, consumption rates
- **Social Features**: Marriage rates, family growth, neighborhood activity

### **Admin Dashboard Commands**
```bash
# View system statistics
/anti-cheat stats 7                    # Last 7 days
/admin-balance view                    # Current balance settings
/community stats                       # Community overview

# Monitor specific users
/anti-cheat logs [user] 10             # Last 10 logs
/stats compare [user]                  # Compare user stats
```

---

## 🎯 **BEST PRACTICES**

### **Development**
- Always test locally before deploying
- Update documentation for new features
- Follow existing code patterns
- Ensure accessibility support
- Run comprehensive tests

### **Administration**
- Monitor anti-cheat statistics regularly
- Balance game rewards based on user feedback
- Review flagged users manually
- Keep lore content updated
- Monitor resource economy health

### **User Support**
- Use `/help` command for guidance
- Check player guides for complex features
- Monitor community feedback
- Provide clear error messages
- Support accessibility users

---

*This quick reference guide provides essential information for developers, administrators, and users. For detailed information, refer to the comprehensive documentation files.*

# Ravnspire Multi-Game Community Bot - Admin Guide

## 🛠️ **ADMINISTRATOR OVERVIEW**

This guide provides comprehensive information for administrators managing the Ravnspire Multi-Game Community Bot. It covers system administration, balance management, security monitoring, and content management.

## 🚀 **SYSTEM ADMINISTRATION**

### **Database Management**

#### **PostgreSQL Setup (Production)**
```bash
# Install PostgreSQL dependencies
npm install pg

# Set up database
node database/setup.js

# Run migrations
node database/run-migrations.js

# Import lore codex
node database/import-lore-codex.js
```

#### **SQLite Setup (Development)**
```bash
# Set up SQLite database
node database/sqlite-setup.js

# Run SQLite migrations
node database/run-migrations-sqlite.js
```

#### **Database Maintenance**
- **Regular Backups**: Schedule daily backups of production database
- **Migration Management**: Test migrations on development before production
- **Performance Monitoring**: Monitor query performance and optimize as needed
- **Data Cleanup**: Regularly clean up old session data and logs

### **Environment Configuration**
```env
# Required Environment Variables
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
DATABASE_URL=postgresql://user:password@host:5432/ravnspire

# Optional Configuration
NODE_ENV=production
LOG_LEVEL=info
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=10
```

### **Deployment Process**
1. **Code Deployment**: Push changes to GitHub repository
2. **Database Migrations**: Run migrations on production database
3. **Command Registration**: Deploy new slash commands
4. **Bot Restart**: Restart bot to load new features
5. **Health Check**: Verify all systems are functioning
6. **Monitoring**: Monitor for errors and performance issues

## ⚖️ **BALANCE MANAGEMENT**

### **Game Balance Dashboard**

#### **Global Balance Settings**
```javascript
// Access via /admin-balance global [setting] [value]
const globalSettings = {
    base_currency: 10,        // Base currency reward
    base_xp: 50,             // Base XP reward
    max_total_bonus: 2.0,    // Maximum total bonus multiplier
    speed_bonus: 0.2,        // Speed bonus multiplier
    accuracy_bonus: 0.3,     // Accuracy bonus multiplier
    streak_bonus: 0.1,       // Streak bonus multiplier
    variety_bonus: 0.5,      // Variety bonus multiplier
    guild_bonus: 0.1,        // Guild bonus multiplier
    plot_bonus: 0.05         // Plot bonus multiplier
};
```

#### **Game-Specific Balance**
```javascript
// Access via /admin-balance game [game] [setting] [value]
const gameSpecificSettings = {
    tetris: {
        base_currency: 15,
        base_xp: 75,
        speed_multiplier: 1.5
    },
    tictactoe: {
        base_currency: 8,
        base_xp: 40,
        accuracy_multiplier: 1.2
    },
    trivia: {
        base_currency: 12,
        base_xp: 60,
        difficulty_bonus: 1.3
    }
};
```

#### **Faction Resource Balance**
```javascript
const factionResources = {
    Human: {
        food: 5,
        water: 3
    },
    AI: {
        energy: 5,
        data_fragments: 2
    },
    Nature: {
        biomass: 5,
        organic_matter: 3
    }
};
```

### **Balance Adjustment Commands**
- `/admin-balance global [setting] [value]` - Adjust global settings
- `/admin-balance game [game] [setting] [value]` - Adjust game-specific settings
- `/admin-balance faction [faction] [resource] [value]` - Adjust faction resources
- `/admin-balance event [event_name] [multiplier]` - Activate special events
- `/admin-balance view [scope]` - View current balance settings

### **Balance Monitoring**
- **Reward Analysis**: Monitor average rewards per game type
- **Player Progression**: Track player level progression rates
- **Resource Economy**: Monitor resource generation and consumption
- **Achievement Rates**: Track achievement completion rates
- **User Feedback**: Collect and analyze player feedback

## 🔒 **SECURITY MONITORING**

### **Anti-Cheat System**

#### **Security Manager Configuration**
```javascript
const securityConfig = {
    rateLimits: {
        game_completion: { window: 60000, limit: 10 },
        marriage_proposal: { window: 300000, limit: 3 },
        plot_purchase: { window: 3600000, limit: 5 }
    },
    validation: {
        minGameDuration: 30000,      // 30 seconds minimum
        maxScoreMultiplier: 10,      // 10x average score max
        suspiciousPatternThreshold: 5
    },
    flags: {
        autoFlagThreshold: 3,        // Auto-flag after 3 violations
        reviewThreshold: 5,          // Human review after 5 violations
        banThreshold: 10             // Ban after 10 violations
    }
};
```

#### **Security Monitoring Commands**
- `/admin-security flags [user]` - View user's security flags
- `/admin-security audit [user]` - View user's audit log
- `/admin-security flag [user] [reason] [severity]` - Manually flag user
- `/admin-security clear [user]` - Clear user's security flags
- `/admin-security report [user]` - Generate security report

#### **Security Event Types**
- **Rate Limit Violations**: Too many actions in time window
- **Impossible Scores**: Scores that exceed reasonable limits
- **Suspicious Patterns**: Bot-like behavior patterns
- **Resource Exploitation**: Unusual resource accumulation
- **Multi-Account Detection**: Potential alt account usage

### **Audit Logging**
- **Game Actions**: All game completions and scores
- **Security Events**: All security violations and flags
- **Admin Actions**: All administrative commands and changes
- **User Actions**: Significant user actions (marriage, plot purchases)
- **System Events**: Database changes and system errors

### **Security Response Procedures**
1. **Automatic Detection**: System automatically flags suspicious activity
2. **Review Process**: Admins review flagged accounts
3. **Investigation**: Detailed analysis of user behavior patterns
4. **Action**: Warning, temporary restriction, or permanent ban
5. **Documentation**: Record all actions and reasoning

## 📊 **CONTENT MANAGEMENT**

### **Lore System Management**

#### **Lore Import Process**
```bash
# Import lore codex
node database/import-lore-codex.js

# Verify import
node -e "const Database = require('./database/db'); Database.query('SELECT COUNT(*) FROM lore_entries').then(r => console.log('Lore entries:', r.rows[0].count));"
```

#### **Lore Management Commands**
- `/admin-lore add [entry_id] [title] [content] [category]` - Add new lore entry
- `/admin-lore update [entry_id] [field] [value]` - Update lore entry
- `/admin-lore delete [entry_id]` - Delete lore entry
- `/admin-lore stats` - View lore system statistics

### **Achievement Management**

#### **Achievement Creation**
```javascript
const newAchievement = {
    name: "Master Gamer",
    description: "Win 100 games across all types",
    category: "completionist",
    requirements: {
        total_wins: 100,
        games_played: ["tetris", "tictactoe", "trivia"]
    },
    rewards: {
        xp: 5000,
        title: "Master Gamer",
        badge: "master_gamer"
    },
    rarity: "rare"
};
```

#### **Achievement Management Commands**
- `/admin-achievement create [name] [description] [category]` - Create achievement
- `/admin-achievement update [id] [field] [value]` - Update achievement
- `/admin-achievement delete [id]` - Delete achievement
- `/admin-achievement award [user] [achievement_id]` - Manually award achievement

### **Event Management**

#### **Arena Event Creation**
```javascript
const arenaEvent = {
    type: "weekly_tournament",
    name: "Weekly Championship",
    description: "Weekly tournament with special rewards",
    startTime: "2025-01-15 18:00:00",
    endTime: "2025-01-15 22:00:00",
    gameType: "tetris",
    rewards: {
        xp: 1000,
        currency: 500,
        title: "Weekly Champion"
    },
    recurring: true,
    recurringPattern: "0 18 * * 1" // Every Monday at 6 PM
};
```

#### **Event Management Commands**
- `/admin-event create [type] [name] [start_time] [end_time]` - Create event
- `/admin-event update [id] [field] [value]` - Update event
- `/admin-event cancel [id]` - Cancel event
- `/admin-event list` - List all events

## 📈 **ANALYTICS & MONITORING**

### **Key Performance Indicators**

#### **User Engagement Metrics**
- **Daily Active Users**: Users who interact with the bot daily
- **Game Completion Rate**: Percentage of started games that are completed
- **Marriage Success Rate**: Percentage of proposals that are accepted
- **Guild Participation**: Percentage of users in guilds
- **Achievement Completion**: Rate of achievement unlocking

#### **System Performance Metrics**
- **Response Time**: Average command response time
- **Database Performance**: Query execution times
- **Error Rate**: Percentage of failed operations
- **Uptime**: System availability percentage

#### **Economic Metrics**
- **Resource Generation**: Rate of resource creation
- **Resource Consumption**: Rate of resource usage
- **Currency Inflation**: Rate of currency creation vs. consumption
- **Plot Ownership**: Percentage of available plots owned

### **Monitoring Tools**
- **Database Queries**: Monitor slow queries and optimize
- **Error Logging**: Track and analyze system errors
- **User Behavior**: Analyze user interaction patterns
- **Performance Metrics**: Monitor system resource usage

### **Reporting Commands**
- `/admin-stats users` - User statistics and engagement
- `/admin-stats games` - Game performance statistics
- `/admin-stats economy` - Economic system statistics
- `/admin-stats system` - System performance statistics

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check database connectivity
node -e "const Database = require('./database/db'); Database.testConnection().then(() => console.log('Connected')).catch(console.error);"

# Reset database connection
# Restart the bot to reinitialize connections
```

#### **Command Registration Issues**
```bash
# Redeploy commands
node deploy-commands.js

# Check command registration status
# Verify bot has proper permissions in Discord
```

#### **Performance Issues**
- **Database Optimization**: Check for slow queries and add indexes
- **Memory Usage**: Monitor memory consumption and restart if needed
- **Rate Limiting**: Adjust rate limits if causing issues
- **Caching**: Implement caching for frequently accessed data

#### **Security Issues**
- **False Positives**: Review and adjust security thresholds
- **Bypass Attempts**: Monitor for new cheating methods
- **Account Sharing**: Detect and prevent account sharing
- **Resource Exploitation**: Monitor for resource farming

### **Emergency Procedures**

#### **System Outage**
1. **Assess Impact**: Determine scope of the outage
2. **Communicate**: Inform users of the issue and expected resolution
3. **Investigate**: Identify root cause of the problem
4. **Resolve**: Fix the issue and verify functionality
5. **Monitor**: Watch for any related issues
6. **Document**: Record the incident and resolution

#### **Security Breach**
1. **Immediate Response**: Isolate affected systems
2. **Assessment**: Determine scope of the breach
3. **Containment**: Prevent further damage
4. **Investigation**: Analyze the breach and identify vulnerabilities
5. **Recovery**: Restore normal operations
6. **Prevention**: Implement measures to prevent recurrence

## 📋 **MAINTENANCE SCHEDULE**

### **Daily Tasks**
- **Health Check**: Verify all systems are functioning
- **Error Review**: Check error logs for issues
- **Performance Monitor**: Review system performance metrics
- **Security Review**: Check for security violations

### **Weekly Tasks**
- **Database Backup**: Create full database backup
- **Performance Analysis**: Analyze performance trends
- **User Feedback Review**: Review user feedback and suggestions
- **Security Audit**: Review security logs and flags

### **Monthly Tasks**
- **System Updates**: Update dependencies and security patches
- **Balance Review**: Analyze game balance and make adjustments
- **Content Updates**: Add new lore entries and achievements
- **Performance Optimization**: Optimize database queries and system performance

### **Quarterly Tasks**
- **Comprehensive Security Review**: Full security audit
- **System Architecture Review**: Evaluate system design and scalability
- **User Experience Analysis**: Analyze user engagement and satisfaction
- **Feature Planning**: Plan new features and improvements

## 🎯 **BEST PRACTICES**

### **Administration**
- **Documentation**: Keep detailed records of all changes and decisions
- **Testing**: Test all changes in development before production
- **Backup**: Maintain regular backups of all critical data
- **Monitoring**: Continuously monitor system health and performance

### **Community Management**
- **Transparency**: Communicate changes and decisions to the community
- **Fairness**: Apply rules and policies consistently
- **Responsiveness**: Respond quickly to user issues and feedback
- **Engagement**: Actively participate in community activities

### **Security**
- **Proactive Monitoring**: Continuously monitor for security threats
- **Regular Updates**: Keep all systems updated with latest security patches
- **Access Control**: Limit administrative access to necessary personnel
- **Incident Response**: Have clear procedures for security incidents

### **Performance**
- **Optimization**: Continuously optimize system performance
- **Scalability**: Plan for future growth and increased usage
- **Resource Management**: Efficiently manage system resources
- **Load Balancing**: Distribute load across multiple instances if needed

## 📞 **SUPPORT & CONTACTS**

### **Technical Support**
- **Development Team**: Contact for technical issues and feature requests
- **Database Administrator**: Contact for database-related issues
- **Security Team**: Contact for security concerns and incidents

### **Community Support**
- **Community Managers**: Contact for community-related issues
- **Content Moderators**: Contact for content and behavior issues
- **Event Coordinators**: Contact for event planning and management

### **Emergency Contacts**
- **System Administrator**: Available 24/7 for critical issues
- **Security Officer**: Available for security incidents
- **Database Administrator**: Available for database emergencies

This admin guide provides comprehensive information for managing the Ravnspire Multi-Game Community Bot. Regular review and updates of this guide ensure administrators have the most current information for effective system management.

# Ravnspire Multi-Game Community Bot - API Documentation

## 📚 **API OVERVIEW**

This document provides comprehensive API documentation for the Ravnspire Multi-Game Community Bot, including all utility classes, managers, and system interfaces.

## 🎮 **GAME SYSTEM API**

### **GameBase Class**
```javascript
class GameBase {
    constructor(gameType, userId, sessionId)
    async calculateRewards(gameData, userStats)
    async applyRewards(rewards)
    async getUserStats(userId)
    async updateFactionResources(userId, resources)
    async updateGameVariety(userId, gameType)
    calculateAccuracy(gameData)
}
```

**Methods:**
- `constructor(gameType, userId, sessionId)`: Initialize game instance
- `calculateRewards(gameData, userStats)`: Calculate standardized rewards
- `applyRewards(rewards)`: Apply calculated rewards to user
- `getUserStats(userId)`: Get user statistics for reward calculation
- `updateFactionResources(userId, resources)`: Update user's faction resources
- `updateGameVariety(userId, gameType)`: Track game variety for bonus calculation
- `calculateAccuracy(gameData)`: Calculate game accuracy percentage

### **GameSession Class**
```javascript
class GameSession {
    constructor(sessionId, userId, gameType)
    async save()
    async load()
    async end(finalScore)
    async cleanup()
}
```

**Methods:**
- `constructor(sessionId, userId, gameType)`: Initialize game session
- `save()`: Save session state to database
- `load()`: Load session state from database
- `end(finalScore)`: End session and calculate rewards
- `cleanup()`: Clean up expired sessions

### **GameRewardCalculator**
```javascript
class GameRewardCalculator {
    constructor(baseRewards = STANDARD_GAME_REWARDS)
    calculateSpeedBonus(gameData)
    calculateAccuracyBonus(gameData)
    calculateStreakBonus(winStreak)
    calculateVarietyBonus(gamesPlayed)
    calculateGuildBonus(guild)
    calculatePlotBonus(plots)
    calculateRewards(gameData, userStats)
}
```

**Methods:**
- `calculateSpeedBonus(gameData)`: Calculate speed-based reward multiplier
- `calculateAccuracyBonus(gameData)`: Calculate accuracy-based reward multiplier
- `calculateStreakBonus(winStreak)`: Calculate win streak bonus
- `calculateVarietyBonus(gamesPlayed)`: Calculate game variety bonus
- `calculateGuildBonus(guild)`: Calculate guild membership bonus
- `calculatePlotBonus(plots)`: Calculate plot ownership bonus
- `calculateRewards(gameData, userStats)`: Calculate final rewards with all bonuses

## 👥 **FACTION SYSTEM API**

### **FactionManager Class**
```javascript
class FactionManager {
    async createCharacter(userId, characterName, faction)
    async switchCharacter(userId, characterId)
    async getActiveCharacter(userId)
    async getCharacterLineage(characterId)
    async updateFactionPurity(userId, newFaction)
    async getFactionHistory(userId)
    async getFactionResources(userId)
    async updateFactionResources(userId, resources)
}
```

**Methods:**
- `createCharacter(userId, characterName, faction)`: Create new character
- `switchCharacter(userId, characterId)`: Switch active character
- `getActiveCharacter(userId)`: Get user's currently active character
- `getCharacterLineage(characterId)`: Get character's family lineage
- `updateFactionPurity(userId, newFaction)`: Update faction alignment
- `getFactionHistory(userId)`: Get faction change history
- `getFactionResources(userId)`: Get user's faction-specific resources
- `updateFactionResources(userId, resources)`: Update faction resources

**Parameters:**
- `userId`: Discord user ID (string)
- `characterName`: Name for new character (string)
- `faction`: Faction type - 'Human', 'AI', or 'Nature' (string)
- `characterId`: Database character ID (integer)
- `resources`: Object with faction resource amounts

## 💕 **FAMILY SYSTEM API**

### **FamilyManager Class**
```javascript
class FamilyManager {
    // Marriage System
    async createMarriageProposal(proposerId, targetId, type, message)
    async acceptMarriageProposal(proposalId, acceptorId)
    async rejectMarriageProposal(proposalId, rejectorId)
    async getPendingProposals(userId)
    async getMarriageStatus(userId)
    async divorce(userId, partnerId)
    
    // Affection System
    async addAffectionInteraction(userId, partnerId, interactionType, message, affectionGain)
    async getAffectionData(userId)
    async getInteractionHistory(userId, partnerId)
    
    // Child System
    async attemptConception(userId, partnerId, method)
    async careForChild(userId, childId, careType, quality)
    async getUserChildren(userId)
    async switchToChild(userId, childId)
    async getChildDevelopment(childId)
}
```

**Marriage Methods:**
- `createMarriageProposal(proposerId, targetId, type, message)`: Create marriage proposal
- `acceptMarriageProposal(proposalId, acceptorId)`: Accept marriage proposal
- `rejectMarriageProposal(proposalId, rejectorId)`: Reject marriage proposal
- `getPendingProposals(userId)`: Get pending proposals for user
- `getMarriageStatus(userId)`: Get user's marriage status
- `divorce(userId, partnerId)`: Initiate divorce process

**Affection Methods:**
- `addAffectionInteraction(userId, partnerId, interactionType, message, affectionGain)`: Add affection interaction
- `getAffectionData(userId)`: Get user's affection data
- `getInteractionHistory(userId, partnerId)`: Get interaction history with partner

**Child Methods:**
- `attemptConception(userId, partnerId, method)`: Attempt to conceive child
- `careForChild(userId, childId, careType, quality)`: Provide care for child
- `getUserChildren(userId)`: Get user's children
- `switchToChild(userId, childId)`: Switch to child character
- `getChildDevelopment(childId)`: Get child development status

**Parameters:**
- `proposerId/targetId/userId`: Discord user ID (string)
- `type`: Marriage type - 'dyad', 'triad', 'quad' (string)
- `message`: Proposal or interaction message (string)
- `interactionType`: Type of interaction - 'conversation', 'gift', 'date', etc. (string)
- `method`: Conception method - 'natural', 'surrogate', 'artificial' (string)
- `careType`: Type of care - 'feeding', 'playing', 'teaching', 'medical' (string)
- `quality`: Care quality 1-10 (integer)

## 🏰 **GUILD DISTRICT API**

### **GuildDistrictManager Class**
```javascript
class GuildDistrictManager {
    // Plot Management
    async purchasePlot(guildId, plotSize)
    async upgradePlot(plotId, upgradeType)
    async sellPlot(plotId, price)
    async getGuildPlots(guildId)
    async getPlotDetails(plotId)
    
    // Building System
    async buildOnPlot(plotId, buildingType)
    async upgradeBuilding(plotId, buildingType)
    async demolishBuilding(plotId)
    
    // Resource Generation
    async collectResources(plotId, collectorId)
    async getResourceGeneration(plotId)
    async getGuildResourceGeneration(guildId)
    
    // Transactions
    async getTransactionHistory(guildId, limit)
    async getGuildStatistics(guildId)
}
```

**Plot Methods:**
- `purchasePlot(guildId, plotSize)`: Purchase plot in Guild District
- `upgradePlot(plotId, upgradeType)`: Upgrade plot tier
- `sellPlot(plotId, price)`: List plot for sale
- `getGuildPlots(guildId)`: Get all guild's plots
- `getPlotDetails(plotId)`: Get detailed plot information

**Building Methods:**
- `buildOnPlot(plotId, buildingType)`: Construct building on plot
- `upgradeBuilding(plotId, buildingType)`: Upgrade existing building
- `demolishBuilding(plotId)`: Remove building from plot

**Resource Methods:**
- `collectResources(plotId, collectorId)`: Collect generated resources
- `getResourceGeneration(plotId)`: Get plot's resource generation
- `getGuildResourceGeneration(guildId)`: Get guild's total resource generation

**Parameters:**
- `guildId`: Guild database ID (integer)
- `plotId`: Plot database ID (integer)
- `plotSize`: Plot size - 'small', 'medium', 'large', 'commercial_estate' (string)
- `buildingType`: Building type - 'resource_mine', 'training_grounds', 'vault', etc. (string)
- `collectorId`: Discord user ID of collector (string)

## ⚔️ **ARENA SYSTEM API**

### **ArenaManager Class**
```javascript
class ArenaManager {
    // Practice System
    async canUserPractice(userId, gameType)
    async recordPracticeSession(userId, gameType, score)
    async getPracticeLimits(userId)
    
    // Competition System
    async createCompetition(type, name, description, gameType, maxParticipants, entryFee, durationMinutes, createdBy)
    async joinCompetition(competitionId, userId)
    async leaveCompetition(competitionId, userId)
    async getActiveCompetitions(limit)
    async getCompetitionDetails(competitionId)
    async endCompetition(competitionId)
    
    // Match System
    async recordMatchResult(competitionId, matchType, participants, winnerId, winnerGuildId, matchData, durationSeconds)
    async getMatchHistory(userId, limit)
    async getMatchStatistics(userId)
    
    // Leaderboard System
    async updateLeaderboard(userId, guildId, gameType, matchesPlayed, matchesWon)
    async getLeaderboard(type, gameType, limit)
    async resetLeaderboard(type, gameType)
    
    // Boss Raid System
    async startBossRaid(bossName, health, gameType, durationHours, createdBy)
    async attackBoss(competitionId, userId, damage)
    async getBossStatus(competitionId)
    
    // Event System
    async createEvent(type, name, description, startTime, endTime, gameType, recurring, recurringPattern, createdBy)
    async getUpcomingEvents(limit)
    async getEventDetails(eventId)
}
```

**Practice Methods:**
- `canUserPractice(userId, gameType)`: Check if user can practice
- `recordPracticeSession(userId, gameType, score)`: Record practice session
- `getPracticeLimits(userId)`: Get user's practice limits

**Competition Methods:**
- `createCompetition(...)`: Create new competition
- `joinCompetition(competitionId, userId)`: Join competition
- `leaveCompetition(competitionId, userId)`: Leave competition
- `getActiveCompetitions(limit)`: Get active competitions
- `getCompetitionDetails(competitionId)`: Get competition details
- `endCompetition(competitionId)`: End competition

**Match Methods:**
- `recordMatchResult(...)`: Record match result
- `getMatchHistory(userId, limit)`: Get user's match history
- `getMatchStatistics(userId)`: Get user's match statistics

**Leaderboard Methods:**
- `updateLeaderboard(...)`: Update leaderboard entry
- `getLeaderboard(type, gameType, limit)`: Get leaderboard data
- `resetLeaderboard(type, gameType)`: Reset leaderboard

**Boss Raid Methods:**
- `startBossRaid(...)`: Start boss raid
- `attackBoss(competitionId, userId, damage)`: Attack boss
- `getBossStatus(competitionId)`: Get boss status

**Parameters:**
- `type`: Competition type - 'individual_pvp', 'guild_pvp', 'tournament', 'boss_raid' (string)
- `gameType`: Game type - 'tetris', 'tictactoe', 'trivia' (string)
- `matchType`: Match type - '1v1', '2v2', 'guild_battle', 'boss_raid' (string)
- `leaderboardType`: Leaderboard type - 'practice_daily', 'competition_weekly', 'boss_raid_monthly' (string)

## 🏆 **ACHIEVEMENT SYSTEM API**

### **AchievementManager Class**
```javascript
class AchievementManager {
    // Achievement Management
    async getAchievements(category, limit)
    async getUserAchievements(userId, category)
    async getAchievementProgress(userId, achievementId)
    async checkAchievements(userId, category)
    
    // Family Achievements
    async checkFamilyAchievements(userId)
    async checkMarriageAchievements(userId)
    async checkParentingAchievements(userId)
    
    // Arena Achievements
    async checkArenaAchievements(userId)
    async checkPracticeAchievements(userId)
    async checkCompetitionAchievements(userId)
    
    // Achievement Creation
    async createAchievement(name, description, category, requirements, rewards, rarity)
    async ensureAchievementExists(achievementData)
}
```

**General Methods:**
- `getAchievements(category, limit)`: Get achievements by category
- `getUserAchievements(userId, category)`: Get user's achievements
- `getAchievementProgress(userId, achievementId)`: Get achievement progress
- `checkAchievements(userId, category)`: Check and award achievements

**Family Achievement Methods:**
- `checkFamilyAchievements(userId)`: Check family-related achievements
- `checkMarriageAchievements(userId)`: Check marriage achievements
- `checkParentingAchievements(userId)`: Check parenting achievements

**Arena Achievement Methods:**
- `checkArenaAchievements(userId)`: Check arena-related achievements
- `checkPracticeAchievements(userId)`: Check practice achievements
- `checkCompetitionAchievements(userId)`: Check competition achievements

**Creation Methods:**
- `createAchievement(...)`: Create new achievement
- `ensureAchievementExists(achievementData)`: Ensure achievement exists in database

**Parameters:**
- `category`: Achievement category - 'marriage_milestone', 'parenting', 'arena', etc. (string)
- `requirements`: Achievement requirements object
- `rewards`: Achievement rewards object
- `rarity`: Achievement rarity - 'common', 'uncommon', 'rare', 'epic', 'legendary' (string)

## 🔒 **SECURITY SYSTEM API**

### **SecurityManager Class**
```javascript
class SecurityManager {
    // Rate Limiting
    async checkRateLimit(userId, action, window, limit)
    async setRateLimit(userId, action, window, limit)
    async clearRateLimit(userId, action)
    
    // Game Validation
    async validateGameCompletion(userId, gameData)
    async validateScore(userId, gameType, score)
    async validateDuration(userId, gameType, duration)
    
    // Anti-Cheat
    async detectSuspiciousActivity(userId, activityType, data)
    async flagUser(userId, reason, severity)
    async getSecurityFlags(userId)
    async clearSecurityFlags(userId)
    
    // Audit Logging
    async logSecurityEvent(userId, eventType, data)
    async getAuditLog(userId, limit)
    async getSecurityReport(userId)
}
```

**Rate Limiting Methods:**
- `checkRateLimit(userId, action, window, limit)`: Check if user is rate limited
- `setRateLimit(userId, action, window, limit)`: Set rate limit for user
- `clearRateLimit(userId, action)`: Clear rate limit for user

**Validation Methods:**
- `validateGameCompletion(userId, gameData)`: Validate game completion
- `validateScore(userId, gameType, score)`: Validate game score
- `validateDuration(userId, gameType, duration)`: Validate game duration

**Anti-Cheat Methods:**
- `detectSuspiciousActivity(userId, activityType, data)`: Detect suspicious activity
- `flagUser(userId, reason, severity)`: Flag user for review
- `getSecurityFlags(userId)`: Get user's security flags
- `clearSecurityFlags(userId)`: Clear user's security flags

**Audit Methods:**
- `logSecurityEvent(userId, eventType, data)`: Log security event
- `getAuditLog(userId, limit)`: Get user's audit log
- `getSecurityReport(userId)`: Get security report for user

**Parameters:**
- `action`: Rate limit action type (string)
- `window`: Time window in milliseconds (integer)
- `limit`: Maximum actions per window (integer)
- `activityType`: Type of activity being monitored (string)
- `severity`: Flag severity - 'low', 'medium', 'high', 'critical' (string)

## 🗄️ **DATABASE API**

### **Database Class**
```javascript
class Database {
    async query(text, params)
    async transaction(queries)
    async close()
    async testConnection()
}
```

**Methods:**
- `query(text, params)`: Execute SQL query with parameters
- `transaction(queries)`: Execute multiple queries in transaction
- `close()`: Close database connection
- `testConnection()`: Test database connectivity

**Parameters:**
- `text`: SQL query string
- `params`: Query parameters array
- `queries`: Array of query objects for transactions

## 🎨 **UTILITY CLASSES API**

### **EmbedBuilder**
```javascript
class EmbedBuilder {
    static create(options)
    static addField(embed, name, value, inline)
    static addFields(embed, fields)
    static setColor(embed, color)
    static setThumbnail(embed, url)
    static setImage(embed, url)
    static setFooter(embed, text, iconURL)
    static setTimestamp(embed, timestamp)
}
```

### **ButtonBuilder**
```javascript
class ButtonBuilder {
    static create(options)
    static createActionRow(components)
    static createButton(label, style, customId, options)
    static createSelectMenu(customId, placeholder, options)
    static createSelectOption(label, value, description, emoji)
}
```

## 📊 **CONFIGURATION API**

### **Game Rewards Configuration**
```javascript
const STANDARD_GAME_REWARDS = {
    base: {
        currency: 10,
        xp: 50
    },
    factionResources: {
        Human: { food: 5, water: 3 },
        AI: { energy: 5, data_fragments: 2 },
        Nature: { biomass: 5, organic_matter: 3 }
    },
    multipliers: {
        completion: 1.0,
        speed_bonus: 0.2,
        accuracy_bonus: 0.3,
        streak_bonus: 0.1,
        variety_bonus: 0.5,
        guild_bonus: 0.1,
        plot_bonus: 0.05
    },
    caps: {
        max_total_bonus: 2.0
    }
};
```

### **Achievement Configuration**
```javascript
const ACHIEVEMENT_CATEGORIES = {
    marriage_milestone: {
        first_love: { xp: 500, title: "Newlywed", badge: "first_love" },
        golden_anniversary: { xp: 2000, title: "Devoted Partner", badge: "golden_anniversary" }
    },
    parenting: {
        new_parent: { xp: 1000, title: "New Parent", badge: "new_parent" },
        family_builder: { xp: 5000, title: "Family Builder", badge: "family_builder" }
    },
    arena: {
        practice_master: { xp: 1500, title: "Practice Master", badge: "practice_master" },
        arena_champion: { xp: 10000, title: "Arena Champion", badge: "arena_champion" }
    }
};
```

## 🏘️ **RESIDENTIAL MANAGER API**

### **ResidentialManager Class**
```javascript
class ResidentialManager {
    async getAvailablePlots(neighborhoodId)
    async getCharacterPlots(characterId)
    async purchasePlot(characterId, neighborhoodId, plotNumber, plotSize)
    async listPlotForSale(characterId, plotId, salePrice)
    async buyPlotForSale(characterId, plotId)
    async upgradePlot(characterId, plotId)
    async inviteOccupant(ownerCharacterId, plotId, inviteeCharacterId, rentAmount)
    async getPlotOccupants(plotId)
    async getPlotDetails(plotId)
    async getNeighborhoodsWithPlots()
}
```

**Methods:**
- `getAvailablePlots(neighborhoodId)`: Get available plots in a neighborhood
- `getCharacterPlots(characterId)`: Get plots owned by a character
- `purchasePlot(characterId, neighborhoodId, plotNumber, plotSize)`: Purchase a plot
- `listPlotForSale(characterId, plotId, salePrice)`: List plot for sale
- `buyPlotForSale(characterId, plotId)`: Buy a plot that's for sale
- `upgradePlot(characterId, plotId)`: Upgrade plot tier
- `inviteOccupant(ownerCharacterId, plotId, inviteeCharacterId, rentAmount)`: Invite occupant
- `getPlotOccupants(plotId)`: Get plot occupants
- `getPlotDetails(plotId)`: Get detailed plot information
- `getNeighborhoodsWithPlots()`: Get all neighborhoods with plot information

### **Plot Configuration**
```javascript
const plotSizes = {
    small: { basePrice: 1000, maxOccupants: 2, maintenanceCost: 50 },
    medium: { basePrice: 2500, maxOccupants: 4, maintenanceCost: 125 },
    large: { basePrice: 5000, maxOccupants: 6, maintenanceCost: 250 },
    estate: { basePrice: 10000, maxOccupants: 10, maintenanceCost: 500 }
};

const tierMultipliers = {
    1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0
};
```

## 🏘️ **NEIGHBORHOOD GOVERNANCE MANAGER API**

### **NeighborhoodGovernanceManager Class**
```javascript
class NeighborhoodGovernanceManager {
    async createProposal(neighborhoodId, proposerGuildId, title, description, proposalType, proposalData)
    async castVote(proposalId, guildId, voteType)
    async updateVoteCounts(proposalId)
    async getActiveProposals(neighborhoodId)
    async getAllProposals(neighborhoodId, limit)
    async getProposalDetails(proposalId)
    async hasGuildVoted(proposalId, guildId)
    async getEligibleVoters(neighborhoodId)
    async processExpiredProposals()
    async enactProposal(proposal)
    async getNeighborhoodRules(neighborhoodId)
    async getProposalStats(neighborhoodId)
}
```

**Methods:**
- `createProposal(neighborhoodId, proposerGuildId, title, description, proposalType, proposalData)`: Create a new neighborhood proposal
- `castVote(proposalId, guildId, voteType)`: Cast a vote on a proposal (for/against)
- `updateVoteCounts(proposalId)`: Update vote counts for a proposal
- `getActiveProposals(neighborhoodId)`: Get active proposals for a neighborhood
- `getAllProposals(neighborhoodId, limit)`: Get all proposals for a neighborhood
- `getProposalDetails(proposalId)`: Get detailed proposal information with votes
- `hasGuildVoted(proposalId, guildId)`: Check if a guild has voted on a proposal
- `getEligibleVoters(neighborhoodId)`: Get guilds eligible to vote in a neighborhood
- `processExpiredProposals()`: Process expired proposals and update status
- `enactProposal(proposal)`: Enact a passed proposal
- `getNeighborhoodRules(neighborhoodId)`: Get enacted neighborhood rules
- `getProposalStats(neighborhoodId)`: Get governance statistics for a neighborhood

### **Proposal Configuration**
```javascript
const proposalTypes = {
    building: 'Community building construction or modification',
    policy: 'Neighborhood policy changes',
    event: 'Community events and activities',
    defense: 'Defense system improvements',
    tax: 'Tax rate adjustments',
    amenity: 'New amenities or services'
};

const votingPeriods = {
    building: 7,  // 7 days
    policy: 5,    // 5 days
    event: 3,     // 3 days
    defense: 2,   // 2 days
    tax: 10,      // 10 days
    amenity: 7    // 7 days
};
```

## 💰 **RESOURCE MANAGER API**

### **ResourceManager Class**
```javascript
class ResourceManager {
    async getPlayerResources(discordId)
    async initializePlayerResources(discordId)
    async updatePlayerResources(discordId, resourceUpdates)
    async hasSufficientResources(discordId, requiredResources)
    async deductResources(discordId, resourceDeductions)
    async addResources(discordId, resourceAdditions)
    async processDailyConsumption(characterId)
    async processAllDailyConsumption()
    async getConsumptionHistory(characterId, days)
    getFactionRequirements(faction)
    getFactionResourceTypes(faction)
    calculateResourceValue(resources)
    async getResourceStats(discordId)
}
```

**Methods:**
- `getPlayerResources(discordId)`: Get player's current resources
- `initializePlayerResources(discordId)`: Initialize resources for new player
- `updatePlayerResources(discordId, resourceUpdates)`: Update player resources
- `hasSufficientResources(discordId, requiredResources)`: Check if player has sufficient resources
- `deductResources(discordId, resourceDeductions)`: Deduct resources from player
- `addResources(discordId, resourceAdditions)`: Add resources to player
- `processDailyConsumption(characterId)`: Process daily resource consumption for a character
- `processAllDailyConsumption()`: Process daily consumption for all active characters
- `getConsumptionHistory(characterId, days)`: Get resource consumption history
- `getFactionRequirements(faction)`: Get faction-specific resource requirements
- `getFactionResourceTypes(faction)`: Get available resources for a faction
- `calculateResourceValue(resources)`: Calculate resource value for trading/display
- `getResourceStats(discordId)`: Get comprehensive resource statistics

### **Resource Configuration**
```javascript
const dailyCosts = {
    Human: { food: 10, water: 5 },
    AI: { energy: 8, data_fragments: 3, electricity: 5 },
    Nature: { biomass: 12, organic_matter: 6 }
};

const factionResources = {
    Human: ['food', 'water', 'currency', 'building_materials', 'rare_artifacts'],
    AI: ['energy', 'data_fragments', 'electricity', 'currency', 'building_materials', 'rare_artifacts'],
    Nature: ['biomass', 'organic_matter', 'currency', 'building_materials', 'rare_artifacts']
};
```

## 🛡️ **ENHANCED ANTI-CHEAT API**

### **EnhancedAntiCheat Class**
```javascript
class EnhancedAntiCheat {
    async validateGameCompletion(userId, gameData)
    async detectMultiAccount(userId)
    async validateCareAction(userId, childId, careData)
    async validateResourceTransfer(fromUser, toUser, amount, transferType)
    async getRecentGameHistory(userId, limit)
    async getUserBehavioralPatterns(userId)
    async getCareHistory(userId, childId, days)
    async getTransferCount(userId, hours)
    async getTotalTransferred(userId, hours)
    async checkCircularTransfers(fromUser, toUser)
    async logValidation(userId, validationType, flags)
    async getAntiCheatStats(days)
}
```

**Methods:**
- `validateGameCompletion(userId, gameData)`: Validate game completion for automation detection
- `detectMultiAccount(userId)`: Detect multi-account exploitation
- `validateCareAction(userId, childId, careData)`: Validate care actions for automation detection
- `validateResourceTransfer(fromUser, toUser, amount, transferType)`: Validate resource transfers
- `getRecentGameHistory(userId, limit)`: Get recent game history for analysis
- `getUserBehavioralPatterns(userId)`: Get user behavioral patterns
- `getCareHistory(userId, childId, days)`: Get care history for validation
- `getTransferCount(userId, hours)`: Get transfer count for frequency analysis
- `getTotalTransferred(userId, hours)`: Get total transferred amount
- `checkCircularTransfers(fromUser, toUser)`: Check for circular transfer patterns
- `logValidation(userId, validationType, flags)`: Log validation results
- `getAntiCheatStats(days)`: Get anti-cheat statistics

### **Anti-Cheat Configuration**
```javascript
const thresholds = {
    perfectScoreThreshold: 0.95, // Flag if >95% perfect scores
    speedThreshold: 0.8, // Flag if consistently faster than 80% of players
    timingConsistency: 0.9, // Flag if timing variation <10%
    resourceAccumulationRate: 2.0, // Flag if accumulating resources 2x faster than average
    transferFrequency: 5, // Flag if transferring resources >5 times per day
    careTimingVariation: 0.1, // Flag if care timing varies <10%
    careConsistency: 0.95, // Flag if care actions are >95% consistent
    deviceFingerprintSimilarity: 0.8, // Flag if device fingerprints are >80% similar
    behavioralSimilarity: 0.85 // Flag if behavioral patterns are >85% similar
};

const accessibilityPatterns = {
    consistentTiming: true, // Allow consistent timing for screen readers
    keyboardNavigation: true, // Allow keyboard-only navigation
    assistiveTech: true // Allow assistive technology usage
};
```

## 🚨 **ERROR HANDLING**

### **Error Types**
```javascript
class RavnspireError extends Error {
    constructor(message, code, details)
}

class ValidationError extends RavnspireError {
    constructor(message, field, value)
}

class DatabaseError extends RavnspireError {
    constructor(message, query, params)
}

class SecurityError extends RavnspireError {
    constructor(message, userId, severity)
}
```

### **Error Codes**
- `VALIDATION_ERROR`: Input validation failed
- `DATABASE_ERROR`: Database operation failed
- `SECURITY_ERROR`: Security violation detected
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `PERMISSION_ERROR`: Insufficient permissions
- `NOT_FOUND_ERROR`: Resource not found
- `CONFLICT_ERROR`: Resource conflict

## 📝 **USAGE EXAMPLES**

### **Creating a Marriage Proposal**
```javascript
const FamilyManager = require('./utils/familyManager');

async function proposeMarriage(proposerId, targetId) {
    try {
        const result = await FamilyManager.createMarriageProposal(
            proposerId,
            targetId,
            'dyad',
            'Will you marry me?'
        );
        
        console.log(`Marriage proposal created with ID: ${result.proposalId}`);
        return result;
    } catch (error) {
        console.error('Failed to create marriage proposal:', error.message);
        throw error;
    }
}
```

### **Recording a Practice Session**
```javascript
const ArenaManager = require('./utils/arenaManager');

async function recordPractice(userId, gameType, score) {
    try {
        const result = await ArenaManager.recordPracticeSession(userId, gameType, score);
        
        if (result.error) {
            console.log(result.error);
            return;
        }
        
        console.log(`Practice recorded: ${result.xpEarned} XP earned`);
        return result;
    } catch (error) {
        console.error('Failed to record practice:', error.message);
        throw error;
    }
}
```

### **Purchasing a Guild Plot**
```javascript
const GuildDistrictManager = require('./utils/guildDistrictManager');

async function buyPlot(guildId, plotSize) {
    try {
        const result = await GuildDistrictManager.purchasePlot(guildId, plotSize);
        
        console.log(`Plot purchased: ${result.plotId} for ${result.cost} currency`);
        return result;
    } catch (error) {
        console.error('Failed to purchase plot:', error.message);
        throw error;
    }
}
```

This API documentation provides comprehensive information for developers working with the Ravnspire Multi-Game Community Bot. All methods include parameter descriptions, return value information, and usage examples to facilitate integration and extension of the system.

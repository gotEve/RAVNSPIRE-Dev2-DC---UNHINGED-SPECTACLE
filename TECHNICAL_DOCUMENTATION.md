# Ravnspire Multi-Game Community Bot - Technical Documentation

## 🏗️ **SYSTEM ARCHITECTURE**

### **Core Architecture**
- **Modular Design**: Clear separation of concerns with dedicated modules for each system
- **Database Abstraction**: Unified database interface supporting both PostgreSQL and SQLite
- **Command Framework**: Recursive command loading with subdirectory organization
- **Game Engine**: Abstract base class system for consistent game implementation
- **Security Layer**: Comprehensive anti-cheating and rate limiting system

### **Database Design**
- **Hybrid Approach**: PostgreSQL for production with SQLite fallback for development
- **JSONB Integration**: Flexible data storage for complex game states and metadata
- **Migration System**: Automated schema updates with rollback support
- **Relationship Integrity**: Proper foreign key constraints and referential integrity

## 🎮 **GAME SYSTEM**

### **GameBase Class**
```javascript
class GameBase {
    constructor(gameType, userId, sessionId) {
        this.gameType = gameType;
        this.userId = userId;
        this.sessionId = sessionId;
        this.startTime = Date.now();
        this.gameState = {};
    }
    
    async calculateRewards(gameData, userStats) {
        // Uses standardized reward calculator
        return await gameRewardCalculator.calculateRewards(gameData, userStats);
    }
    
    async applyRewards(rewards) {
        // Updates user resources and statistics
    }
}
```

### **Game Session Management**
- **Session Tracking**: Active session monitoring with automatic cleanup
- **State Persistence**: Game state saved to database for recovery
- **Reward Integration**: Seamless integration with standardized reward system
- **Security Validation**: Real-time validation of game results

### **Implemented Games**
1. **Trivia Game**: Category-based questions with difficulty levels
2. **Tetris Game**: Classic falling blocks with scoring and levels
3. **Tic Tac Toe Game**: Multiplayer strategy with AI opponent

## 👥 **FACTION SYSTEM**

### **Character Management**
```javascript
class FactionManager {
    async createCharacter(userId, characterName, faction) {
        // Creates new character with faction assignment
        // Tracks lineage and genetic traits
        // Initializes faction-specific resources
    }
    
    async switchCharacter(userId, characterId) {
        // Switches active character (permanent for children)
        // Updates faction resources and statistics
        // Maintains character lineage
    }
}
```

### **Faction Types**
- **Human**: Focus on food and water resources
- **AI**: Focus on energy and data fragments
- **Nature**: Focus on biomass and organic matter

### **Character Lineage**
- **Parent Tracking**: Up to 3 parents for polyamorous relationships
- **Genetic Traits**: Hybrid composition tracking
- **Faction Purity**: Percentage-based faction alignment
- **Generational Play**: Switch to adult children for continued gameplay

## 💕 **MARRIAGE & FAMILY SYSTEM**

### **Marriage System**
```javascript
class FamilyManager {
    async createMarriageProposal(proposerId, targetId, type, message) {
        // Creates marriage proposal with expiration
        // Validates eligibility and existing relationships
        // Tracks proposal status and responses
    }
    
    async acceptMarriageProposal(proposalId, acceptorId) {
        // Creates marriage record with participants
        // Initializes affection tracking
        // Sets up relationship data structures
    }
}
```

### **Marriage Types**
- **Dyad**: Traditional two-person marriage
- **Triad**: Three-person polyamorous relationship
- **Quad**: Four-person polyamorous relationship

### **Affection System**
- **Interaction Tracking**: Detailed history of all relationship interactions
- **Affection Points**: Numerical system for relationship strength
- **Interaction Types**: Conversation, gifts, dates, games, care activities
- **Resource Costs**: Some interactions require resource expenditure

### **Child System**
- **Conception Requirements**: Minimum affection points and resource costs
- **Development Tracking**: Intelligence, creativity, resilience, social skills
- **Care System**: Daily care requirements with neglect consequences
- **Character Switching**: Switch to adult children for generational gameplay

## 🏰 **GUILD DISTRICT SYSTEM**

### **Plot Management**
```javascript
class GuildDistrictManager {
    async purchasePlot(guildId, plotSize) {
        // Validates guild eligibility and plot availability
        // Processes payment and ownership transfer
        // Initializes plot with default values
    }
    
    async upgradePlot(plotId, upgradeType) {
        // Validates upgrade requirements and costs
        // Updates plot tier and capabilities
        // Modifies resource generation rates
    }
}
```

### **Building Types**
- **Resource Mines**: Generate faction-specific resources
- **Training Grounds**: Provide XP bonuses for guild members
- **Vaults**: Store and protect guild resources
- **Command Centers**: Administrative and coordination hubs
- **Workshops**: Crafting and enhancement facilities

### **Resource Generation**
- **Automated Production**: Continuous resource generation based on building types
- **Collection System**: Manual collection with cooldown periods
- **Upgrade Benefits**: Higher tier buildings generate more resources
- **Maintenance Costs**: Regular upkeep requirements

## ⚔️ **ARENA/CRUCIBLE SYSTEM**

### **Competition Types**
```javascript
class ArenaManager {
    async createCompetition(type, name, gameType, maxParticipants) {
        // Creates competition with specified parameters
        // Sets up participant tracking and rewards
        // Manages competition lifecycle
    }
    
    async joinCompetition(competitionId, userId) {
        // Validates eligibility and capacity
        // Processes entry fees and registration
        // Updates participant lists
    }
}
```

### **Competition Categories**
- **Individual PvP**: One-on-one player competitions
- **Guild PvP**: Guild versus guild battles
- **Tournament**: Multi-round elimination competitions
- **Boss Raids**: Server-wide cooperative events

### **Practice Grounds**
- **Daily Limits**: Maximum 5 practice sessions per day
- **XP Rewards**: 25 XP per session (no other rewards)
- **Skill Development**: Focus on improvement without resource farming
- **Session Tracking**: Detailed practice history and statistics

### **Leaderboards**
- **Practice Leaderboards**: Daily XP accumulation rankings
- **Competition Leaderboards**: Win rates and tournament performance
- **Boss Raid Leaderboards**: Damage dealt and participation
- **All-Time Rankings**: Lifetime achievement tracking

## 🎁 **REWARD SYSTEM**

### **Standardized Rewards**
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
    }
};
```

### **Multiplier System**
- **Speed Bonus**: Faster completion = higher rewards
- **Accuracy Bonus**: Better performance = increased rewards
- **Streak Bonus**: Consecutive wins provide bonus multipliers
- **Variety Bonus**: Playing different games increases rewards
- **Guild Bonus**: Guild membership provides small bonus
- **Plot Bonus**: Plot ownership provides additional bonus

### **Admin Balance Dashboard**
- **Global Settings**: Adjust base rewards for all games
- **Game-Specific**: Modify rewards for individual games
- **Event Multipliers**: Temporary bonus events
- **Real-Time Updates**: Changes apply immediately

## 🏘️ **NEIGHBORHOOD SYSTEM**

### **Residential Plot System**
```javascript
class ResidentialManager {
    constructor() {
        this.plotSizes = {
            small: { basePrice: 1000, maxOccupants: 2, maintenanceCost: 50 },
            medium: { basePrice: 2500, maxOccupants: 4, maintenanceCost: 125 },
            large: { basePrice: 5000, maxOccupants: 6, maintenanceCost: 250 },
            estate: { basePrice: 10000, maxOccupants: 10, maintenanceCost: 500 }
        };
        
        this.tierMultipliers = {
            1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0
        };
    }
}
```

### **Database Schema**
- **`residential_plots`**: Plot ownership, sizing, tier upgrades, maintenance
- **`plot_occupants`**: Co-habitation tracking (owners, renters, roommates)
- **`rent_agreements`**: Rental contracts and landlord-tenant relationships

### **Core Features**
- **Character-based Ownership**: Plots owned by characters, not users
- **Plot Sizes**: 4 sizes with different capacities and costs
- **Tier Upgrades**: 5-tier system with increasing benefits
- **Co-habitation**: Invite roommates with optional rent
- **Plot Management**: Purchase, sell, upgrade, and manage properties

### **Commands**
- `/plot buy` - Purchase residential plot
- `/plot sell` - List plot for sale
- `/plot upgrade` - Upgrade plot tier
- `/plot invite` - Invite occupant
- `/plot info` - View plot details
- `/plot my-plots` - View owned plots
- `/plot available` - View available plots
- `/plot neighborhoods` - View all neighborhoods

### **Neighborhood Governance System**
```javascript
class NeighborhoodGovernanceManager {
    constructor() {
        this.proposalTypes = {
            'building': 'Community building construction or modification',
            'policy': 'Neighborhood policy changes',
            'event': 'Community events and activities',
            'defense': 'Defense system improvements',
            'tax': 'Tax rate adjustments',
            'amenity': 'New amenities or services'
        };
        
        this.votingPeriods = {
            'building': 7, 'policy': 5, 'event': 3,
            'defense': 2, 'tax': 10, 'amenity': 7
        };
    }
}
```

### **Database Schema**
- **`neighborhood_proposals`**: Proposal management with voting periods and status tracking
- **`neighborhood_votes`**: Guild-based voting with unique constraints
- **`neighborhood_rules`**: Enacted policies and neighborhood rules

### **Core Features**
- **Guild-based Voting**: Only guilds with neighborhood plots can vote
- **Proposal Types**: 6 types with different voting periods (2-10 days)
- **Automatic Processing**: Expired proposals are automatically processed
- **Policy Enactment**: Passed proposals can enact neighborhood changes
- **Governance Analytics**: Complete statistics and reporting

### **Commands**
- `/neighborhood propose` - Create new proposal
- `/neighborhood vote` - Cast vote on proposal
- `/neighborhood proposals` - View active proposals
- `/neighborhood proposal` - View detailed proposal
- `/neighborhood rules` - View neighborhood rules
- `/neighborhood stats` - View governance statistics
- `/neighborhood voters` - View eligible voters

## 💰 **RESOURCE ECONOMY SYSTEM**

### **Resource Manager**
```javascript
class ResourceManager {
    constructor() {
        this.dailyCosts = {
            Human: { food: 10, water: 5 },
            AI: { energy: 8, data_fragments: 3, electricity: 5 },
            Nature: { biomass: 12, organic_matter: 6 }
        };
        
        this.factionResources = {
            Human: ['food', 'water', 'currency', 'building_materials', 'rare_artifacts'],
            AI: ['energy', 'data_fragments', 'electricity', 'currency', 'building_materials', 'rare_artifacts'],
            Nature: ['biomass', 'organic_matter', 'currency', 'building_materials', 'rare_artifacts']
        };
    }
}
```

### **Database Schema**
- **`player_resources`**: Faction-specific resource storage with currency and building materials
- **`faction_resources`**: Character-specific resource tracking
- **`resource_consumption_log`**: Daily consumption tracking with success/failure logging
- **`guild_resource_generation`**: Guild resource generation and collection tracking

### **Core Features**
- **Faction-Specific Resources**: Different resource types for each faction
- **Daily Consumption**: Automatic resource deduction based on faction requirements
- **Resource Validation**: Prevents negative resources and insufficient funds
- **Consumption History**: Complete audit trail of all resource transactions
- **Value Calculation**: Resource value calculation for trading and display
- **Admin Tools**: Bulk processing and monitoring capabilities

### **Commands**
- `/resources view [user]` - View current resources and daily costs
- `/resources daily` - Process daily resource consumption
- `/resources history [days]` - View consumption history
- `/resources faction [faction]` - View faction-specific information
- `/resources admin [confirm]` - Process all daily consumption (admin)

## 🛡️ **ENHANCED ANTI-CHEAT SYSTEM**

### **Enhanced Anti-Cheat Manager**
```javascript
class EnhancedAntiCheat {
    constructor() {
        this.thresholds = {
            perfectScoreThreshold: 0.95,
            speedThreshold: 0.8,
            timingConsistency: 0.9,
            resourceAccumulationRate: 2.0,
            transferFrequency: 5,
            careTimingVariation: 0.1,
            careConsistency: 0.95,
            deviceFingerprintSimilarity: 0.8,
            behavioralSimilarity: 0.85
        };
        
        this.accessibilityPatterns = {
            consistentTiming: true,
            keyboardNavigation: true,
            assistiveTech: true
        };
    }
}
```

### **Database Schema**
- **`anti_cheat_logs`**: Validation results and flag tracking
- **`resource_transfers`**: Resource transfer monitoring and validation

### **Core Features**
- **Game Completion Validation**: Perfect score patterns, speed anomalies, resource accumulation
- **Multi-Account Detection**: Device fingerprints, behavioral analysis, transfer patterns
- **Care Action Validation**: Timing consistency, action patterns, engagement scoring
- **Resource Transfer Validation**: Frequency monitoring, amount validation, circular transfers
- **Accessibility Support**: Consistent timing allowed, keyboard navigation, assistive tech

### **Commands**
- `/anti-cheat stats [days]` - View anti-cheat statistics
- `/anti-cheat validate-user [user] [type]` - Manually validate user
- `/anti-cheat logs [user] [limit]` - View user logs
- `/anti-cheat thresholds` - View current thresholds
- `/anti-cheat flag-review [days]` - View users requiring review

## 🏆 **ACHIEVEMENT SYSTEM**

### **Achievement Categories**
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

### **Reward Types**
- **XP**: Experience points for character progression
- **Titles**: Display names for user profiles
- **Badges**: Visual indicators of achievements
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary

### **Progress Tracking**
- **Real-Time Calculation**: Automatic progress updates
- **Achievement Unlocking**: Automatic reward distribution
- **Progress Display**: User-friendly progress indicators
- **History Tracking**: Complete achievement history

## 🔒 **SECURITY SYSTEM**

### **Anti-Cheating Mechanisms**
```javascript
class SecurityManager {
    async validateGameCompletion(userId, gameData) {
        // Validates game duration and score reasonableness
        // Checks for impossible performance patterns
        // Flags suspicious activity for review
    }
    
    async detectMultiAccount(userId) {
        // Analyzes behavioral patterns
        // Monitors resource transfer patterns
        // Flags potential alt account exploitation
    }
}
```

### **Rate Limiting**
- **Per-User Limits**: Individual rate limits for all actions
- **Per-Action Limits**: Specific limits for different activities
- **Configurable Windows**: Adjustable time windows for limits
- **Automatic Cleanup**: Memory management for rate limit data

### **Validation Systems**
- **Score Validation**: Impossible score detection
- **Duration Validation**: Minimum game time requirements
- **Pattern Detection**: Bot-like behavior identification
- **Human Review**: Borderline cases flagged for admin review

## 📊 **DATABASE SCHEMA**

### **Core Tables**
```sql
-- Users and profiles
users (discord_id, username, xp, currency, created_at)
user_profiles (discord_id, bio, title, badges, statistics)

-- Game system
games (id, name, type, description, active)
game_sessions (id, user_id, game_type, start_time, end_time, score, rewards)
game_balance_config (id, game_type, scope, config_data, active)

-- Faction system
player_characters (id, discord_id, character_name, birth_faction, current_faction, parent_1, parent_2, parent_3)
player_factions (discord_id, current_faction, faction_purity, faction_history)
faction_resources (discord_id, food, energy, biomass, electricity, water, data_fragments, organic_matter)

-- Family system
marriages (id, marriage_type, status, married_at, divorced_at)
marriage_participants (id, marriage_id, character_id, role, joined_at)
relationship_affection (id, marriage_id, character_1, character_2, affection_points, interaction_history)
children (id, character_id, conception_method, birth_date, faction_at_birth, hybrid_composition, development_score)

-- Guild system
guilds (id, name, description, level, xp, member_count)
guild_members (guild_id, discord_id, role, joined_at)
guild_district_plots (id, plot_number, plot_size, guild_id, building_type, resource_output)

-- Arena system
arena_competitions (id, competition_type, name, game_type, participants, status, rewards)
arena_matches (id, competition_id, match_type, participants, winner_id, match_data)
arena_leaderboards (id, leaderboard_type, game_type, user_id, score, rank)

-- Achievement system
achievements (id, name, description, category, requirements, rewards, rarity)
user_achievements (discord_id, achievement_id, earned_at, progress)
family_achievements (id, achievement_type, name, description, requirements, rewards)
arena_achievements (id, achievement_type, name, description, requirements, rewards)
```

### **JSONB Usage**
- **Game States**: Flexible storage for any game state
- **Metadata**: Complex metadata for lore entries and achievements
- **Configuration**: Dynamic configuration storage
- **Interaction History**: Detailed relationship interaction logs
- **Resource Data**: Complex resource generation and consumption data

## 🧪 **TESTING FRAMEWORK**

### **Quality Control Tests**
```javascript
class CoreSystemQC {
    async testExistingGames() {
        // Tests all game initiation and completion
        // Validates reward distribution
        // Checks session management
    }
    
    async testDatabaseConnections() {
        // Verifies database connectivity
        // Tests JSONB functionality
        // Validates schema integrity
    }
    
    async testSecuritySystems() {
        // Tests anti-cheating mechanisms
        // Validates rate limiting
        // Checks audit logging
    }
}
```

### **System-Specific Tests**
- **Marriage System**: Complete marriage lifecycle testing
- **Arena System**: Competition and practice ground testing
- **Guild District**: Plot management and resource generation testing
- **Faction System**: Character creation and switching testing
- **Achievement System**: Progress tracking and reward distribution testing

### **Test Coverage**
- **Unit Tests**: Individual function testing
- **Integration Tests**: System interaction testing
- **End-to-End Tests**: Complete user workflow testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Anti-cheating and validation testing

## 🚀 **DEPLOYMENT STRATEGY**

### **Database Migrations**
1. **Backup Production**: Complete database backup before changes
2. **Incremental Migrations**: Apply changes in small, reversible steps
3. **Rollback Plan**: Maintain ability to revert changes
4. **Data Validation**: Verify data integrity after each migration

### **Feature Rollout**
1. **Quality Control**: Run comprehensive test suite
2. **Staged Deployment**: Deploy to test environment first
3. **Monitoring**: Watch for errors and performance issues
4. **Community Announcement**: Inform users of new features

### **Monitoring & Maintenance**
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Monitoring**: Database and application performance tracking
- **User Feedback**: Community feedback collection and analysis
- **Regular Updates**: Scheduled maintenance and feature updates

## 📈 **PERFORMANCE CONSIDERATIONS**

### **Database Optimization**
- **Indexing**: Strategic indexes for all major queries
- **Query Optimization**: Efficient query patterns and caching
- **Connection Pooling**: Optimized database connection management
- **JSONB Performance**: Proper indexing for JSONB columns

### **Memory Management**
- **Session Cleanup**: Automatic cleanup of expired sessions
- **Rate Limit Cleanup**: Regular cleanup of old rate limit data
- **Cache Management**: Efficient caching strategies
- **Resource Monitoring**: Memory and CPU usage tracking

### **Scalability**
- **Horizontal Scaling**: Database sharding strategies
- **Load Balancing**: Multiple bot instance support
- **Caching Layers**: Redis integration for high-traffic data
- **CDN Integration**: Static asset delivery optimization

This technical documentation provides a comprehensive overview of the Ravnspire Multi-Game Community Bot's architecture, systems, and implementation details. The system is designed for scalability, maintainability, and extensibility while providing a rich social simulation experience for Discord communities.

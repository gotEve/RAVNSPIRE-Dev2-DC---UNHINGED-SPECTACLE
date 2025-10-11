// Central configuration for the Ravnspire bot
require('dotenv').config();

const config = {
    // Bot configuration
    bot: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID, // Optional: for guild-specific commands
    },

    // Database configuration
    database: {
        url: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },

    // Game configuration
    games: {
        // XP and currency rewards
        baseXP: 10,
        baseCurrency: 5,
        levelMultiplier: 1.2,
        maxLevel: 100,
        
        // Game session timeouts (in milliseconds)
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        questionTimeout: 60 * 1000, // 1 minute per question
        
        // Leaderboard limits
        leaderboardLimit: 10,
    },

    // Guild configuration
    guilds: {
        maxMembers: 50,
        minMembersForLevelUp: 5,
        xpPerActivity: 5,
        resourcePerActivity: 2,
        
        // Plot configuration
        plotMaintenanceInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
        plotMaintenanceCost: 100,
        plotUpgradeCost: 500,
    },

    // Neighborhood configuration
    neighborhoods: {
        maxPlots: 10,
        maxGuildsPerNeighborhood: 10,
        buildingContributionLimit: 1000,
        
        // Building types and their benefits
        buildings: {
            'town_hall': {
                name: 'Town Hall',
                description: 'Central meeting place for neighborhood decisions',
                benefits: ['voting_power', 'event_bonus']
            },
            'market': {
                name: 'Market',
                description: 'Trading hub for neighborhood resources',
                benefits: ['trade_bonus', 'resource_efficiency']
            },
            'defense_tower': {
                name: 'Defense Tower',
                description: 'Protects neighborhood from attacks',
                benefits: ['defense_bonus', 'attack_resistance']
            },
            'library': {
                name: 'Library',
                description: 'Knowledge center for lore and research',
                benefits: ['lore_bonus', 'research_speed']
            }
        }
    },

    // Achievement configuration
    achievements: {
        // Categories
        categories: ['global', 'game', 'guild', 'lore', 'social'],
        
        // Reward types
        rewardTypes: ['xp', 'currency', 'badge', 'title', 'lore_unlock'],
        
        // Achievement rarity
        rarities: {
            common: { color: 0x808080, multiplier: 1 },
            uncommon: { color: 0x00ff00, multiplier: 1.5 },
            rare: { color: 0x0080ff, multiplier: 2 },
            epic: { color: 0x8000ff, multiplier: 3 },
            legendary: { color: 0xff8000, multiplier: 5 }
        }
    },

    // Lore configuration
    lore: {
        categories: ['characters', 'locations', 'events', 'timeline', 'items', 'factions'],
        maxSearchResults: 20,
        discoveryXP: 25,
    },

    // Community configuration
    community: {
        // Event types
        eventTypes: ['tournament', 'challenge', 'social', 'educational'],
        
        // Challenge frequencies
        challengeFrequencies: ['daily', 'weekly', 'monthly'],
        
        // Bulletin board
        maxBulletinEntries: 10,
        bulletinExpiryDays: 30,
    },

    // Help system configuration
    help: {
        sections: [
            'games',
            'profile', 
            'guild',
            'neighborhood',
            'lore',
            'achievements',
            'community'
        ],
        maxCommandsPerSection: 10,
    },

    // Embed colors
    colors: {
        primary: 0x0099FF,
        success: 0x00FF00,
        warning: 0xFF8000,
        error: 0xFF0000,
        info: 0x0080FF,
        achievement: 0xFFD700,
        guild: 0x8000FF,
        neighborhood: 0x00FFFF,
        lore: 0xFF8000,
    },

    // Rate limiting
    rateLimits: {
        commands: {
            window: 60 * 1000, // 1 minute
            max: 10, // 10 commands per minute
        },
        games: {
            window: 5 * 60 * 1000, // 5 minutes
            max: 3, // 3 games per 5 minutes
        }
    },

    // Error messages
    errors: {
        database: 'Database connection error. Please try again later.',
        permission: 'You do not have permission to use this command.',
        notFound: 'The requested item was not found.',
        rateLimit: 'You are using commands too quickly. Please slow down.',
        gameNotFound: 'Game not found or not available.',
        guildNotFound: 'Guild not found.',
        neighborhoodNotFound: 'Neighborhood not found.',
        achievementNotFound: 'Achievement not found.',
        loreNotFound: 'Lore entry not found.',
    },

    // Success messages
    success: {
        profileUpdated: 'Profile updated successfully!',
        guildCreated: 'Guild created successfully!',
        guildJoined: 'Successfully joined the guild!',
        guildLeft: 'Successfully left the guild.',
        achievementUnlocked: 'Achievement unlocked!',
        loreDiscovered: 'New lore discovered!',
        gameCompleted: 'Game completed!',
    }
};

// Validation
const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

module.exports = config;

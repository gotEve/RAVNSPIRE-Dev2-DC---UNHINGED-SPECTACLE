// Achievement configuration and definitions
const achievementConfig = {
    // Achievement categories
    categories: {
        global: {
            name: 'Global',
            description: 'Overall progress and milestones',
            color: 0x808080
        },
        game: {
            name: 'Games',
            description: 'Game-specific achievements',
            color: 0x00FF00
        },
        guild: {
            name: 'Guild',
            description: 'Guild-related achievements',
            color: 0x8000FF
        },
        lore: {
            name: 'Lore',
            description: 'Lore discovery achievements',
            color: 0xFF8000
        },
        social: {
            name: 'Social',
            description: 'Community interaction achievements',
            color: 0x0080FF
        },
        neighborhood: {
            name: 'Neighborhood',
            description: 'Neighborhood participation achievements',
            color: 0x00FFFF
        }
    },

    // Achievement definitions
    achievements: {
        // Global achievements
        'first_steps': {
            name: 'First Steps',
            description: 'Complete your first game',
            category: 'global',
            type: 'global',
            rarity: 'common',
            requirements: {
                games_played: 1
            },
            rewards: {
                xp: 100,
                currency: 50,
                badge: 'newcomer'
            },
            hidden: false
        },

        'dedicated_player': {
            name: 'Dedicated Player',
            description: 'Play 100 games',
            category: 'global',
            type: 'global',
            rarity: 'uncommon',
            requirements: {
                games_played: 100
            },
            rewards: {
                xp: 500,
                currency: 250,
                title: 'Dedicated'
            },
            hidden: false
        },

        'master_gamer': {
            name: 'Master Gamer',
            description: 'Play 1000 games',
            category: 'global',
            type: 'global',
            rarity: 'legendary',
            requirements: {
                games_played: 1000
            },
            rewards: {
                xp: 2000,
                currency: 1000,
                title: 'Master Gamer',
                badge: 'legendary'
            },
            hidden: false
        },

        'level_milestone_10': {
            name: 'Rising Star',
            description: 'Reach level 10',
            category: 'global',
            type: 'global',
            rarity: 'common',
            requirements: {
                level: 10
            },
            rewards: {
                xp: 200,
                currency: 100,
                title: 'Rising Star'
            },
            hidden: false
        },

        'level_milestone_50': {
            name: 'Veteran',
            description: 'Reach level 50',
            category: 'global',
            type: 'global',
            rarity: 'rare',
            requirements: {
                level: 50
            },
            rewards: {
                xp: 1000,
                currency: 500,
                title: 'Veteran'
            },
            hidden: false
        },

        // Game-specific achievements
        'trivia_master': {
            name: 'Trivia Master',
            description: 'Get a perfect score in trivia',
            category: 'game',
            type: 'game-specific',
            rarity: 'uncommon',
            requirements: {
                game: 'trivia',
                perfect_score: 1
            },
            rewards: {
                xp: 300,
                currency: 150,
                badge: 'trivia_master'
            },
            hidden: false
        },

        'trivia_streak': {
            name: 'Trivia Streak',
            description: 'Get 10 correct answers in a row in trivia',
            category: 'game',
            type: 'game-specific',
            rarity: 'rare',
            requirements: {
                game: 'trivia',
                streak: 10
            },
            rewards: {
                xp: 400,
                currency: 200,
                title: 'Trivia Expert'
            },
            hidden: false
        },

        'adventure_explorer': {
            name: 'Adventure Explorer',
            description: 'Complete an adventure with all hidden items',
            category: 'game',
            type: 'game-specific',
            rarity: 'uncommon',
            requirements: {
                game: 'adventure',
                all_items_found: 1
            },
            rewards: {
                xp: 350,
                currency: 175,
                badge: 'explorer'
            },
            hidden: false
        },

        'puzzle_solver': {
            name: 'Puzzle Solver',
            description: 'Solve 50 puzzles',
            category: 'game',
            type: 'game-specific',
            rarity: 'uncommon',
            requirements: {
                game: 'puzzle',
                puzzles_solved: 50
            },
            rewards: {
                xp: 400,
                currency: 200,
                title: 'Puzzle Master'
            },
            hidden: false
        },

        // Guild achievements
        'guild_founder': {
            name: 'Guild Founder',
            description: 'Create a guild',
            category: 'guild',
            type: 'guild',
            rarity: 'common',
            requirements: {
                guild_created: 1
            },
            rewards: {
                xp: 250,
                currency: 125,
                title: 'Founder'
            },
            hidden: false
        },

        'guild_leader': {
            name: 'Guild Leader',
            description: 'Lead a guild to level 10',
            category: 'guild',
            type: 'guild',
            rarity: 'rare',
            requirements: {
                guild_level: 10,
                guild_role: 'owner'
            },
            rewards: {
                xp: 800,
                currency: 400,
                title: 'Guild Leader'
            },
            hidden: false
        },

        'guild_champion': {
            name: 'Guild Champion',
            description: 'Win a guild war',
            category: 'guild',
            type: 'guild',
            rarity: 'epic',
            requirements: {
                guild_wars_won: 1
            },
            rewards: {
                xp: 1000,
                currency: 500,
                badge: 'champion'
            },
            hidden: false
        },

        // Lore achievements
        'lore_seeker': {
            name: 'Lore Seeker',
            description: 'Discover 10 lore entries',
            category: 'lore',
            type: 'lore',
            rarity: 'common',
            requirements: {
                lore_discovered: 10
            },
            rewards: {
                xp: 200,
                currency: 100,
                title: 'Lore Seeker'
            },
            hidden: false
        },

        'lore_master': {
            name: 'Lore Master',
            description: 'Discover 50 lore entries',
            category: 'lore',
            type: 'lore',
            rarity: 'rare',
            requirements: {
                lore_discovered: 50
            },
            rewards: {
                xp: 600,
                currency: 300,
                title: 'Lore Master'
            },
            hidden: false
        },

        'hidden_knowledge': {
            name: 'Hidden Knowledge',
            description: 'Discover a hidden lore entry',
            category: 'lore',
            type: 'lore',
            rarity: 'uncommon',
            requirements: {
                hidden_lore_discovered: 1
            },
            rewards: {
                xp: 400,
                currency: 200,
                badge: 'secret_keeper'
            },
            hidden: true
        },

        // Social achievements
        'helpful_member': {
            name: 'Helpful Member',
            description: 'Help 10 other players',
            category: 'social',
            type: 'social',
            rarity: 'common',
            requirements: {
                players_helped: 10
            },
            rewards: {
                xp: 300,
                currency: 150,
                title: 'Helpful'
            },
            hidden: false
        },

        'community_leader': {
            name: 'Community Leader',
            description: 'Participate in 25 community events',
            category: 'social',
            type: 'social',
            rarity: 'uncommon',
            requirements: {
                community_events: 25
            },
            rewards: {
                xp: 500,
                currency: 250,
                title: 'Community Leader'
            },
            hidden: false
        },

        // Neighborhood achievements
        'neighborhood_pioneer': {
            name: 'Neighborhood Pioneer',
            description: 'Join a neighborhood',
            category: 'neighborhood',
            type: 'neighborhood',
            rarity: 'common',
            requirements: {
                neighborhood_joined: 1
            },
            rewards: {
                xp: 200,
                currency: 100,
                title: 'Pioneer'
            },
            hidden: false
        },

        'neighborhood_builder': {
            name: 'Neighborhood Builder',
            description: 'Contribute 1000 resources to neighborhood buildings',
            category: 'neighborhood',
            type: 'neighborhood',
            rarity: 'uncommon',
            requirements: {
                neighborhood_contributions: 1000
            },
            rewards: {
                xp: 400,
                currency: 200,
                title: 'Builder'
            },
            hidden: false
        },

        'neighborhood_defender': {
            name: 'Neighborhood Defender',
            description: 'Successfully defend a neighborhood from attack',
            category: 'neighborhood',
            type: 'neighborhood',
            rarity: 'rare',
            requirements: {
                successful_defenses: 1
            },
            rewards: {
                xp: 600,
                currency: 300,
                badge: 'defender'
            },
            hidden: false
        }
    },

    // Achievement tracking configuration
    tracking: {
        // How often to check for achievement progress (in milliseconds)
        checkInterval: 30 * 1000, // 30 seconds
        
        // Events that trigger achievement checks
        triggers: [
            'game_completed',
            'level_up',
            'guild_joined',
            'guild_created',
            'lore_discovered',
            'neighborhood_joined',
            'neighborhood_contribution',
            'community_event_participation'
        ]
    },

    // Reward configuration
    rewards: {
        // XP multipliers by rarity
        xpMultipliers: {
            common: 1,
            uncommon: 1.5,
            rare: 2,
            epic: 3,
            legendary: 5
        },
        
        // Currency multipliers by rarity
        currencyMultipliers: {
            common: 1,
            uncommon: 1.5,
            rare: 2,
            epic: 3,
            legendary: 5
        }
    }
};

module.exports = achievementConfig;

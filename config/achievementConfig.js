// Enhanced Achievement Configuration
// Defines all achievements with XP, titles, and badge rewards

const ACHIEVEMENT_CATEGORIES = {
    // Easy - Trophy Display (50-100 XP, badges only)
    first_steps: {
        first_game: {
            name: 'First Steps',
            description: 'Play your first game',
            category: 'first_steps',
            type: 'global',
            requirements: { games_played: 1 },
            rewards: { xp: 50, badge: 'newcomer', title: null },
            hidden: false
        },
        first_win: {
            name: 'First Victory',
            description: 'Win your first game',
            category: 'first_steps',
            type: 'global',
            requirements: { games_won: 1 },
            rewards: { xp: 100, badge: 'winner_bronze', title: null },
            hidden: false
        },
        first_guild: {
            name: 'Guild Member',
            description: 'Join your first guild',
            category: 'first_steps',
            type: 'social',
            requirements: { guild_joined: true },
            rewards: { xp: 75, badge: 'guild_member', title: null },
            hidden: false
        },
        first_lore: {
            name: 'Lore Seeker',
            description: 'Discover your first piece of lore',
            category: 'first_steps',
            type: 'lore',
            requirements: { lore_discovered: 1 },
            rewards: { xp: 50, badge: 'lore_seeker', title: null },
            hidden: false
        },
        first_plot: {
            name: 'Homeowner',
            description: 'Purchase your first residential plot',
            category: 'first_steps',
            type: 'housing',
            requirements: { plot_owned: 1 },
            rewards: { xp: 100, badge: 'homeowner', title: null },
            hidden: false
        }
    },

    // Medium - Small Rewards (500-1500 XP, titles)
    social: {
        married_30_days: {
            name: 'Devoted Partner',
            description: 'Stay married for 30 days',
            category: 'social',
            type: 'marriage',
            requirements: { marriage_duration_days: 30 },
            rewards: { xp: 500, badge: 'committed', title: 'Devoted Partner' },
            hidden: false
        },
        parent_of_three: {
            name: 'Family Builder',
            description: 'Have 3 children',
            category: 'social',
            type: 'family',
            requirements: { children_count: 3 },
            rewards: { xp: 1000, badge: 'family_builder', title: 'Family Builder' },
            hidden: false
        },
        guild_officer: {
            name: 'Guild Officer',
            description: 'Become an officer in a guild',
            category: 'social',
            type: 'guild',
            requirements: { guild_role: 'officer' },
            rewards: { xp: 750, badge: 'officer', title: 'Guild Officer' },
            hidden: false
        },
        neighborhood_mayor: {
            name: 'Mayor',
            description: 'Become mayor of a neighborhood',
            category: 'social',
            type: 'neighborhood',
            requirements: { neighborhood_role: 'mayor' },
            rewards: { xp: 1500, badge: 'mayor', title: 'Mayor' },
            hidden: false
        }
    },

    // Hard - Moderate Rewards (3000-7500 XP, special titles)
    completionist: {
        all_lore_discovered: {
            name: 'Lore Master',
            description: 'Discover all available lore entries',
            category: 'completionist',
            type: 'lore',
            requirements: { lore_discovered_percentage: 100 },
            rewards: { xp: 5000, badge: 'lore_master', title: 'Lore Master' },
            hidden: false
        },
        master_all_games: {
            name: 'Game Master',
            description: 'Achieve mastery in all available games',
            category: 'completionist',
            type: 'games',
            requirements: { games_mastered: 'all' },
            rewards: { xp: 7500, badge: 'game_master', title: 'Game Master' },
            hidden: false
        },
        five_guilds_founded: {
            name: 'Guild Entrepreneur',
            description: 'Found 5 different guilds',
            category: 'completionist',
            type: 'guild',
            requirements: { guilds_founded: 5 },
            rewards: { xp: 5000, badge: 'entrepreneur', title: 'Guild Entrepreneur' },
            hidden: false
        },
        century_club: {
            name: 'Century Club',
            description: 'Play 100+ games',
            category: 'completionist',
            type: 'global',
            requirements: { games_played: 100 },
            rewards: { xp: 3000, badge: 'century', title: 'Century Club' },
            hidden: false
        }
    },

    // Nearly Impossible - Major Rewards (50000+ XP, legendary titles)
    legendary: {
        grandmaster: {
            name: 'Grandmaster',
            description: 'Play 1000+ games with high performance',
            category: 'legendary',
            type: 'global',
            requirements: { games_played: 1000, average_score: 150 },
            rewards: { xp: 50000, badge: 'grandmaster_legendary', title: 'Grandmaster' },
            hidden: false
        },
        dynasty_builder: {
            name: 'Dynasty Builder',
            description: 'Create a 5-generation family lineage',
            category: 'legendary',
            type: 'family',
            requirements: { generations: 5 },
            rewards: { xp: 75000, badge: 'dynasty', title: 'Dynasty Builder' },
            hidden: false
        },
        arena_champion: {
            name: 'Arena Champion',
            description: 'Win 50 consecutive arena matches',
            category: 'legendary',
            type: 'arena',
            requirements: { arena_wins_streak: 50 },
            rewards: { xp: 100000, badge: 'undefeated', title: 'Arena Champion' },
            hidden: false
        },
        lore_keeper: {
            name: 'Keeper of All Lore',
            description: 'Complete all lore volumes and maintain perfect discovery record',
            category: 'legendary',
            type: 'lore',
            requirements: { lore_volumes_complete: 'all', discovery_percentage: 100 },
            rewards: { xp: 150000, badge: 'keeper', title: 'Keeper of All Lore' },
            hidden: false
        }
    },

    // Faction-Specific Achievements
    faction: {
        human_purist: {
            name: 'Human Purist',
            description: 'Maintain 100% human faction purity for 100 days',
            category: 'faction',
            type: 'faction',
            requirements: { faction: 'human', purity: 1.0, duration_days: 100 },
            rewards: { xp: 2000, badge: 'human_pure', title: 'Human Purist' },
            hidden: false
        },
        ai_ascended: {
            name: 'Ascended AI',
            description: 'Achieve perfect AI faction alignment',
            category: 'faction',
            type: 'faction',
            requirements: { faction: 'ai', purity: 1.0, ai_achievements: 'all' },
            rewards: { xp: 2000, badge: 'ai_ascended', title: 'Ascended AI' },
            hidden: false
        },
        nature_harmonized: {
            name: 'Nature\'s Chosen',
            description: 'Achieve perfect harmony with nature',
            category: 'faction',
            type: 'faction',
            requirements: { faction: 'nature', purity: 1.0, nature_achievements: 'all' },
            rewards: { xp: 2000, badge: 'nature_harmony', title: 'Nature\'s Chosen' },
            hidden: false
        },
        hybrid_master: {
            name: 'Hybrid Master',
            description: 'Experience all three factions through children',
            category: 'faction',
            type: 'faction',
            requirements: { children_factions: ['human', 'ai', 'nature'] },
            rewards: { xp: 5000, badge: 'hybrid', title: 'Hybrid Master' },
            hidden: false
        }
    },

    // Game-Specific Achievements
    games: {
        tetris_master: {
            name: 'Tetris Master',
            description: 'Score 10,000+ points in Tetris',
            category: 'games',
            type: 'game_specific',
            requirements: { game: 'tetris', score: 10000 },
            rewards: { xp: 1000, badge: 'tetris_master', title: 'Block Master' },
            hidden: false
        },
        tictactoe_grandmaster: {
            name: 'Tic Tac Toe Grandmaster',
            description: 'Win 100 games of Tic Tac Toe',
            category: 'games',
            type: 'game_specific',
            requirements: { game: 'tictactoe', wins: 100 },
            rewards: { xp: 1500, badge: 'ttt_grandmaster', title: 'Strategy Master' },
            hidden: false
        }
    },

    // Arena Achievements
    arena: {
        practice_master: {
            name: 'Practice Master',
            description: 'Complete 100 practice sessions',
            category: 'arena',
            type: 'arena',
            requirements: { practice_sessions: 100 },
            rewards: { xp: 2000, badge: 'practice_master', title: 'Practice Master' },
            hidden: false
        },
        tournament_winner: {
            name: 'Tournament Winner',
            description: 'Win a major tournament',
            category: 'arena',
            type: 'arena',
            requirements: { tournament_wins: 1 },
            rewards: { xp: 5000, badge: 'tournament_winner', title: 'Tournament Champion' },
            hidden: false
        },
        boss_slayer: {
            name: 'Boss Slayer',
            description: 'Defeat a server-wide boss',
            category: 'arena',
            type: 'arena',
            requirements: { boss_defeats: 1 },
            rewards: { xp: 10000, badge: 'boss_slayer', title: 'Boss Slayer' },
            hidden: false
        }
    },

    // Resource Management Achievements
    resources: {
        resource_hoarder: {
            name: 'Resource Hoarder',
            description: 'Accumulate 10,000 of any resource',
            category: 'resources',
            type: 'resources',
            requirements: { max_resource: 10000 },
            rewards: { xp: 1500, badge: 'hoarder', title: 'Resource Hoarder' },
            hidden: false
        },
        efficient_manager: {
            name: 'Efficient Manager',
            description: 'Maintain positive resource balance for 30 days',
            category: 'resources',
            type: 'resources',
            requirements: { positive_balance_days: 30 },
            rewards: { xp: 2000, badge: 'efficient', title: 'Efficient Manager' },
            hidden: false
        }
    }
};

// Helper function to get all achievements
function getAllAchievements() {
    const allAchievements = {};
    
    for (const [category, achievements] of Object.entries(ACHIEVEMENT_CATEGORIES)) {
        for (const [key, achievement] of Object.entries(achievements)) {
            allAchievements[key] = {
                ...achievement,
                id: key
            };
        }
    }
    
    return allAchievements;
}

// Helper function to get achievements by category
function getAchievementsByCategory(category) {
    return ACHIEVEMENT_CATEGORIES[category] || {};
}

// Helper function to get achievements by type
function getAchievementsByType(type) {
    const allAchievements = getAllAchievements();
    return Object.values(allAchievements).filter(achievement => achievement.type === type);
}

// Helper function to check if user meets requirements
function checkAchievementRequirements(userStats, requirements) {
    for (const [requirement, value] of Object.entries(requirements)) {
        if (userStats[requirement] < value) {
            return false;
        }
    }
    return true;
}

module.exports = {
    ACHIEVEMENT_CATEGORIES,
    getAllAchievements,
    getAchievementsByCategory,
    getAchievementsByType,
    checkAchievementRequirements
};
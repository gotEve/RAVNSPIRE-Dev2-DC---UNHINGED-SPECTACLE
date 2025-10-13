const Database = require('../database/db');

class GlobalStatsManager {
    constructor() {
        // Variety bonus thresholds
        this.varietyThresholds = {
            low: 0.2,    // 0-20% variety = 1.0x multiplier
            medium: 0.5, // 20-50% variety = 1.1x multiplier
            high: 0.8,   // 50-80% variety = 1.25x multiplier
            max: 1.0     // 80-100% variety = 1.5x multiplier
        };
        
        // Activity level thresholds
        this.activityThresholds = {
            casual: 5,    // 0-5 activities per day
            active: 15,   // 6-15 activities per day
            hardcore: 30  // 16+ activities per day
        };
        
        // Progression balance caps
        this.progressionCaps = {
            singleGame: 0.5,    // Max 50% rewards if only playing 1 game
            twoGames: 0.75,     // Max 75% rewards if playing 2 games
            threeGames: 1.0,    // Full rewards if playing 3+ games
            allGames: 1.25      // 25% bonus if playing all games
        };
    }

    /**
     * Calculate variety bonus for a user
     */
    async calculateVarietyBonus(userId) {
        try {
            const userStats = await this.getUserGlobalStats(userId);
            if (!userStats) {
                return { multiplier: 1.0, variety: 0, category: 'none' };
            }

            const gameVariety = await this.getGameVariety(userId);
            const totalGames = gameVariety.reduce((sum, game) => sum + game.times_played, 0);
            const uniqueGames = gameVariety.length;
            
            if (totalGames === 0) {
                return { multiplier: 1.0, variety: 0, category: 'none' };
            }

            const varietyRatio = uniqueGames / totalGames;
            let multiplier = 1.0;
            let category = 'low';

            if (varietyRatio >= this.varietyThresholds.max) {
                multiplier = 1.5;
                category = 'max';
            } else if (varietyRatio >= this.varietyThresholds.high) {
                multiplier = 1.25;
                category = 'high';
            } else if (varietyRatio >= this.varietyThresholds.medium) {
                multiplier = 1.1;
                category = 'medium';
            } else {
                multiplier = 1.0;
                category = 'low';
            }

            return {
                multiplier,
                variety: varietyRatio,
                category,
                uniqueGames,
                totalGames
            };

        } catch (error) {
            console.error('Error calculating variety bonus:', error);
            return { multiplier: 1.0, variety: 0, category: 'error' };
        }
    }

    /**
     * Calculate activity level for a user
     */
    async calculateActivityLevel(userId) {
        try {
            const recentActivity = await this.getRecentActivity(userId, 7); // Last 7 days
            const avgDailyActivity = recentActivity / 7;

            let level = 'casual';
            if (avgDailyActivity >= this.activityThresholds.hardcore) {
                level = 'hardcore';
            } else if (avgDailyActivity >= this.activityThresholds.active) {
                level = 'active';
            }

            return {
                level,
                avgDailyActivity,
                recentActivity
            };

        } catch (error) {
            console.error('Error calculating activity level:', error);
            return { level: 'casual', avgDailyActivity: 0, recentActivity: 0 };
        }
    }

    /**
     * Apply progression balance to rewards
     */
    async applyProgressionBalance(userId, baseRewards) {
        try {
            const gameVariety = await this.getGameVariety(userId);
            const uniqueGames = gameVariety.length;
            
            let capMultiplier = 1.0;
            
            if (uniqueGames === 1) {
                capMultiplier = this.progressionCaps.singleGame;
            } else if (uniqueGames === 2) {
                capMultiplier = this.progressionCaps.twoGames;
            } else if (uniqueGames >= 3) {
                capMultiplier = this.progressionCaps.threeGames;
            }

            // Check if playing all available games
            const allGameTypes = await this.getAllGameTypes();
            if (uniqueGames >= allGameTypes.length) {
                capMultiplier = this.progressionCaps.allGames;
            }

            // Apply cap to rewards
            const balancedRewards = {};
            for (const [rewardType, amount] of Object.entries(baseRewards)) {
                balancedRewards[rewardType] = Math.floor(amount * capMultiplier);
            }

            return {
                rewards: balancedRewards,
                capMultiplier,
                uniqueGames,
                totalGameTypes: allGameTypes.length
            };

        } catch (error) {
            console.error('Error applying progression balance:', error);
            return { rewards: baseRewards, capMultiplier: 1.0, uniqueGames: 0, totalGameTypes: 0 };
        }
    }

    /**
     * Update user's global stats
     */
    async updateUserGlobalStats(userId, activityType, activityData = {}) {
        try {
            // Get current stats
            let userStats = await this.getUserGlobalStats(userId);
            
            if (!userStats) {
                // Initialize new user stats
                userStats = {
                    discord_id: userId,
                    stats_data: {
                        games_played: {},
                        social_activity: {},
                        faction_activity: {},
                        resource_activity: {},
                        care_activity: {}
                    },
                    variety_score: 0,
                    activity_level: 'casual',
                    last_calculated: new Date().toISOString()
                };
            }

            // Update activity data
            const statsData = userStats.stats_data || {};
            
            switch (activityType) {
                case 'game_completed':
                    this.updateGameStats(statsData, activityData);
                    break;
                case 'social_interaction':
                    this.updateSocialStats(statsData, activityData);
                    break;
                case 'faction_activity':
                    this.updateFactionStats(statsData, activityData);
                    break;
                case 'resource_activity':
                    this.updateResourceStats(statsData, activityData);
                    break;
                case 'care_activity':
                    this.updateCareStats(statsData, activityData);
                    break;
            }

            // Recalculate variety score and activity level
            const varietyBonus = await this.calculateVarietyBonus(userId);
            const activityLevel = await this.calculateActivityLevel(userId);

            // Update database
            await Database.query(`
                INSERT OR REPLACE INTO player_global_stats (
                    discord_id, stats_data, variety_score, activity_level, last_calculated
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                userId,
                JSON.stringify(statsData),
                varietyBonus.variety,
                activityLevel.level,
                new Date().toISOString()
            ]);

            return {
                varietyBonus,
                activityLevel,
                updatedStats: statsData
            };

        } catch (error) {
            console.error('Error updating user global stats:', error);
            throw error;
        }
    }

    /**
     * Get user's global stats
     */
    async getUserGlobalStats(userId) {
        try {
            const result = await Database.query(`
                SELECT * FROM player_global_stats WHERE discord_id = ?
            `, [userId]);

            if (result.rows.length === 0) {
                return null;
            }

            const stats = result.rows[0];
            stats.stats_data = JSON.parse(stats.stats_data || '{}');
            return stats;

        } catch (error) {
            console.error('Error getting user global stats:', error);
            return null;
        }
    }

    /**
     * Get game variety for a user
     */
    async getGameVariety(userId) {
        try {
            const result = await Database.query(`
                SELECT * FROM game_variety_log WHERE discord_id = ?
                ORDER BY times_played DESC
            `, [userId]);

            return result.rows;

        } catch (error) {
            console.error('Error getting game variety:', error);
            return [];
        }
    }

    /**
     * Get recent activity for a user
     */
    async getRecentActivity(userId, days = 7) {
        try {
            // Simplified activity calculation - just count game sessions for now
            const result = await Database.query(`
                SELECT COUNT(*) as activity_count
                FROM game_sessions 
                WHERE user_id = ? AND start_time > datetime('now', '-${days} days')
            `, [userId]);

            return result.rows[0]?.activity_count || 0;

        } catch (error) {
            console.error('Error getting recent activity:', error);
            return 0;
        }
    }

    /**
     * Get all available game types
     */
    async getAllGameTypes() {
        try {
            const result = await Database.query(`
                SELECT DISTINCT game_name FROM game_sessions
                WHERE game_name IS NOT NULL
            `);

            return result.rows.map(row => row.game_name);

        } catch (error) {
            console.error('Error getting all game types:', error);
            return ['trivia', 'tetris', 'tictactoe']; // Fallback
        }
    }

    /**
     * Update game statistics
     */
    updateGameStats(statsData, activityData) {
        if (!statsData.games_played) {
            statsData.games_played = {};
        }

        const gameType = activityData.game_type || 'unknown';
        if (!statsData.games_played[gameType]) {
            statsData.games_played[gameType] = {
                times_played: 0,
                total_score: 0,
                best_score: 0,
                last_played: null
            };
        }

        statsData.games_played[gameType].times_played++;
        statsData.games_played[gameType].total_score += activityData.score || 0;
        statsData.games_played[gameType].best_score = Math.max(
            statsData.games_played[gameType].best_score,
            activityData.score || 0
        );
        statsData.games_played[gameType].last_played = new Date().toISOString();
    }

    /**
     * Update social statistics
     */
    updateSocialStats(statsData, activityData) {
        if (!statsData.social_activity) {
            statsData.social_activity = {};
        }

        const interactionType = activityData.interaction_type || 'unknown';
        if (!statsData.social_activity[interactionType]) {
            statsData.social_activity[interactionType] = {
                count: 0,
                last_interaction: null
            };
        }

        statsData.social_activity[interactionType].count++;
        statsData.social_activity[interactionType].last_interaction = new Date().toISOString();
    }

    /**
     * Update faction statistics
     */
    updateFactionStats(statsData, activityData) {
        if (!statsData.faction_activity) {
            statsData.faction_activity = {};
        }

        const faction = activityData.faction || 'unknown';
        if (!statsData.faction_activity[faction]) {
            statsData.faction_activity[faction] = {
                activities: 0,
                last_activity: null
            };
        }

        statsData.faction_activity[faction].activities++;
        statsData.faction_activity[faction].last_activity = new Date().toISOString();
    }

    /**
     * Update resource statistics
     */
    updateResourceStats(statsData, activityData) {
        if (!statsData.resource_activity) {
            statsData.resource_activity = {};
        }

        const resourceType = activityData.resource_type || 'unknown';
        if (!statsData.resource_activity[resourceType]) {
            statsData.resource_activity[resourceType] = {
                transactions: 0,
                total_amount: 0,
                last_transaction: null
            };
        }

        statsData.resource_activity[resourceType].transactions++;
        statsData.resource_activity[resourceType].total_amount += activityData.amount || 0;
        statsData.resource_activity[resourceType].last_transaction = new Date().toISOString();
    }

    /**
     * Update care statistics
     */
    updateCareStats(statsData, activityData) {
        if (!statsData.care_activity) {
            statsData.care_activity = {};
        }

        const careType = activityData.care_type || 'unknown';
        if (!statsData.care_activity[careType]) {
            statsData.care_activity[careType] = {
                actions: 0,
                last_action: null
            };
        }

        statsData.care_activity[careType].actions++;
        statsData.care_activity[careType].last_action = new Date().toISOString();
    }

    /**
     * Get global leaderboards
     */
    async getGlobalLeaderboards(category = 'variety', limit = 10) {
        try {
            let query;
            let orderBy;

            switch (category) {
                case 'variety':
                    query = `
                        SELECT discord_id, variety_score, activity_level
                        FROM player_global_stats
                        ORDER BY variety_score DESC
                        LIMIT ?
                    `;
                    break;
                case 'activity':
                    query = `
                        SELECT discord_id, activity_level, last_calculated
                        FROM player_global_stats
                        WHERE activity_level = 'hardcore'
                        ORDER BY last_calculated DESC
                        LIMIT ?
                    `;
                    break;
                case 'games':
                    query = `
                        SELECT discord_id, stats_data
                        FROM player_global_stats
                        ORDER BY JSON_EXTRACT(stats_data, '$.games_played.total') DESC
                        LIMIT ?
                    `;
                    break;
                default:
                    throw new Error('Invalid leaderboard category');
            }

            const result = await Database.query(query, [limit]);
            return result.rows;

        } catch (error) {
            console.error('Error getting global leaderboards:', error);
            return [];
        }
    }

    /**
     * Get variety bonus breakdown for a user
     */
    async getVarietyBreakdown(userId) {
        try {
            const gameVariety = await this.getGameVariety(userId);
            const varietyBonus = await this.calculateVarietyBonus(userId);
            const allGameTypes = await this.getAllGameTypes();

            const breakdown = {
                current: varietyBonus,
                games: gameVariety,
                available: allGameTypes,
                recommendations: []
            };

            // Generate recommendations
            if (varietyBonus.category === 'low') {
                breakdown.recommendations.push('Try playing different games to increase your variety bonus');
            }
            if (gameVariety.length < allGameTypes.length) {
                const missingGames = allGameTypes.filter(game => 
                    !gameVariety.some(userGame => userGame.game_type === game)
                );
                breakdown.recommendations.push(`Try these games: ${missingGames.join(', ')}`);
            }

            return breakdown;

        } catch (error) {
            console.error('Error getting variety breakdown:', error);
            return null;
        }
    }
}

module.exports = new GlobalStatsManager();

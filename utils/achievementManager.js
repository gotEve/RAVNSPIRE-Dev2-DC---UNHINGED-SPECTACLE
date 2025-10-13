// Achievement Manager
// Handles checking, awarding, and tracking achievements

const Database = require('../database/db');
const { getAllAchievements, checkAchievementRequirements } = require('../config/achievementConfig');

class AchievementManager {
    constructor() {
        this.achievements = getAllAchievements();
    }

    /**
     * Check and award achievements for a user
     * @param {string} userId - Discord user ID
     * @param {Object} userStats - Current user statistics
     * @param {string} triggerType - Type of action that triggered the check
     * @returns {Array} Array of newly unlocked achievements
     */
    async checkAndAwardAchievements(userId, userStats, triggerType = 'general') {
        const newlyUnlocked = [];

        try {
            // Get user's current achievements
            const userAchievements = await this.getUserAchievements(userId);
            const unlockedAchievementIds = new Set(userAchievements.map(ua => ua.achievement_id));

            // Check each achievement
            for (const [achievementId, achievement] of Object.entries(this.achievements)) {
                // Skip if already unlocked
                if (unlockedAchievementIds.has(achievementId)) {
                    continue;
                }

                // Check if user meets requirements
                if (checkAchievementRequirements(userStats, achievement.requirements)) {
                    // Award the achievement
                    await this.awardAchievement(userId, achievementId, achievement);
                    newlyUnlocked.push(achievement);
                }
            }

            return newlyUnlocked;
        } catch (error) {
            console.error('Error checking achievements:', error);
            return [];
        }
    }

    /**
     * Award a specific achievement to a user
     * @param {string} userId - Discord user ID
     * @param {string} achievementId - Achievement ID
     * @param {Object} achievement - Achievement data
     */
    async awardAchievement(userId, achievementId, achievement) {
        try {
            // Create achievement record if it doesn't exist
            await this.ensureAchievementExists(achievementId, achievement);

            // Award to user
            await Database.unlockAchievement(userId, achievementId, {
                unlocked_at: new Date().toISOString(),
                trigger: 'system_check'
            });

            // Apply rewards
            await this.applyAchievementRewards(userId, achievement);

            console.log(`Achievement unlocked: ${achievement.name} for user ${userId}`);
        } catch (error) {
            console.error(`Error awarding achievement ${achievementId}:`, error);
        }
    }

    /**
     * Apply achievement rewards to user
     * @param {string} userId - Discord user ID
     * @param {Object} achievement - Achievement data
     */
    async applyAchievementRewards(userId, achievement) {
        const rewards = achievement.rewards;

        try {
            // Award XP
            if (rewards.xp) {
                await Database.updateUserXP(userId, rewards.xp);
            }

            // Award currency (if specified)
            if (rewards.currency) {
                await Database.updateUserCurrency(userId, rewards.currency);
            }

            // Award badge
            if (rewards.badge) {
                await this.awardBadge(userId, rewards.badge);
            }

            // Award title
            if (rewards.title) {
                await this.awardTitle(userId, rewards.title);
            }

        } catch (error) {
            console.error('Error applying achievement rewards:', error);
        }
    }

    /**
     * Award a badge to a user
     * @param {string} userId - Discord user ID
     * @param {string} badgeName - Badge name
     */
    async awardBadge(userId, badgeName) {
        try {
            const query = `
                INSERT INTO user_badges (discord_id, badge_name, earned_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (discord_id, badge_name) DO NOTHING
            `;
            await Database.query(query, [userId, badgeName]);
        } catch (error) {
            console.error('Error awarding badge:', error);
        }
    }

    /**
     * Award a title to a user
     * @param {string} userId - Discord user ID
     * @param {string} titleName - Title name
     */
    async awardTitle(userId, titleName) {
        try {
            const query = `
                INSERT INTO user_titles (discord_id, title_name, earned_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (discord_id, title_name) DO NOTHING
            `;
            await Database.query(query, [userId, titleName]);
        } catch (error) {
            console.error('Error awarding title:', error);
        }
    }

    /**
     * Ensure achievement exists in database
     * @param {string} achievementId - Achievement ID
     * @param {Object} achievement - Achievement data
     */
    async ensureAchievementExists(achievementId, achievement) {
        try {
            // Check if achievement already exists by name
            const existing = await Database.query(
                'SELECT id FROM achievements WHERE name = $1',
                [achievement.name]
            );

            if (existing.rows.length === 0) {
                const query = `
                    INSERT INTO achievements (name, description, category, type, requirements, rewards, hidden)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;
                await Database.query(query, [
                    achievement.name,
                    achievement.description,
                    achievement.category,
                    achievement.type,
                    JSON.stringify(achievement.requirements),
                    JSON.stringify(achievement.rewards),
                    achievement.hidden || false
                ]);
                console.log(`✅ Created achievement: ${achievement.name}`);
            } else {
                console.log(`✅ Achievement already exists: ${achievement.name}`);
            }
        } catch (error) {
            // If it's a UNIQUE constraint error, the achievement already exists
            if (error.message.includes('UNIQUE constraint failed')) {
                console.log(`✅ Achievement already exists (constraint): ${achievement.name}`);
                return;
            }
            console.error('Error ensuring achievement exists:', error);
            throw error;
        }
    }

    /**
     * Get user's achievements
     * @param {string} userId - Discord user ID
     * @returns {Array} User's achievements
     */
    async getUserAchievements(userId) {
        try {
            return await Database.getUserAchievements(userId);
        } catch (error) {
            console.error('Error getting user achievements:', error);
            return [];
        }
    }

    /**
     * Get user's badges
     * @param {string} userId - Discord user ID
     * @returns {Array} User's badges
     */
    async getUserBadges(userId) {
        try {
            const query = 'SELECT * FROM user_badges WHERE discord_id = $1 ORDER BY earned_at DESC';
            const result = await Database.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Error getting user badges:', error);
            return [];
        }
    }

    /**
     * Get user's titles
     * @param {string} userId - Discord user ID
     * @returns {Array} User's titles
     */
    async getUserTitles(userId) {
        try {
            const query = 'SELECT * FROM user_titles WHERE discord_id = $1 ORDER BY earned_at DESC';
            const result = await Database.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Error getting user titles:', error);
            return [];
        }
    }

    /**
     * Get achievement progress for a user
     * @param {string} userId - Discord user ID
     * @param {string} achievementId - Achievement ID
     * @returns {Object} Progress data
     */
    async getAchievementProgress(userId, achievementId) {
        try {
            const achievement = this.achievements[achievementId];
            if (!achievement) return null;

            const userStats = await this.getUserStats(userId);
            const requirements = achievement.requirements;
            
            const progress = {};
            for (const [requirement, target] of Object.entries(requirements)) {
                const current = userStats[requirement] || 0;
                progress[requirement] = {
                    current: current,
                    target: target,
                    percentage: Math.min((current / target) * 100, 100)
                };
            }

            return {
                achievement,
                progress,
                completed: checkAchievementRequirements(userStats, requirements)
            };
        } catch (error) {
            console.error('Error getting achievement progress:', error);
            return null;
        }
    }

    /**
     * Get comprehensive user stats for achievement checking
     * @param {string} userId - Discord user ID
     * @returns {Object} User statistics
     */
    async getUserStats(userId) {
        try {
            const user = await Database.getUser(userId);
            const userAchievements = await this.getUserAchievements(userId);
            const userBadges = await this.getUserBadges(userId);
            const userTitles = await this.getUserTitles(userId);

            // Get game statistics
            const gameStatsQuery = `
                SELECT 
                    COUNT(*) as games_played,
                    COUNT(CASE WHEN final_score > 0 THEN 1 END) as games_won,
                    AVG(final_score) as average_score,
                    MAX(final_score) as max_score
                FROM game_sessions 
                WHERE user_id = $1 AND state = 'completed'
            `;
            const gameStats = await Database.query(gameStatsQuery, [userId]);

            // Get lore statistics
            const loreStatsQuery = `
                SELECT COUNT(*) as lore_discovered
                FROM lore_discoveries 
                WHERE discord_id = $1
            `;
            const loreStats = await Database.query(loreStatsQuery, [userId]);

            // Get guild statistics
            const guildStatsQuery = `
                SELECT g.name, gm.role, gm.joined_at
                FROM guilds g
                JOIN guild_members gm ON g.id = gm.guild_id
                WHERE gm.discord_id = $1
            `;
            const guildStats = await Database.query(guildStatsQuery, [userId]);

            return {
                // Basic stats
                games_played: gameStats.rows[0]?.games_played || 0,
                games_won: gameStats.rows[0]?.games_won || 0,
                average_score: gameStats.rows[0]?.average_score || 0,
                max_score: gameStats.rows[0]?.max_score || 0,
                lore_discovered: loreStats.rows[0]?.lore_discovered || 0,
                
                // Guild stats
                guild_joined: guildStats.rows.length > 0,
                guild_role: guildStats.rows[0]?.role || null,
                
                // Achievement stats
                achievements_unlocked: userAchievements.length,
                badges_earned: userBadges.length,
                titles_earned: userTitles.length,
                
                // Faction stats
                current_faction: user?.current_faction || 'human',
                faction_purity: user?.faction_purity || 1.0,
                
                // Resource stats
                currency: user?.currency || 0,
                global_xp: user?.global_xp || 0
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return {};
        }
    }

    /**
     * Initialize all achievements in the database
     */
    async initializeAchievements() {
        console.log('Initializing achievements in database...');
        
        for (const [achievementId, achievement] of Object.entries(this.achievements)) {
            await this.ensureAchievementExists(achievementId, achievement);
        }
        
        console.log(`Initialized ${Object.keys(this.achievements).length} achievements`);
    }
}

// Create singleton instance
const achievementManager = new AchievementManager();

module.exports = achievementManager;

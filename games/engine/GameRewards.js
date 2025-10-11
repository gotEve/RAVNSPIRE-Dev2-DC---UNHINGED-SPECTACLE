// Game rewards calculation and distribution system
const Database = require('../../database/db');
const config = require('../../config/config');
const achievementConfig = require('../../config/achievementConfig');

class GameRewards {
    constructor() {
        this.rewardTypes = {
            XP: 'xp',
            CURRENCY: 'currency',
            BADGE: 'badge',
            TITLE: 'title',
            LORE_UNLOCK: 'lore_unlock',
            ITEM: 'item'
        };
    }

    // Calculate base rewards for a game completion
    calculateBaseRewards(gameConfig, gameResult) {
        const baseRewards = {
            xp: gameConfig.rewards?.xp || config.games.baseXP,
            currency: gameConfig.rewards?.currency || config.games.baseCurrency,
            bonuses: {}
        };

        // Apply game-specific bonuses
        if (gameConfig.rewards?.bonus) {
            for (const [bonusType, bonusConfig] of Object.entries(gameConfig.rewards.bonus)) {
                if (this.checkBonusCondition(bonusType, gameResult)) {
                    baseRewards.xp += bonusConfig.xp || 0;
                    baseRewards.currency += bonusConfig.currency || 0;
                    baseRewards.bonuses[bonusType] = bonusConfig;
                }
            }
        }

        return baseRewards;
    }

    // Check if bonus condition is met
    checkBonusCondition(bonusType, gameResult) {
        switch (bonusType) {
            case 'perfect':
                return gameResult.perfectScore || false;
            case 'streak':
                return gameResult.streak >= 3;
            case 'speed':
                return gameResult.completionTime < (gameResult.expectedTime * 0.5);
            case 'accuracy':
                return gameResult.accuracy >= 0.95;
            case 'completion':
                return gameResult.completed || false;
            case 'exploration':
                return gameResult.hiddenItemsFound > 0;
            default:
                return false;
        }
    }

    // Apply level multipliers
    applyLevelMultipliers(rewards, userLevel) {
        const levelMultiplier = Math.pow(config.games.levelMultiplier, userLevel - 1);
        
        rewards.xp = Math.floor(rewards.xp * levelMultiplier);
        rewards.currency = Math.floor(rewards.currency * levelMultiplier);
        rewards.bonuses.level = levelMultiplier;

        return rewards;
    }

    // Apply guild bonuses
    async applyGuildBonuses(rewards, userId) {
        const guildInfo = await Database.getUserGuild(userId);
        if (!guildInfo) return rewards;

        // Guild level bonus
        const guildLevelBonus = 1 + (guildInfo.level * 0.05); // 5% per guild level
        
        // Guild building bonuses
        const buildingBonuses = await this.getGuildBuildingBonuses(guildInfo.id);
        
        rewards.xp = Math.floor(rewards.xp * guildLevelBonus * buildingBonuses.xp);
        rewards.currency = Math.floor(rewards.currency * guildLevelBonus * buildingBonuses.currency);
        rewards.bonuses.guild = {
            level: guildLevelBonus,
            buildings: buildingBonuses
        };

        return rewards;
    }

    // Get guild building bonuses
    async getGuildBuildingBonuses(guildId) {
        const query = `
            SELECT building_type, level 
            FROM neighborhood_buildings nb
            JOIN neighborhood_plots np ON nb.neighborhood_id = np.neighborhood_id
            WHERE np.guild_id = $1
        `;
        const result = await Database.query(query, [guildId]);
        
        let xpBonus = 1;
        let currencyBonus = 1;

        result.rows.forEach(building => {
            const buildingConfig = config.neighborhoods.buildings[building.building_type];
            if (buildingConfig?.benefits) {
                if (buildingConfig.benefits.includes('xp_bonus')) {
                    xpBonus += building.level * 0.1; // 10% per level
                }
                if (buildingConfig.benefits.includes('currency_bonus')) {
                    currencyBonus += building.level * 0.1; // 10% per level
                }
            }
        });

        return { xp: xpBonus, currency: currencyBonus };
    }

    // Apply neighborhood bonuses
    async applyNeighborhoodBonuses(rewards, userId) {
        const neighborhoodQuery = `
            SELECT n.id, n.name, n.defense_level
            FROM neighborhoods n
            JOIN neighborhood_plots np ON n.id = np.neighborhood_id
            JOIN guild_members gm ON np.guild_id = gm.guild_id
            WHERE gm.discord_id = $1
        `;
        const result = await Database.query(neighborhoodQuery, [userId]);
        
        if (result.rows.length === 0) return rewards;

        const neighborhood = result.rows[0];
        const defenseBonus = 1 + (neighborhood.defense_level * 0.02); // 2% per defense level

        rewards.xp = Math.floor(rewards.xp * defenseBonus);
        rewards.currency = Math.floor(rewards.currency * defenseBonus);
        rewards.bonuses.neighborhood = {
            defense: defenseBonus,
            name: neighborhood.name
        };

        return rewards;
    }

    // Apply achievement bonuses
    async applyAchievementBonuses(rewards, userId) {
        const achievementQuery = `
            SELECT a.rewards
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.discord_id = $1 AND a.rewards ? 'bonus'
        `;
        const result = await Database.query(achievementQuery, [userId]);
        
        let xpBonus = 0;
        let currencyBonus = 0;

        result.rows.forEach(achievement => {
            const achievementRewards = achievement.rewards;
            if (achievementRewards.bonus) {
                xpBonus += achievementRewards.bonus.xp || 0;
                currencyBonus += achievementRewards.bonus.currency || 0;
            }
        });

        rewards.xp += xpBonus;
        rewards.currency += currencyBonus;
        rewards.bonuses.achievements = { xp: xpBonus, currency: currencyBonus };

        return rewards;
    }

    // Calculate final rewards
    async calculateFinalRewards(gameConfig, gameResult, userId) {
        let rewards = this.calculateBaseRewards(gameConfig, gameResult);
        
        // Get user level
        const user = await Database.getUser(userId);
        const userLevel = Math.floor(user.global_xp / 100) + 1;
        
        // Apply multipliers
        rewards = this.applyLevelMultipliers(rewards, userLevel);
        rewards = await this.applyGuildBonuses(rewards, userId);
        rewards = await this.applyNeighborhoodBonuses(rewards, userId);
        rewards = await this.applyAchievementBonuses(rewards, userId);

        return rewards;
    }

    // Distribute rewards to user
    async distributeRewards(userId, rewards) {
        const results = {
            xp: 0,
            currency: 0,
            badges: [],
            titles: [],
            loreUnlocks: [],
            items: []
        };

        // Update XP and currency
        if (rewards.xp > 0) {
            await Database.updateUserXP(userId, rewards.xp);
            results.xp = rewards.xp;
        }

        if (rewards.currency > 0) {
            await Database.updateUserCurrency(userId, rewards.currency);
            results.currency = rewards.currency;
        }

        // Handle special rewards
        if (rewards.badges) {
            for (const badge of rewards.badges) {
                await this.grantBadge(userId, badge);
                results.badges.push(badge);
            }
        }

        if (rewards.titles) {
            for (const title of rewards.titles) {
                await this.grantTitle(userId, title);
                results.titles.push(title);
            }
        }

        if (rewards.loreUnlocks) {
            for (const loreId of rewards.loreUnlocks) {
                await this.unlockLore(userId, loreId);
                results.loreUnlocks.push(loreId);
            }
        }

        return results;
    }

    // Grant a badge to user
    async grantBadge(userId, badgeName) {
        const query = `
            INSERT INTO user_badges (discord_id, badge_name, earned_at) 
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (discord_id, badge_name) DO NOTHING
        `;
        await Database.query(query, [userId, badgeName]);
    }

    // Grant a title to user
    async grantTitle(userId, titleName) {
        const query = `
            INSERT INTO user_titles (discord_id, title_name, earned_at) 
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (discord_id, title_name) DO NOTHING
        `;
        await Database.query(query, [userId, titleName]);
    }

    // Unlock lore for user
    async unlockLore(userId, loreId) {
        const query = `
            INSERT INTO lore_discoveries (discord_id, lore_id, discovered_at) 
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (discord_id, lore_id) DO NOTHING
        `;
        await Database.query(query, [userId, loreId]);
    }

    // Check for achievement unlocks
    async checkAchievementUnlocks(userId, gameResult) {
        const unlockedAchievements = [];

        // Get all achievements
        const achievementsQuery = 'SELECT * FROM achievements WHERE type = $1 OR type = $2';
        const achievements = await Database.query(achievementsQuery, ['global', 'game-specific']);

        for (const achievement of achievements.rows) {
            // Check if user already has this achievement
            const existingQuery = 'SELECT * FROM user_achievements WHERE discord_id = $1 AND achievement_id = $2';
            const existing = await Database.query(existingQuery, [userId, achievement.id]);
            
            if (existing.rows.length > 0) continue;

            // Check if requirements are met
            if (this.checkAchievementRequirements(achievement, gameResult, userId)) {
                await Database.unlockAchievement(userId, achievement.id);
                unlockedAchievements.push(achievement);
            }
        }

        return unlockedAchievements;
    }

    // Check if achievement requirements are met
    async checkAchievementRequirements(achievement, gameResult, userId) {
        const requirements = achievement.requirements;
        
        for (const [requirement, value] of Object.entries(requirements)) {
            switch (requirement) {
                case 'games_played':
                    const gamesPlayed = await this.getUserGamesPlayed(userId);
                    if (gamesPlayed < value) return false;
                    break;
                case 'perfect_score':
                    if (!gameResult.perfectScore && value > 0) return false;
                    break;
                case 'streak':
                    if (gameResult.streak < value) return false;
                    break;
                case 'level':
                    const user = await Database.getUser(userId);
                    const userLevel = Math.floor(user.global_xp / 100) + 1;
                    if (userLevel < value) return false;
                    break;
                // Add more requirement checks as needed
            }
        }

        return true;
    }

    // Get user's total games played
    async getUserGamesPlayed(userId) {
        const query = 'SELECT COUNT(*) as count FROM game_progress WHERE discord_id = $1';
        const result = await Database.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    // Create reward summary embed
    createRewardSummary(rewards, bonuses = {}) {
        const { EmbedBuilder } = require('discord.js');
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 Rewards Earned!')
            .setColor(0x00FF00)
            .setTimestamp();

        embed.addFields(
            { name: 'XP', value: rewards.xp.toString(), inline: true },
            { name: 'Currency', value: rewards.currency.toString(), inline: true }
        );

        if (Object.keys(bonuses).length > 0) {
            const bonusText = Object.entries(bonuses)
                .map(([key, value]) => `${key}: ${value}x`)
                .join(' | ');
            embed.addFields({ name: 'Bonuses', value: bonusText, inline: false });
        }

        return embed;
    }
}

module.exports = GameRewards;

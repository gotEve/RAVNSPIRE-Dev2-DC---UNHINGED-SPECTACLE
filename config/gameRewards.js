// Standardized Game Rewards System
// Provides consistent reward structure across all games

const STANDARD_GAME_REWARDS = {
    base: {
        currency: 10,
        xp: 50
    },
    factionResources: {
        human: { 
            food: 5, 
            water: 3 
        },
        ai: { 
            energy: 5, 
            data_fragments: 2 
        },
        nature: { 
            biomass: 5, 
            organic_matter: 3 
        }
    },
    multipliers: {
        completion: 1.0,
        speed_bonus: 0.2, // Up to 20% more for fast completion
        accuracy_bonus: 0.3, // Up to 30% more for high accuracy
        streak_bonus: 0.1, // Per consecutive win (max 5 = 50%)
        variety_bonus: 0.5, // Up to 50% more for playing different games
        guild_bonus: 0.1, // 10% bonus for guild members
        plot_bonus: 0.05 // 5% bonus per plot tier (max 25%)
    },
    caps: {
        max_speed_bonus: 0.2,
        max_accuracy_bonus: 0.3,
        max_streak_bonus: 0.5,
        max_variety_bonus: 0.5,
        max_total_bonus: 2.0 // Maximum 200% total bonus
    }
};

class GameRewardCalculator {
    constructor() {
        this.baseRewards = STANDARD_GAME_REWARDS;
    }

    /**
     * Calculate rewards for a completed game
     * @param {Object} gameData - Game completion data
     * @param {string} gameData.gameType - Type of game played
     * @param {number} gameData.score - Final score achieved
     * @param {number} gameData.duration - Time taken in milliseconds
     * @param {number} gameData.accuracy - Accuracy percentage (0-100)
     * @param {string} gameData.userFaction - User's current faction
     * @param {Object} userStats - User's global statistics
     * @param {Object} userStats.gamesPlayed - Games played by type
     * @param {number} userStats.winStreak - Current win streak
     * @param {Object} userStats.guild - Guild information
     * @param {Object} userStats.plots - Plot information
     * @returns {Object} Calculated rewards
     */
    calculateRewards(gameData, userStats = {}) {
        const base = this.baseRewards.base;
        const factionResources = this.baseRewards.factionResources[gameData.userFaction] || {};
        
        // Calculate multipliers
        const speedMultiplier = this.calculateSpeedBonus(gameData);
        const accuracyMultiplier = this.calculateAccuracyBonus(gameData);
        const streakMultiplier = this.calculateStreakBonus(userStats.winStreak || 0);
        const varietyMultiplier = this.calculateVarietyBonus(userStats.gamesPlayed || {});
        const guildMultiplier = this.calculateGuildBonus(userStats.guild);
        const plotMultiplier = this.calculatePlotBonus(userStats.plots);

        // Calculate total multiplier (capped)
        const totalMultiplier = Math.min(
            1 + speedMultiplier + accuracyMultiplier + streakMultiplier + 
            varietyMultiplier + guildMultiplier + plotMultiplier,
            this.baseRewards.caps.max_total_bonus
        );

        // Calculate final rewards
        const finalCurrency = Math.floor(base.currency * totalMultiplier);
        const finalXP = Math.floor(base.xp * totalMultiplier);
        
        const finalFactionResources = {};
        for (const [resource, amount] of Object.entries(factionResources)) {
            finalFactionResources[resource] = Math.floor(amount * totalMultiplier);
        }

        return {
            currency: finalCurrency,
            xp: finalXP,
            factionResources: finalFactionResources,
            multipliers: {
                speed: speedMultiplier,
                accuracy: accuracyMultiplier,
                streak: streakMultiplier,
                variety: varietyMultiplier,
                guild: guildMultiplier,
                plot: plotMultiplier,
                total: totalMultiplier
            },
            breakdown: {
                baseCurrency: base.currency,
                baseXP: base.xp,
                baseFactionResources: factionResources,
                totalMultiplier: totalMultiplier
            }
        };
    }

    calculateSpeedBonus(gameData) {
        // Assume 5 minutes is standard duration
        const standardDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
        const actualDuration = gameData.duration || standardDuration;
        
        // Faster completion = higher bonus
        const speedRatio = Math.max(0, (standardDuration - actualDuration) / standardDuration);
        return Math.min(speedRatio * this.baseRewards.multipliers.speed_bonus, 
                       this.baseRewards.caps.max_speed_bonus);
    }

    calculateAccuracyBonus(gameData) {
        const accuracy = gameData.accuracy || 0;
        // 100% accuracy = max bonus
        const accuracyRatio = accuracy / 100;
        return Math.min(accuracyRatio * this.baseRewards.multipliers.accuracy_bonus,
                       this.baseRewards.caps.max_accuracy_bonus);
    }

    calculateStreakBonus(winStreak) {
        const cappedStreak = Math.min(winStreak, 5); // Max 5 streak bonus
        return cappedStreak * this.baseRewards.multipliers.streak_bonus;
    }

    calculateVarietyBonus(gamesPlayed) {
        const totalGames = Object.values(gamesPlayed).reduce((sum, count) => sum + count, 0);
        const uniqueGames = Object.keys(gamesPlayed).length;
        
        if (totalGames === 0) return 0;
        
        const varietyRatio = uniqueGames / totalGames;
        return Math.min(varietyRatio * this.baseRewards.multipliers.variety_bonus,
                       this.baseRewards.caps.max_variety_bonus);
    }

    calculateGuildBonus(guild) {
        return guild ? this.baseRewards.multipliers.guild_bonus : 0;
    }

    calculatePlotBonus(plots) {
        if (!plots || !plots.tier) return 0;
        return Math.min(plots.tier * this.baseRewards.multipliers.plot_bonus, 0.25);
    }

    /**
     * Get base rewards for a specific game type
     * @param {string} gameType - Type of game
     * @returns {Object} Base rewards for the game
     */
    getBaseRewards(gameType) {
        return {
            currency: this.baseRewards.base.currency,
            xp: this.baseRewards.base.xp,
            factionResources: this.baseRewards.factionResources
        };
    }

    /**
     * Get all available multipliers
     * @returns {Object} All multiplier configurations
     */
    getMultipliers() {
        return this.baseRewards.multipliers;
    }

    /**
     * Get multiplier caps
     * @returns {Object} All multiplier caps
     */
    getCaps() {
        return this.baseRewards.caps;
    }
}

// Create singleton instance
const gameRewardCalculator = new GameRewardCalculator();

module.exports = {
    STANDARD_GAME_REWARDS,
    GameRewardCalculator,
    gameRewardCalculator
};

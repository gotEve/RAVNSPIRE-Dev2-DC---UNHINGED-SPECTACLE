// Abstract base class for all games
const { EmbedBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const config = require('../../config/config');

class GameBase {
    constructor(gameName, gameConfig) {
        this.gameName = gameName;
        this.config = gameConfig;
        this.sessionId = null;
        this.userId = null;
        this.startTime = null;
        this.endTime = null;
        this.score = 0;
        this.level = 1;
        this.state = 'waiting'; // waiting, playing, paused, completed, abandoned
        this.data = {}; // Game-specific data
    }

    // Get game metadata for registry
    getMetadata() {
        return {
            id: this.gameName,
            name: this.config.name,
            description: this.config.description,
            category: this.config.category || 'general',
            minPlayers: this.config.minPlayers || 1,
            maxPlayers: this.config.maxPlayers || 1,
            duration: this.config.duration || 300, // 5 minutes default
            rewards: this.config.rewards || {}
        };
    }

    // Abstract methods that must be implemented by subclasses
    async initialize(userId, options = {}) {
        throw new Error('initialize() must be implemented by subclass');
    }

    async processInput(input) {
        throw new Error('processInput() must be implemented by subclass');
    }

    async getGameState() {
        throw new Error('getGameState() must be implemented by subclass');
    }

    async endGame(reason = 'completed') {
        throw new Error('endGame() must be implemented by subclass');
    }

    // Common methods
    async startGame(userId, options = {}) {
        this.userId = userId;
        this.startTime = new Date();
        this.state = 'playing';
        this.sessionId = this.generateSessionId();

        // Initialize game-specific data
        await this.initialize(userId, options);

        // Create game session in database
        await this.createGameSession();

        return this.getGameState();
    }

    async pauseGame() {
        if (this.state !== 'playing') {
            throw new Error('Game is not currently playing');
        }
        this.state = 'paused';
        await this.updateGameSession();
    }

    async resumeGame() {
        if (this.state !== 'paused') {
            throw new Error('Game is not paused');
        }
        this.state = 'playing';
        await this.updateGameSession();
    }

    async abandonGame() {
        this.state = 'abandoned';
        this.endTime = new Date();
        await this.endGame('abandoned');
    }

    async addScore(points) {
        this.score += points;
        await this.updateGameSession();
    }

    async levelUp() {
        this.level++;
        await this.updateGameSession();
    }

    async updateGameData(key, value) {
        this.data[key] = value;
        await this.updateGameSession();
    }

    async getGameData(key) {
        return this.data[key];
    }

    // Database methods
    async createGameSession() {
        const query = `
            INSERT INTO game_sessions (
                session_id, user_id, game_name, start_time, 
                state, score, level, game_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const result = await Database.query(query, [
            this.sessionId,
            this.userId,
            this.gameName,
            this.startTime,
            this.state,
            this.score,
            this.level,
            JSON.stringify(this.data)
        ]);
        return result.rows[0];
    }

    async updateGameSession() {
        const query = `
            UPDATE game_sessions 
            SET state = $1, score = $2, level = $3, game_data = $4, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = $5
            RETURNING *
        `;
        const result = await Database.query(query, [
            this.state,
            this.score,
            this.level,
            JSON.stringify(this.data),
            this.sessionId
        ]);
        return result.rows[0];
    }

    async endGameSession() {
        this.endTime = new Date();
        const duration = this.endTime - this.startTime;

        const query = `
            UPDATE game_sessions 
            SET end_time = $1, duration = $2, state = $3, final_score = $4, final_level = $5
            WHERE session_id = $6
            RETURNING *
        `;
        const result = await Database.query(query, [
            this.endTime,
            duration,
            this.state,
            this.score,
            this.level,
            this.sessionId
        ]);
        return result.rows[0];
    }

    // Utility methods
    generateSessionId() {
        return `${this.gameName}_${this.userId}_${Date.now()}`;
    }

    getDuration() {
        if (!this.startTime) return 0;
        const endTime = this.endTime || new Date();
        return endTime - this.startTime;
    }

    getFormattedDuration() {
        return EmbedBuilderUtil.formatDuration(Math.floor(this.getDuration() / 1000));
    }

    // Reward calculation using standardized system
    async calculateRewards() {
        const { gameRewardCalculator } = require('../../config/gameRewards');
        
        // Get user stats for variety bonus calculation
        const userStats = await this.getUserStats();
        
        // Prepare game data for reward calculation
        const gameData = {
            gameType: this.gameName,
            score: this.score,
            duration: this.getDuration(),
            accuracy: this.calculateAccuracy(),
            userFaction: userStats.current_faction || 'Human'
        };

        // Calculate rewards using standardized system
        const rewards = gameRewardCalculator.calculateRewards(gameData, userStats);
        
        return rewards;
    }

    // Calculate accuracy based on game performance
    calculateAccuracy() {
        // Default accuracy calculation - can be overridden by specific games
        if (this.score <= 0) return 0;
        
        // Simple accuracy based on score vs expected score
        const expectedScore = 100; // Base expected score
        const accuracy = Math.min((this.score / expectedScore) * 100, 100);
        return Math.round(accuracy);
    }

    // Get user stats for reward calculation
    async getUserStats() {
        try {
            const user = await Database.getUser(this.userId);
            const userGuild = await Database.getUserGuild(this.userId);
            
            // Get game variety stats
            const varietyQuery = `
                SELECT game_type, times_played 
                FROM game_variety_log 
                WHERE discord_id = $1
            `;
            const varietyResult = await Database.query(varietyQuery, [this.userId]);
            
            const gamesPlayed = {};
            varietyResult.rows.forEach(row => {
                gamesPlayed[row.game_type] = row.times_played;
            });

            return {
                current_faction: user?.current_faction || 'Human',
                guild: userGuild,
                gamesPlayed: gamesPlayed,
                winStreak: 0, // TODO: Implement win streak tracking
                plots: null // TODO: Implement plot tracking
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return {
                current_faction: 'Human',
                guild: null,
                gamesPlayed: {},
                winStreak: 0,
                plots: null
            };
        }
    }

    // Apply rewards to user
    async applyRewards() {
        const rewards = await this.calculateRewards();
        
        // Update user XP and currency
        await Database.updateUserXP(this.userId, rewards.xp);
        await Database.updateUserCurrency(this.userId, rewards.currency);

        // Update faction-specific resources
        if (rewards.factionResources) {
            await this.updateFactionResources(rewards.factionResources);
        }

        // Update game variety tracking
        await this.updateGameVariety();

        // Update game progress
        const game = await Database.getGame(this.gameName);
        if (game) {
            await Database.updateGameProgress(this.userId, game.id, rewards.xp, {
                score: this.score,
                level: this.level,
                duration: this.getDuration(),
                completed: this.state === 'completed',
                multipliers: rewards.multipliers
            });
        }

        return rewards;
    }

    // Update faction-specific resources
    async updateFactionResources(factionResources) {
        try {
            const updateQuery = `
                INSERT INTO player_resources (discord_id, ${Object.keys(factionResources).join(', ')})
                VALUES ($1, ${Object.keys(factionResources).map((_, i) => `$${i + 2}`).join(', ')})
                ON CONFLICT (discord_id) DO UPDATE SET
                    ${Object.keys(factionResources).map(key => `${key} = player_resources.${key} + EXCLUDED.${key}`).join(', ')}
            `;
            
            const values = [this.userId, ...Object.values(factionResources)];
            await Database.query(updateQuery, values);
        } catch (error) {
            console.error('Error updating faction resources:', error);
        }
    }

    // Update game variety tracking
    async updateGameVariety() {
        try {
            const updateQuery = `
                INSERT INTO game_variety_log (discord_id, game_type, times_played, last_played)
                VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (discord_id, game_type) DO UPDATE SET
                    times_played = game_variety_log.times_played + 1,
                    last_played = CURRENT_TIMESTAMP
            `;
            
            await Database.query(updateQuery, [this.userId, this.gameName]);
        } catch (error) {
            console.error('Error updating game variety:', error);
        }
    }

    // Create game result embed
    createResultEmbed(user, rewards) {
        const embed = EmbedBuilderUtil.createBaseEmbed(
            `🎮 ${this.gameName} - Game Complete!`,
            `Great job, ${user.username}!`
        );

        embed.addFields(
            { name: 'Final Score', value: this.score.toString(), inline: true },
            { name: 'Level Reached', value: this.level.toString(), inline: true },
            { name: 'Duration', value: this.getFormattedDuration(), inline: true },
            { name: 'XP Earned', value: rewards.xp.toString(), inline: true },
            { name: 'Currency Earned', value: rewards.currency.toString(), inline: true }
        );

        if (rewards.bonuses.level > 1) {
            embed.addFields({
                name: 'Bonuses',
                value: `Level: ${rewards.bonuses.level.toFixed(1)}x | Score: ${rewards.bonuses.score.toFixed(1)}x | Speed: ${(rewards.bonuses.duration * 100).toFixed(0)}%`,
                inline: false
            });
        }

        return embed;
    }

    // Validation methods
    isValidState() {
        return ['waiting', 'playing', 'paused', 'completed', 'abandoned'].includes(this.state);
    }

    isActive() {
        return this.state === 'playing' || this.state === 'paused';
    }

    isCompleted() {
        return this.state === 'completed';
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`Game ${this.gameName} error${context ? ` in ${context}` : ''}:`, error);
        this.state = 'error';
        return {
            error: true,
            message: error.message || 'An unknown error occurred',
            context
        };
    }
}

module.exports = GameBase;

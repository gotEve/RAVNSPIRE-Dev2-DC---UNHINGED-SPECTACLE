// Unified database operations - consolidates all database patterns
const Database = require('../database/db');

class DatabaseCore {
    constructor() {
        this.queryCache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    // ===== USER OPERATIONS =====
    
    async createUser(discordId, username) {
        const query = `
            INSERT INTO users (discord_id, username) 
            VALUES ($1, $2) 
            ON CONFLICT (discord_id) 
            DO UPDATE SET username = $2, last_active = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await Database.query(query, [discordId, username]);
        return result.rows[0];
    }

    async getUser(discordId) {
        const cacheKey = `user_${discordId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM users WHERE discord_id = $1';
        const result = await Database.query(query, [discordId]);
        const user = result.rows[0];
        
        this.setCached(cacheKey, user);
        return user;
    }

    async updateUserXP(discordId, xpGain) {
        const query = `
            UPDATE users 
            SET global_xp = global_xp + $2, last_active = CURRENT_TIMESTAMP 
            WHERE discord_id = $1 
            RETURNING *
        `;
        const result = await Database.query(query, [discordId, xpGain]);
        this.invalidateUserCache(discordId);
        return result.rows[0];
    }

    async updateUserCurrency(discordId, currencyChange) {
        const query = `
            UPDATE users 
            SET currency = currency + $2, last_active = CURRENT_TIMESTAMP 
            WHERE discord_id = $1 
            RETURNING *
        `;
        const result = await Database.query(query, [discordId, currencyChange]);
        this.invalidateUserCache(discordId);
        return result.rows[0];
    }

    // ===== GUILD OPERATIONS =====
    
    async createGuild(name, description, ownerId) {
        const query = `
            INSERT INTO guilds (name, description, owner_id) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `;
        const result = await Database.query(query, [name, description, ownerId]);
        return result.rows[0];
    }

    async getGuild(guildId) {
        const cacheKey = `guild_${guildId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM guilds WHERE id = $1';
        const result = await Database.query(query, [guildId]);
        const guild = result.rows[0];
        
        this.setCached(cacheKey, guild);
        return guild;
    }

    async getGuildByName(name) {
        const cacheKey = `guild_name_${name}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM guilds WHERE name = $1';
        const result = await Database.query(query, [name]);
        const guild = result.rows[0];
        
        this.setCached(cacheKey, guild);
        return guild;
    }

    async getUserGuild(discordId) {
        const cacheKey = `user_guild_${discordId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = `
            SELECT g.*, gm.role 
            FROM guilds g 
            JOIN guild_members gm ON g.id = gm.guild_id 
            WHERE gm.discord_id = $1
        `;
        const result = await Database.query(query, [discordId]);
        const userGuild = result.rows[0];
        
        this.setCached(cacheKey, userGuild);
        return userGuild;
    }

    async addGuildMember(guildId, discordId, role = 'member') {
        const query = `
            INSERT INTO guild_members (guild_id, discord_id, role) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (guild_id, discord_id) 
            DO UPDATE SET role = $3
            RETURNING *
        `;
        const result = await Database.query(query, [guildId, discordId, role]);
        this.invalidateUserCache(discordId);
        return result.rows[0];
    }

    async removeGuildMember(guildId, discordId) {
        const query = 'DELETE FROM guild_members WHERE guild_id = $1 AND discord_id = $2';
        const result = await Database.query(query, [guildId, discordId]);
        this.invalidateUserCache(discordId);
        return result.rowCount > 0;
    }

    async getGuildMembers(guildId) {
        const query = `
            SELECT gm.*, u.username 
            FROM guild_members gm 
            JOIN users u ON gm.discord_id = u.discord_id 
            WHERE gm.guild_id = $1 
            ORDER BY gm.joined_at
        `;
        const result = await Database.query(query, [guildId]);
        return result.rows;
    }

    // ===== GAME OPERATIONS =====
    
    async createGame(name, description, category, config = {}) {
        const query = `
            INSERT INTO games (name, description, category, config) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const result = await Database.query(query, [name, description, category, JSON.stringify(config)]);
        return result.rows[0];
    }

    async getGame(name) {
        const cacheKey = `game_${name}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM games WHERE name = $1';
        const result = await Database.query(query, [name]);
        const game = result.rows[0];
        
        this.setCached(cacheKey, game);
        return game;
    }

    async getAllGames() {
        const cacheKey = 'all_games';
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM games WHERE active = true ORDER BY name';
        const result = await Database.query(query);
        const games = result.rows;
        
        this.setCached(cacheKey, games);
        return games;
    }

    async getGameProgress(discordId, gameId) {
        const query = 'SELECT * FROM game_progress WHERE discord_id = $1 AND game_id = $2';
        const result = await Database.query(query, [discordId, gameId]);
        return result.rows[0];
    }

    async updateGameProgress(discordId, gameId, xpGain, stats = {}) {
        const query = `
            INSERT INTO game_progress (discord_id, game_id, xp, stats, last_played) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (discord_id, game_id) 
            DO UPDATE SET 
                xp = game_progress.xp + $3,
                level = CASE 
                    WHEN game_progress.xp + $3 >= (game_progress.level * 100) THEN game_progress.level + 1 
                    ELSE game_progress.level 
                END,
                stats = $4,
                last_played = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await Database.query(query, [discordId, gameId, xpGain, JSON.stringify(stats)]);
        return result.rows[0];
    }

    // ===== ACHIEVEMENT OPERATIONS =====
    
    async getAchievement(name) {
        const cacheKey = `achievement_${name}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM achievements WHERE name = $1';
        const result = await Database.query(query, [name]);
        const achievement = result.rows[0];
        
        this.setCached(cacheKey, achievement);
        return achievement;
    }

    async getUserAchievements(discordId) {
        const query = `
            SELECT ua.*, a.name, a.description, a.category, a.type 
            FROM user_achievements ua 
            JOIN achievements a ON ua.achievement_name = a.name 
            WHERE ua.discord_id = $1 
            ORDER BY ua.unlocked_at DESC
        `;
        const result = await Database.query(query, [discordId]);
        return result.rows;
    }

    async unlockAchievement(discordId, achievementName) {
        const query = `
            INSERT INTO user_achievements (discord_id, achievement_name) 
            VALUES ($1, $2) 
            ON CONFLICT (discord_id, achievement_name) 
            DO NOTHING
            RETURNING *
        `;
        const result = await Database.query(query, [discordId, achievementName]);
        return result.rows[0];
    }

    // ===== LORE OPERATIONS =====
    
    async getLoreEntry(id) {
        const cacheKey = `lore_${id}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM lore_entries WHERE id = $1';
        const result = await Database.query(query, [id]);
        const lore = result.rows[0];
        
        this.setCached(cacheKey, lore);
        return lore;
    }

    async searchLore(query, category = null) {
        let sql = `
            SELECT * FROM lore_entries 
            WHERE (title ILIKE $1 OR content ILIKE $1)
        `;
        const params = [`%${query}%`];
        
        if (category) {
            sql += ' AND category = $2';
            params.push(category);
        }
        
        sql += ' ORDER BY title';
        const result = await Database.query(sql, params);
        return result.rows;
    }

    async getLoreByCategory(category) {
        const cacheKey = `lore_category_${category}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM lore_entries WHERE category = $1 ORDER BY title';
        const result = await Database.query(query, [category]);
        const lore = result.rows;
        
        this.setCached(cacheKey, lore);
        return lore;
    }

    async discoverLore(discordId, loreId) {
        const query = `
            INSERT INTO lore_discoveries (discord_id, lore_id) 
            VALUES ($1, $2) 
            ON CONFLICT (discord_id, lore_id) 
            DO NOTHING
            RETURNING *
        `;
        const result = await Database.query(query, [discordId, loreId]);
        return result.rows[0];
    }

    // ===== NEIGHBORHOOD OPERATIONS =====
    
    async getNeighborhood(id) {
        const cacheKey = `neighborhood_${id}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM neighborhoods WHERE id = $1';
        const result = await Database.query(query, [id]);
        const neighborhood = result.rows[0];
        
        this.setCached(cacheKey, neighborhood);
        return neighborhood;
    }

    async getNeighborhoodByName(name) {
        const cacheKey = `neighborhood_name_${name}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const query = 'SELECT * FROM neighborhoods WHERE name = $1';
        const result = await Database.query(query, [name]);
        const neighborhood = result.rows[0];
        
        this.setCached(cacheKey, neighborhood);
        return neighborhood;
    }

    async getNeighborhoodPlots(neighborhoodId) {
        const query = `
            SELECT np.*, g.name as guild_name
            FROM neighborhood_plots np
            LEFT JOIN guilds g ON np.guild_id = g.id
            WHERE np.neighborhood_id = $1
            ORDER BY np.plot_number
        `;
        const result = await Database.query(query, [neighborhoodId]);
        return result.rows;
    }

    async getNeighborhoodBuildings(neighborhoodId) {
        const query = `
            SELECT * FROM neighborhood_buildings
            WHERE neighborhood_id = $1
            ORDER BY building_type
        `;
        const result = await Database.query(query, [neighborhoodId]);
        return result.rows;
    }

    // ===== SECURITY OPERATIONS =====
    
    async getUserSecurity(userId) {
        const query = `
            SELECT * FROM user_security 
            WHERE user_id = $1
        `;
        const result = await Database.query(query, [userId]);
        return result.rows[0];
    }

    async getSecurityFlags(userId, limit = 10) {
        const query = `
            SELECT * FROM security_flags 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
        `;
        const result = await Database.query(query, [userId, limit]);
        return result.rows;
    }

    async getGameAuditLog(userId, limit = 10) {
        const query = `
            SELECT * FROM game_audit_log 
            WHERE user_id = $1 
            ORDER BY timestamp DESC 
            LIMIT $2
        `;
        const result = await Database.query(query, [userId, limit]);
        return result.rows;
    }

    // ===== CACHE MANAGEMENT =====
    
    getCached(key) {
        const cached = this.queryCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.queryCache.delete(key);
        return null;
    }

    setCached(key, data) {
        this.queryCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    invalidateUserCache(discordId) {
        // Remove all cache entries related to this user
        for (const [key, value] of this.queryCache) {
            if (key.includes(discordId) || key.includes('user_')) {
                this.queryCache.delete(key);
            }
        }
    }

    invalidateGuildCache(guildId) {
        // Remove all cache entries related to this guild
        for (const [key, value] of this.queryCache) {
            if (key.includes(guildId) || key.includes('guild_')) {
                this.queryCache.delete(key);
            }
        }
    }

    clearCache() {
        this.queryCache.clear();
    }

    // ===== TRANSACTION SUPPORT =====
    
    async transaction(callback) {
        const client = await Database.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ===== BULK OPERATIONS =====
    
    async bulkInsert(table, columns, values) {
        if (values.length === 0) return;
        
        const placeholders = values.map((_, index) => 
            `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');
        
        const query = `
            INSERT INTO ${table} (${columns.join(', ')}) 
            VALUES ${placeholders}
        `;
        
        const flatValues = values.flat();
        const result = await Database.query(query, flatValues);
        return result;
    }

    async bulkUpdate(table, updates, whereColumn, whereValues) {
        if (updates.length === 0) return;
        
        const setClause = Object.keys(updates[0]).map((col, index) => 
            `${col} = $${index + 1}`
        ).join(', ');
        
        const query = `
            UPDATE ${table} 
            SET ${setClause}
            WHERE ${whereColumn} = ANY($${Object.keys(updates[0]).length + 1})
        `;
        
        const values = Object.values(updates[0]);
        values.push(whereValues);
        
        const result = await Database.query(query, values);
        return result;
    }
}

// Singleton instance
const databaseCore = new DatabaseCore();

module.exports = databaseCore;

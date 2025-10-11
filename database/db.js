const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Determine database type from URL
const isSQLite = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite://');
let pool, sqliteDb;

if (isSQLite) {
    // SQLite setup for development
    const dbPath = process.env.DATABASE_URL.replace('sqlite://', '');
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to SQLite database:', err.message);
        } else {
            console.log('Connected to SQLite database');
        }
    });
} else {
    // PostgreSQL setup for production
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
}

// Test database connection
if (pool) {
    pool.on('connect', () => {
        console.log('Connected to PostgreSQL database');
    });

    pool.on('error', (err) => {
        console.error('Database connection error:', err);
    });
}

// Database utility functions
class Database {
    static async query(text, params) {
        const start = Date.now();
        try {
            if (isSQLite) {
                // SQLite query execution
                return new Promise((resolve, reject) => {
                    if (text.trim().toUpperCase().startsWith('SELECT')) {
                        sqliteDb.all(text, params, (err, rows) => {
                            if (err) {
                                console.error('SQLite query error:', err);
                                reject(err);
                            } else {
                                const duration = Date.now() - start;
                                console.log('Executed SQLite query', { text, duration, rows: rows.length });
                                resolve({ rows, rowCount: rows.length });
                            }
                        });
                    } else {
                        sqliteDb.run(text, params, function(err) {
                            if (err) {
                                console.error('SQLite query error:', err);
                                reject(err);
                            } else {
                                const duration = Date.now() - start;
                                console.log('Executed SQLite query', { text, duration, changes: this.changes });
                                resolve({ 
                                    rows: [{ id: this.lastID }], 
                                    rowCount: this.changes 
                                });
                            }
                        });
                    }
                });
            } else {
                // PostgreSQL query execution
                const res = await pool.query(text, params);
                const duration = Date.now() - start;
                console.log('Executed PostgreSQL query', { text, duration, rows: res.rowCount });
                return res;
            }
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    static async getClient() {
        if (isSQLite) {
            return {
                query: (text, params) => this.query(text, params),
                release: () => {}
            };
        } else {
            return await pool.connect();
        }
    }

    static async transaction(callback) {
        const client = await pool.connect();
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

    // User management
    static async createUser(discordId, username) {
        const query = `
            INSERT INTO users (discord_id, username) 
            VALUES ($1, $2) 
            ON CONFLICT (discord_id) 
            DO UPDATE SET username = $2, last_active = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await this.query(query, [discordId, username]);
        return result.rows[0];
    }

    static async getUser(discordId) {
        const query = 'SELECT * FROM users WHERE discord_id = $1';
        const result = await this.query(query, [discordId]);
        return result.rows[0];
    }

    static async updateUserXP(discordId, xpGain) {
        const query = `
            UPDATE users 
            SET global_xp = global_xp + $2, last_active = CURRENT_TIMESTAMP 
            WHERE discord_id = $1 
            RETURNING *
        `;
        const result = await this.query(query, [discordId, xpGain]);
        return result.rows[0];
    }

    static async updateUserCurrency(discordId, currencyChange) {
        const query = `
            UPDATE users 
            SET currency = currency + $2, last_active = CURRENT_TIMESTAMP 
            WHERE discord_id = $1 
            RETURNING *
        `;
        const result = await this.query(query, [discordId, currencyChange]);
        return result.rows[0];
    }

    // Game management
    static async createGame(name, description, category, config = {}) {
        const query = `
            INSERT INTO games (name, description, category, config) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const result = await this.query(query, [name, description, category, JSON.stringify(config)]);
        return result.rows[0];
    }

    static async getGame(name) {
        const query = 'SELECT * FROM games WHERE name = $1';
        const result = await this.query(query, [name]);
        return result.rows[0];
    }

    static async getAllGames() {
        const query = 'SELECT * FROM games WHERE status = $1 ORDER BY name';
        const result = await this.query(query, ['active']);
        return result.rows;
    }

    // Game progress
    static async getGameProgress(discordId, gameId) {
        const query = 'SELECT * FROM game_progress WHERE discord_id = $1 AND game_id = $2';
        const result = await this.query(query, [discordId, gameId]);
        return result.rows[0];
    }

    static async updateGameProgress(discordId, gameId, xpGain, stats = {}) {
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
        const result = await this.query(query, [discordId, gameId, xpGain, JSON.stringify(stats)]);
        return result.rows[0];
    }

    // Guild management
    static async createGuild(name, description, ownerId) {
        const query = `
            INSERT INTO guilds (name, description, owner_id) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `;
        const result = await this.query(query, [name, description, ownerId]);
        return result.rows[0];
    }

    static async getGuild(guildId) {
        const query = 'SELECT * FROM guilds WHERE id = $1';
        const result = await this.query(query, [guildId]);
        return result.rows[0];
    }

    static async getGuildByName(name) {
        const query = 'SELECT * FROM guilds WHERE name = $1';
        const result = await this.query(query, [name]);
        return result.rows[0];
    }

    static async addGuildMember(guildId, discordId, role = 'member') {
        const query = `
            INSERT INTO guild_members (guild_id, discord_id, role) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (guild_id, discord_id) 
            DO UPDATE SET role = $3
            RETURNING *
        `;
        const result = await this.query(query, [guildId, discordId, role]);
        return result.rows[0];
    }

    static async removeGuildMember(guildId, discordId) {
        const query = 'DELETE FROM guild_members WHERE guild_id = $1 AND discord_id = $2';
        const result = await this.query(query, [guildId, discordId]);
        return result.rowCount > 0;
    }

    static async getGuildMembers(guildId) {
        const query = `
            SELECT gm.*, u.username 
            FROM guild_members gm 
            JOIN users u ON gm.discord_id = u.discord_id 
            WHERE gm.guild_id = $1 
            ORDER BY gm.joined_at
        `;
        const result = await this.query(query, [guildId]);
        return result.rows;
    }

    static async getUserGuild(discordId) {
        const query = `
            SELECT g.*, gm.role 
            FROM guilds g 
            JOIN guild_members gm ON g.id = gm.guild_id 
            WHERE gm.discord_id = $1
        `;
        const result = await this.query(query, [discordId]);
        return result.rows[0];
    }

    // Achievement management
    static async getAchievement(name) {
        const query = 'SELECT * FROM achievements WHERE name = $1';
        const result = await this.query(query, [name]);
        return result.rows[0];
    }

    static async getUserAchievements(discordId) {
        const query = `
            SELECT ua.*, a.name, a.description, a.category, a.type 
            FROM user_achievements ua 
            JOIN achievements a ON ua.achievement_id = a.id 
            WHERE ua.discord_id = $1 
            ORDER BY ua.unlocked_at DESC
        `;
        const result = await this.query(query, [discordId]);
        return result.rows;
    }

    static async unlockAchievement(discordId, achievementId, progress = {}) {
        const query = `
            INSERT INTO user_achievements (discord_id, achievement_id, progress) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (discord_id, achievement_id) 
            DO UPDATE SET progress = $3
            RETURNING *
        `;
        const result = await this.query(query, [discordId, achievementId, JSON.stringify(progress)]);
        return result.rows[0];
    }

    // Lore management
    static async getLoreEntry(id) {
        const query = 'SELECT * FROM lore_entries WHERE id = $1';
        const result = await this.query(query, [id]);
        return result.rows[0];
    }

    static async searchLore(query, category = null) {
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
        const result = await this.query(sql, params);
        return result.rows;
    }

    static async getLoreByCategory(category) {
        const query = 'SELECT * FROM lore_entries WHERE category = $1 ORDER BY title';
        const result = await this.query(query, [category]);
        return result.rows;
    }

    // Close the pool
    static async close() {
        await pool.end();
    }
}

module.exports = Database;

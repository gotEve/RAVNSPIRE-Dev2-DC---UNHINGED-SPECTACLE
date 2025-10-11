// Security and anti-cheating utilities - DEPRECATED, use securityCore.js
const securityCore = require('./securityCore');

class SecurityManager {
    constructor() {
        console.warn('⚠️ SecurityManager is deprecated. Use securityCore instead.');
        this.cheatDetection = {
            maxScorePerSecond: 1000, // Maximum reasonable score per second
            maxGamesPerMinute: 5,    // Maximum games per minute
            minGameDuration: 1000,   // Minimum game duration in ms
            maxConsecutiveWins: 20,  // Maximum consecutive wins before flagging
            minTimeBetweenActions: 500, // 0.5 seconds
            maxCommandsPerMinute: 70
        };
    }

    // Rate limiting - delegates to securityCore
    async checkRateLimit(userId, action, limit = 10, window = 60000) {
        return await securityCore.checkRateLimit(userId, action, limit, window);
    }

    // Anti-cheating: Validate game results - delegates to securityCore
    async validateGameResult(userId, gameType, result, metadata = {}) {
        return await securityCore.validateGameResult(userId, gameType, result, metadata);
    }

    // Get maximum reasonable score for a game type and duration
    getMaxReasonableScore(gameType, duration) {
        const baseRates = {
            trivia: 50,      // 50 points per second max
            tetris: 200,     // 200 points per second max
            tictactoe: 10    // 10 points per second max (mostly time-based)
        };

        const baseRate = baseRates[gameType] || 50;
        const maxScore = Math.floor((duration / 1000) * baseRate);
        
        // Add some buffer for exceptional performance
        return maxScore * 1.5;
    }

    // Flag suspicious activity
    async flagSuspiciousActivity(userId, type, data) {
        const flag = {
            userId,
            type,
            data,
            timestamp: new Date(),
            severity: this.getSeverity(type)
        };

        // Store in database
        await Database.query(`
            INSERT INTO security_flags (user_id, flag_type, data, severity, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, type, JSON.stringify(data), flag.severity, flag.timestamp]);

        // Track in memory for immediate response
        if (!this.suspiciousActivities.has(userId)) {
            this.suspiciousActivities.set(userId, []);
        }
        this.suspiciousActivities.get(userId).push(flag);

        // Log for monitoring
        console.warn(`🚨 Security Flag: User ${userId} - ${type}`, data);

        return flag;
    }

    // Get severity level for different flag types
    getSeverity(type) {
        const severityMap = {
            'high_score': 'medium',
            'short_duration': 'low',
            'rapid_fire': 'high',
            'impossible_streak': 'high',
            'negative_score': 'critical'
        };
        return severityMap[type] || 'low';
    }

    // Get recent games for a user
    async getRecentGames(userId, timeWindow) {
        const query = `
            SELECT * FROM game_sessions 
            WHERE user_id = $1 AND start_time > NOW() - INTERVAL '${timeWindow} milliseconds'
            ORDER BY start_time DESC
        `;
        const result = await Database.query(query, [userId]);
        return result.rows;
    }

    // Get win streak for a user in a specific game
    async getWinStreak(userId, gameType) {
        const query = `
            SELECT COUNT(*) as streak FROM game_sessions 
            WHERE user_id = $1 AND game_name = $2 AND state = 'completed'
            AND final_score > 0
            ORDER BY start_time DESC
        `;
        const result = await Database.query(query, [userId, gameType]);
        return parseInt(result.rows[0].streak);
    }

    // Generate secure session token
    generateSessionToken(userId, gameId) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(16).toString('hex');
        const data = `${userId}_${gameId}_${timestamp}_${random}`;
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        return hash;
    }

    // Validate session token
    validateSessionToken(token, userId, gameId) {
        // In a real implementation, you'd store and validate tokens
        // For now, we'll use a simple validation
        return token && token.length === 64; // SHA256 hash length
    }

    // Check if user is banned or restricted
    async checkUserStatus(userId) {
        const query = `
            SELECT status, restrictions FROM user_security 
            WHERE user_id = $1
        `;
        const result = await Database.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return { status: 'active', restrictions: [] };
        }

        const user = result.rows[0];
        return {
            status: user.status,
            restrictions: user.restrictions ? JSON.parse(user.restrictions) : []
        };
    }

    // Apply security restrictions
    async applyRestrictions(userId, restrictions) {
        const query = `
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'restricted', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `;
        await Database.query(query, [userId, JSON.stringify(restrictions)]);
    }

    // Log all game actions for audit trail
    async logGameAction(userId, action, data) {
        const query = `
            INSERT INTO game_audit_log (user_id, action, data, timestamp)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `;
        await Database.query(query, [userId, action, JSON.stringify(data)]);
    }

    // Clean up old rate limits and suspicious activities
    cleanup() {
        const now = Date.now();
        
        // Clean rate limits
        for (const [key, rateLimit] of this.rateLimits) {
            if (now > rateLimit.resetTime) {
                this.rateLimits.delete(key);
            }
        }

        // Clean suspicious activities (keep last 100 per user)
        for (const [userId, activities] of this.suspiciousActivities) {
            if (activities.length > 100) {
                activities.splice(0, activities.length - 100);
            }
        }
    }
}

// Singleton instance
const securityManager = new SecurityManager();

// Cleanup every 5 minutes
setInterval(() => {
    securityManager.cleanup();
}, 5 * 60 * 1000);

module.exports = securityManager;

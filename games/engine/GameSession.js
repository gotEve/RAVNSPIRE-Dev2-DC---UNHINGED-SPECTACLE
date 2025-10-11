// Game session manager
const Database = require('../../database/db');
const config = require('../../config/config');

class GameSessionManager {
    constructor() {
        this.activeSessions = new Map();
        this.cleanupInterval = null;
        this.startCleanupTimer();
    }

    // Create a new game session
    async createSession(gameInstance) {
        const sessionId = gameInstance.sessionId;
        
        // Check if user already has an active session
        const existingSession = await this.getUserActiveSession(gameInstance.userId);
        if (existingSession) {
            throw new Error('You already have an active game session. Please finish or abandon it first.');
        }

        // Store session in memory
        this.activeSessions.set(sessionId, gameInstance);

        // Create session in database
        await gameInstance.createGameSession();

        return sessionId;
    }

    // Get a game session by ID
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    // Get user's active session
    async getUserActiveSession(userId) {
        // Check memory first
        for (const [sessionId, session] of this.activeSessions) {
            if (session.userId === userId && session.isActive()) {
                return session;
            }
        }

        // Check database for active sessions
        const query = `
            SELECT * FROM game_sessions 
            WHERE user_id = $1 AND state IN ('playing', 'paused')
            ORDER BY start_time DESC
            LIMIT 1
        `;
        const result = await Database.query(query, [userId]);
        
        if (result.rows.length > 0) {
            const sessionData = result.rows[0];
            // Reconstruct game instance from database
            const gameInstance = await this.reconstructGameInstance(sessionData);
            this.activeSessions.set(sessionId, gameInstance);
            return gameInstance;
        }

        return null;
    }

    // End a game session
    async endSession(sessionId, reason = 'completed') {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // End the game
        await session.endGame(reason);

        // Apply rewards if completed
        if (reason === 'completed') {
            await session.applyRewards();
        }

        // Remove from memory
        this.activeSessions.delete(sessionId);

        // Update database
        await session.endGameSession();

        return session;
    }

    // Pause a game session
    async pauseSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        await session.pauseGame();
        return session;
    }

    // Resume a game session
    async resumeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        await session.resumeGame();
        return session;
    }

    // Abandon a game session
    async abandonSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        await session.abandonGame();
        this.activeSessions.delete(sessionId);
        await session.endGameSession();

        return session;
    }

    // Get all active sessions
    getActiveSessions() {
        return Array.from(this.activeSessions.values()).filter(session => session.isActive());
    }

    // Get sessions by user
    getUserSessions(userId) {
        return Array.from(this.activeSessions.values()).filter(session => session.userId === userId);
    }

    // Cleanup expired sessions
    async cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];

        for (const [sessionId, session] of this.activeSessions) {
            const sessionAge = now - session.startTime.getTime();
            const maxAge = config.games.session.timeout;

            if (sessionAge > maxAge) {
                expiredSessions.push(sessionId);
            }
        }

        for (const sessionId of expiredSessions) {
            try {
                await this.abandonSession(sessionId);
                console.log(`Cleaned up expired session: ${sessionId}`);
            } catch (error) {
                console.error(`Error cleaning up session ${sessionId}:`, error);
            }
        }

        return expiredSessions.length;
    }

    // Start cleanup timer
    startCleanupTimer() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.cleanupInterval = setInterval(async () => {
            try {
                const cleaned = await this.cleanupExpiredSessions();
                if (cleaned > 0) {
                    console.log(`Cleaned up ${cleaned} expired game sessions`);
                }
            } catch (error) {
                console.error('Error in session cleanup:', error);
            }
        }, config.games.session.cleanupInterval);
    }

    // Stop cleanup timer
    stopCleanupTimer() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    // Reconstruct game instance from database
    async reconstructGameInstance(sessionData) {
        // This would need to be implemented based on the specific game type
        // For now, we'll create a basic structure
        const gameInstance = {
            sessionId: sessionData.session_id,
            userId: sessionData.user_id,
            gameName: sessionData.game_name,
            startTime: sessionData.start_time,
            endTime: sessionData.end_time,
            score: sessionData.score,
            level: sessionData.level,
            state: sessionData.state,
            data: sessionData.game_data ? JSON.parse(sessionData.game_data) : {},
            
            // Basic methods
            isActive() {
                return this.state === 'playing' || this.state === 'paused';
            },
            
            isCompleted() {
                return this.state === 'completed';
            }
        };

        return gameInstance;
    }

    // Get session statistics
    async getSessionStats() {
        const query = `
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN state = 'completed' THEN 1 END) as completed_sessions,
                COUNT(CASE WHEN state = 'abandoned' THEN 1 END) as abandoned_sessions,
                AVG(duration) as avg_duration,
                AVG(final_score) as avg_score
            FROM game_sessions 
            WHERE start_time > NOW() - INTERVAL '24 hours'
        `;
        const result = await Database.query(query);
        return result.rows[0];
    }

    // Get user session history
    async getUserSessionHistory(userId, limit = 10) {
        const query = `
            SELECT 
                game_name,
                state,
                final_score,
                final_level,
                duration,
                start_time,
                end_time
            FROM game_sessions 
            WHERE user_id = $1 
            ORDER BY start_time DESC 
            LIMIT $2
        `;
        const result = await Database.query(query, [userId, limit]);
        return result.rows;
    }

    // Shutdown manager
    async shutdown() {
        this.stopCleanupTimer();
        
        // End all active sessions
        const activeSessions = Array.from(this.activeSessions.keys());
        for (const sessionId of activeSessions) {
            try {
                await this.abandonSession(sessionId);
            } catch (error) {
                console.error(`Error ending session ${sessionId} during shutdown:`, error);
            }
        }
    }
}

// Singleton instance
const gameSessionManager = new GameSessionManager();

module.exports = gameSessionManager;

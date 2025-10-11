// Comprehensive anti-cheating system
const antiAutomationManager = require('./antiAutomation');
const antiMultiAccountManager = require('./antiMultiAccount');
const securityManager = require('./security');
const Database = require('../database/db');

class AntiCheatManager {
    constructor() {
        this.cheatDetection = {
            // Game-specific thresholds
            maxScorePerSecond: {
                trivia: 50,
                tetris: 200,
                tictactoe: 10
            },
            minGameDuration: {
                trivia: 5000,    // 5 seconds
                tetris: 10000,   // 10 seconds
                tictactoe: 3000  // 3 seconds
            },
            maxGamesPerHour: 20,
            maxConsecutiveWins: 15,
            maxPerfectScores: 5,
            maxSimilarScores: 3,
            minTimeBetweenActions: 500, // 0.5 seconds
            maxCommandsPerMinute: 70
        };
        
        this.penaltySystem = {
            warnings: new Map(),
            restrictions: new Map(),
            bans: new Map()
        };
        
        // Cleanup intervals
        setInterval(() => this.cleanup(), 300000); // Every 5 minutes
        setInterval(() => this.analyzeCheatPatterns(), 1800000); // Every 30 minutes
    }

    // Main anti-cheat validation
    async validateGameResult(userId, gameType, result, metadata = {}) {
        const validation = {
            isValid: true,
            flags: [],
            score: result.score,
            duration: result.duration,
            penalties: []
        };

        // 1. Basic validation
        const basicValidation = await this.validateBasicGameData(gameType, result);
        if (!basicValidation.isValid) {
            validation.isValid = false;
            validation.flags.push(...basicValidation.flags);
        }

        // 2. Anti-automation checks
        const automationCheck = await this.checkAutomation(userId, gameType, result, metadata);
        if (automationCheck.suspicious) {
            validation.flags.push(...automationCheck.flags);
            validation.penalties.push(...automationCheck.penalties);
        }

        // 3. Multi-account checks
        const multiAccountCheck = await this.checkMultiAccount(userId, metadata);
        if (multiAccountCheck.suspicious) {
            validation.flags.push(...multiAccountCheck.flags);
            validation.penalties.push(...multiAccountCheck.penalties);
        }

        // 4. Score validation
        const scoreValidation = await this.validateScore(userId, gameType, result);
        if (!scoreValidation.isValid) {
            validation.isValid = false;
            validation.flags.push(...scoreValidation.flags);
        }

        // 5. Pattern analysis
        const patternAnalysis = await this.analyzeGamePatterns(userId, gameType, result);
        if (patternAnalysis.suspicious) {
            validation.flags.push(...patternAnalysis.flags);
            validation.penalties.push(...patternAnalysis.penalties);
        }

        // 6. Apply penalties if needed
        if (validation.penalties.length > 0) {
            await this.applyPenalties(userId, validation.penalties);
        }

        // 7. Log the validation
        await this.logValidation(userId, gameType, result, validation);

        return validation;
    }

    // Validate basic game data
    async validateBasicGameData(gameType, result) {
        const validation = { isValid: true, flags: [] };

        // Check for negative scores
        if (result.score < 0) {
            validation.isValid = false;
            validation.flags.push('negative_score');
        }

        // Check for impossible scores
        const maxReasonableScore = this.calculateMaxReasonableScore(gameType, result.duration);
        if (result.score > maxReasonableScore) {
            validation.flags.push('impossible_score');
        }

        // Check game duration
        const minDuration = this.cheatDetection.minGameDuration[gameType];
        if (result.duration < minDuration) {
            validation.flags.push('suspicious_duration');
        }

        return validation;
    }

    // Check for automation
    async checkAutomation(userId, gameType, result, metadata) {
        const check = { suspicious: false, flags: [], penalties: [] };

        // Track user behavior
        await antiAutomationManager.trackUserBehavior(userId, `game_${gameType}`, {
            user: metadata.user,
            score: result.score,
            duration: result.duration
        });

        // Check rate limits
        const rateLimitCheck = await antiAutomationManager.checkRateLimit(userId, `game_${gameType}`, 10);
        if (!rateLimitCheck) {
            check.suspicious = true;
            check.flags.push('rate_limit_exceeded');
            check.penalties.push({ type: 'temporary_restriction', duration: 3600000 }); // 1 hour
        }

        // Check for restricted user
        const isRestricted = await antiAutomationManager.isUserRestricted(userId);
        if (isRestricted) {
            check.suspicious = true;
            check.flags.push('user_restricted');
            check.penalties.push({ type: 'game_block', duration: 86400000 }); // 24 hours
        }

        // Get suspicious score
        const suspiciousScore = antiAutomationManager.getUserSuspiciousScore(userId);
        if (suspiciousScore > 100) {
            check.suspicious = true;
            check.flags.push('high_suspicious_score');
            check.penalties.push({ type: 'increased_monitoring', duration: 604800000 }); // 7 days
        }

        return check;
    }

    // Check for multi-account usage
    async checkMultiAccount(userId, metadata) {
        const check = { suspicious: false, flags: [], penalties: [] };

        // Track user activity
        await antiMultiAccountManager.trackUserActivity(userId, metadata.user, metadata);

        // Get risk score
        const riskScore = antiMultiAccountManager.getUserRiskScore(userId);
        if (riskScore > 50) {
            check.suspicious = true;
            check.flags.push('multi_account_risk');
            check.penalties.push({ type: 'account_verification', duration: 86400000 }); // 24 hours
        }

        // Get connection summary
        const connectionSummary = antiMultiAccountManager.getUserConnectionSummary(userId);
        if (connectionSummary.suspiciousConnections > 0) {
            check.suspicious = true;
            check.flags.push('suspicious_connections');
            check.penalties.push({ type: 'connection_monitoring', duration: 259200000 }); // 3 days
        }

        return check;
    }

    // Validate score
    async validateScore(userId, gameType, result) {
        const validation = { isValid: true, flags: [] };

        // Check for impossible scores
        const maxScore = this.calculateMaxReasonableScore(gameType, result.duration);
        if (result.score > maxScore) {
            validation.isValid = false;
            validation.flags.push('impossible_score');
        }

        // Check for perfect scores
        const perfectScoreCheck = await this.checkPerfectScores(userId, gameType);
        if (perfectScoreCheck.excessive) {
            validation.flags.push('excessive_perfect_scores');
        }

        // Check for similar scores
        const similarScoreCheck = await this.checkSimilarScores(userId, gameType, result.score);
        if (similarScoreCheck.suspicious) {
            validation.flags.push('suspicious_score_pattern');
        }

        return validation;
    }

    // Analyze game patterns
    async analyzeGamePatterns(userId, gameType, result) {
        const analysis = { suspicious: false, flags: [], penalties: [] };

        // Get user's game history
        const gameHistory = await this.getUserGameHistory(userId, gameType);
        
        // Check for win streaks
        const winStreak = this.calculateWinStreak(gameHistory);
        if (winStreak > this.cheatDetection.maxConsecutiveWins) {
            analysis.suspicious = true;
            analysis.flags.push('impossible_win_streak');
            analysis.penalties.push({ type: 'win_streak_reset', duration: 0 });
        }

        // Check for score progression
        const scoreProgression = this.analyzeScoreProgression(gameHistory);
        if (scoreProgression.suspicious) {
            analysis.suspicious = true;
            analysis.flags.push('suspicious_score_progression');
            analysis.penalties.push({ type: 'score_validation', duration: 3600000 }); // 1 hour
        }

        // Check for timing patterns
        const timingPatterns = this.analyzeTimingPatterns(gameHistory);
        if (timingPatterns.suspicious) {
            analysis.suspicious = true;
            analysis.flags.push('automated_timing');
            analysis.penalties.push({ type: 'timing_validation', duration: 86400000 }); // 24 hours
        }

        return analysis;
    }

    // Calculate maximum reasonable score
    calculateMaxReasonableScore(gameType, duration) {
        const baseRate = this.cheatDetection.maxScorePerSecond[gameType] || 50;
        const maxScore = Math.floor((duration / 1000) * baseRate);
        
        // Add some buffer for exceptional performance
        return maxScore * 1.5;
    }

    // Check for excessive perfect scores
    async checkPerfectScores(userId, gameType) {
        const query = `
            SELECT COUNT(*) as count FROM game_sessions 
            WHERE user_id = $1 AND game_name = $2 
            AND final_score = (SELECT MAX(possible_score) FROM games WHERE name = $2)
            AND start_time > NOW() - INTERVAL '24 hours'
        `;
        const result = await Database.query(query, [userId, gameType]);
        const perfectCount = parseInt(result.rows[0].count);
        
        return {
            excessive: perfectCount > this.cheatDetection.maxPerfectScores,
            count: perfectCount
        };
    }

    // Check for similar scores
    async checkSimilarScores(userId, gameType, score) {
        const query = `
            SELECT COUNT(*) as count FROM game_sessions 
            WHERE user_id = $1 AND game_name = $2 
            AND ABS(final_score - $3) < 5
            AND start_time > NOW() - INTERVAL '1 hour'
        `;
        const result = await Database.query(query, [userId, gameType, score]);
        const similarCount = parseInt(result.rows[0].count);
        
        return {
            suspicious: similarCount > this.cheatDetection.maxSimilarScores,
            count: similarCount
        };
    }

    // Get user's game history
    async getUserGameHistory(userId, gameType, limit = 50) {
        const query = `
            SELECT * FROM game_sessions 
            WHERE user_id = $1 AND game_name = $2 
            ORDER BY start_time DESC 
            LIMIT $3
        `;
        const result = await Database.query(query, [userId, gameType, limit]);
        return result.rows;
    }

    // Calculate win streak
    calculateWinStreak(gameHistory) {
        let streak = 0;
        for (const game of gameHistory) {
            if (game.final_score > 0) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // Analyze score progression
    analyzeScoreProgression(gameHistory) {
        if (gameHistory.length < 5) return { suspicious: false };
        
        const scores = gameHistory.map(game => game.final_score);
        const progression = scores.slice(0, 5).map((score, index) => 
            index > 0 ? score - scores[index - 1] : 0
        );
        
        // Check for unrealistic progression
        const avgProgression = progression.reduce((a, b) => a + b, 0) / progression.length;
        const maxProgression = Math.max(...progression);
        
        return {
            suspicious: avgProgression > 1000 || maxProgression > 5000,
            avgProgression,
            maxProgression
        };
    }

    // Analyze timing patterns
    analyzeTimingPatterns(gameHistory) {
        if (gameHistory.length < 5) return { suspicious: false };
        
        const durations = gameHistory.map(game => game.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const variance = durations.reduce((sum, duration) => 
            sum + Math.pow(duration - avgDuration, 2), 0) / durations.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Low variance suggests automation
        const coefficientOfVariation = standardDeviation / avgDuration;
        
        return {
            suspicious: coefficientOfVariation < 0.1,
            coefficientOfVariation,
            avgDuration
        };
    }

    // Apply penalties
    async applyPenalties(userId, penalties) {
        for (const penalty of penalties) {
            await this.applyPenalty(userId, penalty);
        }
    }

    // Apply individual penalty
    async applyPenalty(userId, penalty) {
        switch (penalty.type) {
            case 'temporary_restriction':
                await this.applyTemporaryRestriction(userId, penalty.duration);
                break;
            case 'game_block':
                await this.applyGameBlock(userId, penalty.duration);
                break;
            case 'increased_monitoring':
                await this.applyIncreasedMonitoring(userId, penalty.duration);
                break;
            case 'account_verification':
                await this.applyAccountVerification(userId, penalty.duration);
                break;
            case 'connection_monitoring':
                await this.applyConnectionMonitoring(userId, penalty.duration);
                break;
            case 'win_streak_reset':
                await this.resetWinStreak(userId);
                break;
            case 'score_validation':
                await this.applyScoreValidation(userId, penalty.duration);
                break;
            case 'timing_validation':
                await this.applyTimingValidation(userId, penalty.duration);
                break;
        }
    }

    // Apply temporary restriction
    async applyTemporaryRestriction(userId, duration) {
        const restrictions = {
            type: 'temporary_restriction',
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + duration),
            reason: 'Suspicious activity detected'
        };

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'restricted', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, JSON.stringify(restrictions)]);
    }

    // Apply game block
    async applyGameBlock(userId, duration) {
        const restrictions = {
            type: 'game_block',
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + duration),
            reason: 'Game abuse detected'
        };

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'restricted', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, JSON.stringify(restrictions)]);
    }

    // Apply increased monitoring
    async applyIncreasedMonitoring(userId, duration) {
        const restrictions = {
            type: 'increased_monitoring',
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + duration),
            reason: 'High suspicious activity score'
        };

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'monitored', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, JSON.stringify(restrictions)]);
    }

    // Apply account verification
    async applyAccountVerification(userId, duration) {
        const restrictions = {
            type: 'account_verification',
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + duration),
            reason: 'Multi-account risk detected'
        };

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'verification_required', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, JSON.stringify(restrictions)]);
    }

    // Apply connection monitoring
    async applyConnectionMonitoring(userId, duration) {
        const restrictions = {
            type: 'connection_monitoring',
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + duration),
            reason: 'Suspicious connections detected'
        };

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'monitored', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, JSON.stringify(restrictions)]);
    }

    // Reset win streak
    async resetWinStreak(userId) {
        // This would reset the user's win streak in the database
        // Implementation depends on how win streaks are stored
        console.log(`Win streak reset for user ${userId}`);
    }

    // Apply score validation
    async applyScoreValidation(userId, duration) {
        const restrictions = {
            type: 'score_validation',
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + duration),
            reason: 'Suspicious score progression detected'
        };

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'monitored', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, JSON.stringify(restrictions)]);
    }

    // Apply timing validation
    async applyTimingValidation(userId, duration) {
        const restrictions = {
            type: 'timing_validation',
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + duration),
            reason: 'Automated timing patterns detected'
        };

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'monitored', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, JSON.stringify(restrictions)]);
    }

    // Log validation
    async logValidation(userId, gameType, result, validation) {
        const logData = {
            userId,
            gameType,
            result,
            validation,
            timestamp: new Date()
        };

        await Database.query(`
            INSERT INTO game_audit_log (user_id, action, data, timestamp)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `, [userId, 'game_validation', JSON.stringify(logData)]);
    }

    // Analyze cheat patterns periodically
    async analyzeCheatPatterns() {
        // This would analyze patterns across all users
        // to detect coordinated cheating or new cheat methods
        console.log('Analyzing cheat patterns...');
    }

    // Cleanup old data
    cleanup() {
        // Clean up old penalty data
        const now = Date.now();
        const cutoff = now - 86400000; // 24 hours
        
        for (const [userId, penalties] of this.penaltySystem.warnings) {
            const recentPenalties = penalties.filter(penalty => penalty.timestamp > cutoff);
            this.penaltySystem.warnings.set(userId, recentPenalties);
        }
    }

    // Get user's cheat risk score
    getUserCheatRiskScore(userId) {
        const automationScore = antiAutomationManager.getUserSuspiciousScore(userId);
        const multiAccountScore = antiMultiAccountManager.getUserRiskScore(userId);
        
        return {
            automation: automationScore,
            multiAccount: multiAccountScore,
            total: automationScore + multiAccountScore,
            riskLevel: this.getRiskLevel(automationScore + multiAccountScore)
        };
    }

    // Get risk level
    getRiskLevel(score) {
        if (score < 50) return 'low';
        if (score < 100) return 'medium';
        if (score < 200) return 'high';
        return 'critical';
    }
}

// Singleton instance
const antiCheatManager = new AntiCheatManager();

module.exports = antiCheatManager;

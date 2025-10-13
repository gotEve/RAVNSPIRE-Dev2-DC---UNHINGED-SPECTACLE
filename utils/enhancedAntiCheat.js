const Database = require('../database/db');

class EnhancedAntiCheat {
    constructor() {
        // Anti-automation thresholds
        this.thresholds = {
            // Game completion patterns
            perfectScoreThreshold: 0.95, // Flag if >95% perfect scores
            speedThreshold: 0.8, // Flag if consistently faster than 80% of players
            timingConsistency: 0.9, // Flag if timing variation <10%
            
            // Resource patterns
            resourceAccumulationRate: 2.0, // Flag if accumulating resources 2x faster than average
            transferFrequency: 5, // Flag if transferring resources >5 times per day
            
            // Care patterns
            careTimingVariation: 0.1, // Flag if care timing varies <10%
            careConsistency: 0.95, // Flag if care actions are >95% consistent
            
            // Multi-account detection
            deviceFingerprintSimilarity: 0.8, // Flag if device fingerprints are >80% similar
            behavioralSimilarity: 0.85, // Flag if behavioral patterns are >85% similar
        };
        
        // Accessibility-friendly patterns (these are allowed)
        this.accessibilityPatterns = {
            consistentTiming: true, // Allow consistent timing for screen readers
            keyboardNavigation: true, // Allow keyboard-only navigation
            assistiveTech: true, // Allow assistive technology usage
        };
    }

    /**
     * Validate game completion for automation detection
     */
    async validateGameCompletion(userId, gameData) {
        try {
            const flags = [];
            
            // Get user's recent game history
            const recentGames = await this.getRecentGameHistory(userId, 20);
            
            if (recentGames.length < 5) {
                return { valid: true, flags: [] }; // Not enough data
            }
            
            // Check for perfect score patterns
            const perfectScores = recentGames.filter(game => 
                game.final_score >= game.max_possible_score * this.thresholds.perfectScoreThreshold
            ).length;
            
            if (perfectScores / recentGames.length > this.thresholds.perfectScoreThreshold) {
                flags.push({
                    type: 'perfect_score_pattern',
                    severity: 'high',
                    message: 'Consistently achieving near-perfect scores',
                    data: { perfectScoreRatio: perfectScores / recentGames.length }
                });
            }
            
            // Check for speed patterns
            const avgSpeed = this.calculateAverageSpeed(recentGames);
            const speedVariation = this.calculateSpeedVariation(recentGames);
            
            if (avgSpeed > this.thresholds.speedThreshold && speedVariation < this.thresholds.timingConsistency) {
                flags.push({
                    type: 'speed_pattern',
                    severity: 'medium',
                    message: 'Consistently fast completion with low timing variation',
                    data: { avgSpeed, speedVariation }
                });
            }
            
            // Check for resource accumulation patterns
            const resourcePattern = await this.checkResourceAccumulationPattern(userId);
            if (resourcePattern.suspicious) {
                flags.push({
                    type: 'resource_accumulation',
                    severity: 'medium',
                    message: 'Unusual resource accumulation pattern',
                    data: resourcePattern
                });
            }
            
            // Log the validation
            await this.logValidation(userId, 'game_completion', flags);
            
            return {
                valid: flags.length === 0,
                flags: flags,
                requiresReview: flags.some(f => f.severity === 'high')
            };
            
        } catch (error) {
            console.error('Error validating game completion:', error);
            return { valid: true, flags: [], error: error.message };
        }
    }

    /**
     * Detect multi-account exploitation
     */
    async detectMultiAccount(userId) {
        try {
            const flags = [];
            
            // Get user's behavioral patterns
            const userPatterns = await this.getUserBehavioralPatterns(userId);
            
            // Check for similar device fingerprints
            const similarDevices = await this.findSimilarDeviceFingerprints(userId);
            if (similarDevices.length > 0) {
                flags.push({
                    type: 'device_fingerprint',
                    severity: 'high',
                    message: 'Similar device fingerprints detected',
                    data: { similarDevices: similarDevices.length }
                });
            }
            
            // Check for behavioral similarity
            const similarBehaviors = await this.findSimilarBehavioralPatterns(userId);
            if (similarBehaviors.length > 0) {
                flags.push({
                    type: 'behavioral_similarity',
                    severity: 'medium',
                    message: 'Similar behavioral patterns detected',
                    data: { similarBehaviors: similarBehaviors.length }
                });
            }
            
            // Check for resource transfer patterns
            const transferPattern = await this.checkResourceTransferPattern(userId);
            if (transferPattern.suspicious) {
                flags.push({
                    type: 'resource_transfer',
                    severity: 'high',
                    message: 'Suspicious resource transfer pattern',
                    data: transferPattern
                });
            }
            
            // Log the detection
            await this.logValidation(userId, 'multi_account', flags);
            
            return {
                suspicious: flags.length > 0,
                flags: flags,
                requiresReview: flags.some(f => f.severity === 'high')
            };
            
        } catch (error) {
            console.error('Error detecting multi-account:', error);
            return { suspicious: false, flags: [], error: error.message };
        }
    }

    /**
     * Validate care actions for automation detection
     */
    async validateCareAction(userId, childId, careData) {
        try {
            const flags = [];
            
            // Get user's care history
            const careHistory = await this.getCareHistory(userId, childId, 30);
            
            if (careHistory.length < 5) {
                return { valid: true, flags: [] }; // Not enough data
            }
            
            // Check for timing consistency
            const timingVariation = this.calculateCareTimingVariation(careHistory);
            if (timingVariation < this.thresholds.careTimingVariation) {
                flags.push({
                    type: 'care_timing_consistency',
                    severity: 'medium',
                    message: 'Care actions performed with very consistent timing',
                    data: { timingVariation }
                });
            }
            
            // Check for action consistency
            const actionConsistency = this.calculateCareActionConsistency(careHistory);
            if (actionConsistency > this.thresholds.careConsistency) {
                flags.push({
                    type: 'care_action_consistency',
                    severity: 'low',
                    message: 'Care actions are very consistent (may indicate automation)',
                    data: { actionConsistency }
                });
            }
            
            // Check for meaningful engagement
            const engagementScore = this.calculateEngagementScore(careData);
            if (engagementScore < 0.3) {
                flags.push({
                    type: 'low_engagement',
                    severity: 'medium',
                    message: 'Care actions show low engagement',
                    data: { engagementScore }
                });
            }
            
            // Log the validation
            await this.logValidation(userId, 'care_action', flags);
            
            return {
                valid: flags.length === 0,
                flags: flags,
                requiresReview: flags.some(f => f.severity === 'high')
            };
            
        } catch (error) {
            console.error('Error validating care action:', error);
            return { valid: true, flags: [], error: error.message };
        }
    }

    /**
     * Validate resource transfers
     */
    async validateResourceTransfer(fromUser, toUser, amount, transferType) {
        try {
            const flags = [];
            
            // Check transfer frequency
            const transferCount = await this.getTransferCount(fromUser, 24); // Last 24 hours
            if (transferCount > this.thresholds.transferFrequency) {
                flags.push({
                    type: 'high_transfer_frequency',
                    severity: 'medium',
                    message: 'High frequency of resource transfers',
                    data: { transferCount }
                });
            }
            
            // Check transfer amounts
            const totalTransferred = await this.getTotalTransferred(fromUser, 24);
            if (totalTransferred > amount * 10) { // More than 10x the current transfer
                flags.push({
                    type: 'large_transfer_amount',
                    severity: 'high',
                    message: 'Unusually large resource transfer amount',
                    data: { totalTransferred, currentTransfer: amount }
                });
            }
            
            // Check for circular transfers
            const circularPattern = await this.checkCircularTransfers(fromUser, toUser);
            if (circularPattern.detected) {
                flags.push({
                    type: 'circular_transfer',
                    severity: 'high',
                    message: 'Circular transfer pattern detected',
                    data: circularPattern
                });
            }
            
            // Log the validation
            await this.logValidation(fromUser, 'resource_transfer', flags);
            
            return {
                valid: flags.length === 0,
                flags: flags,
                requiresReview: flags.some(f => f.severity === 'high')
            };
            
        } catch (error) {
            console.error('Error validating resource transfer:', error);
            return { valid: true, flags: [], error: error.message };
        }
    }

    /**
     * Get recent game history for a user
     */
    async getRecentGameHistory(userId, limit = 20) {
        try {
            const result = await Database.query(`
                SELECT * FROM game_sessions 
                WHERE user_id = ? AND end_time IS NOT NULL
                ORDER BY end_time DESC 
                LIMIT ?
            `, [userId, limit]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting recent game history:', error);
            return [];
        }
    }

    /**
     * Calculate average speed of game completion
     */
    calculateAverageSpeed(games) {
        if (games.length === 0) return 0;
        
        const totalSpeed = games.reduce((sum, game) => {
            const duration = game.duration || 1;
            const expectedDuration = this.getExpectedDuration(game.game_type);
            return sum + (expectedDuration / duration);
        }, 0);
        
        return totalSpeed / games.length;
    }

    /**
     * Calculate speed variation
     */
    calculateSpeedVariation(games) {
        if (games.length < 2) return 1;
        
        const speeds = games.map(game => {
            const duration = game.duration || 1;
            const expectedDuration = this.getExpectedDuration(game.game_type);
            return expectedDuration / duration;
        });
        
        const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
        const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
        
        return Math.sqrt(variance) / avgSpeed;
    }

    /**
     * Get expected duration for a game type
     */
    getExpectedDuration(gameType) {
        const expectedDurations = {
            'trivia': 120, // 2 minutes
            'tetris': 300, // 5 minutes
            'tictactoe': 60, // 1 minute
        };
        
        return expectedDurations[gameType] || 180; // Default 3 minutes
    }

    /**
     * Check resource accumulation pattern
     */
    async checkResourceAccumulationPattern(userId) {
        try {
            const result = await Database.query(`
                SELECT * FROM player_resources 
                WHERE discord_id = ? 
                ORDER BY last_updated DESC 
                LIMIT 10
            `, [userId]);
            
            if (result.rows.length < 2) {
                return { suspicious: false };
            }
            
            // Calculate accumulation rate
            const current = result.rows[0];
            const previous = result.rows[1];
            const timeDiff = new Date(current.last_updated) - new Date(previous.last_updated);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            const accumulationRate = (current.currency - previous.currency) / hoursDiff;
            const avgAccumulationRate = 10; // Expected rate per hour
            
            return {
                suspicious: accumulationRate > avgAccumulationRate * this.thresholds.resourceAccumulationRate,
                accumulationRate,
                avgAccumulationRate
            };
        } catch (error) {
            console.error('Error checking resource accumulation pattern:', error);
            return { suspicious: false };
        }
    }

    /**
     * Get user behavioral patterns
     */
    async getUserBehavioralPatterns(userId) {
        try {
            const result = await Database.query(`
                SELECT 
                    game_type,
                    AVG(duration) as avg_duration,
                    AVG(final_score) as avg_score,
                    COUNT(*) as game_count,
                    AVG(CAST(strftime('%H', start_time) AS INTEGER)) as avg_hour
                FROM game_sessions 
                WHERE user_id = ? AND end_time IS NOT NULL
                GROUP BY game_type
            `, [userId]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting user behavioral patterns:', error);
            return [];
        }
    }

    /**
     * Find similar device fingerprints
     */
    async findSimilarDeviceFingerprints(userId) {
        // This would integrate with device fingerprinting system
        // For now, return empty array
        return [];
    }

    /**
     * Find similar behavioral patterns
     */
    async findSimilarBehavioralPatterns(userId) {
        // This would compare behavioral patterns across users
        // For now, return empty array
        return [];
    }

    /**
     * Check resource transfer pattern
     */
    async checkResourceTransferPattern(userId) {
        try {
            const result = await Database.query(`
                SELECT COUNT(*) as transfer_count,
                       SUM(amount) as total_transferred
                FROM resource_transfers 
                WHERE from_user = ? AND created_at > datetime('now', '-24 hours')
            `, [userId]);
            
            const transferCount = result.rows[0]?.transfer_count || 0;
            const totalTransferred = result.rows[0]?.total_transferred || 0;
            
            return {
                suspicious: transferCount > this.thresholds.transferFrequency,
                transferCount,
                totalTransferred
            };
        } catch (error) {
            console.error('Error checking resource transfer pattern:', error);
            return { suspicious: false };
        }
    }

    /**
     * Get care history for a user and child
     */
    async getCareHistory(userId, childId, days = 30) {
        try {
            const result = await Database.query(`
                SELECT * FROM child_care_activities 
                WHERE discord_id = ? AND child_id = ? 
                AND created_at > datetime('now', '-${days} days')
                ORDER BY created_at DESC
            `, [userId, childId]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting care history:', error);
            return [];
        }
    }

    /**
     * Calculate care timing variation
     */
    calculateCareTimingVariation(careHistory) {
        if (careHistory.length < 2) return 1;
        
        const timings = careHistory.map(care => {
            const hour = new Date(care.created_at).getHours();
            return hour;
        });
        
        const avgTiming = timings.reduce((sum, timing) => sum + timing, 0) / timings.length;
        const variance = timings.reduce((sum, timing) => sum + Math.pow(timing - avgTiming, 2), 0) / timings.length;
        
        return Math.sqrt(variance) / 24; // Normalize to 0-1
    }

    /**
     * Calculate care action consistency
     */
    calculateCareActionConsistency(careHistory) {
        if (careHistory.length < 2) return 0;
        
        const actions = careHistory.map(care => care.activity_type);
        const uniqueActions = new Set(actions);
        
        return uniqueActions.size / actions.length;
    }

    /**
     * Calculate engagement score
     */
    calculateEngagementScore(careData) {
        // This would analyze the care data for meaningful engagement
        // For now, return a random score
        return Math.random();
    }

    /**
     * Get transfer count for a user
     */
    async getTransferCount(userId, hours = 24) {
        try {
            const result = await Database.query(`
                SELECT COUNT(*) as count
                FROM resource_transfers 
                WHERE from_user = ? AND created_at > datetime('now', '-${hours} hours')
            `, [userId]);
            
            return result.rows[0]?.count || 0;
        } catch (error) {
            console.error('Error getting transfer count:', error);
            return 0;
        }
    }

    /**
     * Get total transferred amount
     */
    async getTotalTransferred(userId, hours = 24) {
        try {
            const result = await Database.query(`
                SELECT SUM(amount) as total
                FROM resource_transfers 
                WHERE from_user = ? AND created_at > datetime('now', '-${hours} hours')
            `, [userId]);
            
            return result.rows[0]?.total || 0;
        } catch (error) {
            console.error('Error getting total transferred:', error);
            return 0;
        }
    }

    /**
     * Check for circular transfers
     */
    async checkCircularTransfers(fromUser, toUser) {
        try {
            const result = await Database.query(`
                SELECT COUNT(*) as count
                FROM resource_transfers 
                WHERE from_user = ? AND to_user = ? 
                AND created_at > datetime('now', '-24 hours')
            `, [toUser, fromUser]);
            
            return {
                detected: result.rows[0]?.count > 0,
                count: result.rows[0]?.count || 0
            };
        } catch (error) {
            console.error('Error checking circular transfers:', error);
            return { detected: false, count: 0 };
        }
    }

    /**
     * Log validation results
     */
    async logValidation(userId, validationType, flags) {
        try {
            await Database.query(`
                INSERT INTO anti_cheat_logs (
                    user_id, validation_type, flags, created_at
                ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [userId, validationType, JSON.stringify(flags)]);
        } catch (error) {
            console.error('Error logging validation:', error);
        }
    }

    /**
     * Get anti-cheat statistics
     */
    async getAntiCheatStats(days = 7) {
        try {
            const result = await Database.query(`
                SELECT 
                    validation_type,
                    COUNT(*) as total_validations,
                    COUNT(CASE WHEN flags != '[]' AND flags != '' THEN 1 END) as flagged_validations,
                    COUNT(CASE WHEN flags LIKE '%"severity":"high"%' THEN 1 END) as high_severity_flags
                FROM anti_cheat_logs 
                WHERE created_at > datetime('now', '-${days} days')
                GROUP BY validation_type
            `);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting anti-cheat stats:', error);
            return [];
        }
    }
}

module.exports = new EnhancedAntiCheat();

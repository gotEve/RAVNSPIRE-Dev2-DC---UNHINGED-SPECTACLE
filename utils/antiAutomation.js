// Anti-automation and anti-multi-account measures
const Database = require('../database/db');
const crypto = require('crypto');

class AntiAutomationManager {
    constructor() {
        this.behavioralPatterns = new Map();
        this.deviceFingerprints = new Map();
        this.rateLimits = new Map();
        this.suspiciousActivities = new Map();
        
        // Anti-automation thresholds
        this.thresholds = {
            maxActionsPerMinute: 20,
            maxGamesPerHour: 10,
            maxCommandsPerMinute: 70,
            minTimeBetweenActions: 500, // 0.5 seconds
            maxConsecutiveSimilarActions: 5,
            behavioralAnalysisWindow: 300000, // 5 minutes
            deviceFingerprintWindow: 86400000, // 24 hours
        };
        
        // Cleanup intervals
        setInterval(() => this.cleanup(), 60000); // Every minute
        setInterval(() => this.analyzeBehavioralPatterns(), 300000); // Every 5 minutes
    }

    // Device fingerprinting based on Discord user data
    generateDeviceFingerprint(user) {
        const data = {
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar,
            createdTimestamp: user.createdTimestamp,
            bot: user.bot,
            system: user.system
        };
        
        return crypto.createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    // Track user behavior patterns
    async trackUserBehavior(userId, action, metadata = {}) {
        const timestamp = Date.now();
        const fingerprint = this.generateDeviceFingerprint(metadata.user || {});
        
        if (!this.behavioralPatterns.has(userId)) {
            this.behavioralPatterns.set(userId, {
                actions: [],
                deviceFingerprints: new Set(),
                lastAction: 0,
                actionCounts: new Map(),
                suspiciousScore: 0
            });
        }
        
        const userPattern = this.behavioralPatterns.get(userId);
        
        // Add device fingerprint
        userPattern.deviceFingerprints.add(fingerprint);
        
        // Track action
        userPattern.actions.push({
            action,
            timestamp,
            metadata,
            fingerprint
        });
        
        // Update action counts
        const actionKey = `${action}_${Math.floor(timestamp / 60000)}`; // Per minute
        userPattern.actionCounts.set(actionKey, (userPattern.actionCounts.get(actionKey) || 0) + 1);
        
        // Check for suspicious patterns
        await this.detectSuspiciousPatterns(userId, userPattern);
        
        // Clean old data
        this.cleanupUserPattern(userId);
    }

    // Detect suspicious behavioral patterns
    async detectSuspiciousPatterns(userId, userPattern) {
        const now = Date.now();
        const recentActions = userPattern.actions.filter(
            a => now - a.timestamp < this.thresholds.behavioralAnalysisWindow
        );
        
        let suspiciousScore = 0;
        
        // 1. Check for too many actions per minute
        const actionsPerMinute = recentActions.length / (this.thresholds.behavioralAnalysisWindow / 60000);
        if (actionsPerMinute > this.thresholds.maxActionsPerMinute) {
            suspiciousScore += 50;
            await this.flagSuspiciousActivity(userId, 'high_action_frequency', {
                actionsPerMinute,
                threshold: this.thresholds.maxActionsPerMinute
            });
        }
        
        // 2. Check for too many games per hour
        const gameActions = recentActions.filter(a => a.action.startsWith('game_'));
        const gamesPerHour = gameActions.length / (this.thresholds.behavioralAnalysisWindow / 3600000);
        if (gamesPerHour > this.thresholds.maxGamesPerHour) {
            suspiciousScore += 40;
            await this.flagSuspiciousActivity(userId, 'high_game_frequency', {
                gamesPerHour,
                threshold: this.thresholds.maxGamesPerHour
            });
        }
        
        // 3. Check for too many commands per minute
        const commandActions = recentActions.filter(a => a.action.startsWith('command_'));
        const commandsPerMinute = commandActions.length / (this.thresholds.behavioralAnalysisWindow / 60000);
        if (commandsPerMinute > this.thresholds.maxCommandsPerMinute) {
            suspiciousScore += 30;
            await this.flagSuspiciousActivity(userId, 'high_command_frequency', {
                commandsPerMinute,
                threshold: this.thresholds.maxCommandsPerMinute
            });
        }
        
        // 4. Check for too little time between actions
        const timeBetweenActions = recentActions.slice(1).map((action, index) => 
            action.timestamp - recentActions[index].timestamp
        );
        const avgTimeBetween = timeBetweenActions.reduce((a, b) => a + b, 0) / timeBetweenActions.length;
        if (avgTimeBetween < this.thresholds.minTimeBetweenActions) {
            suspiciousScore += 60;
            await this.flagSuspiciousActivity(userId, 'rapid_actions', {
                avgTimeBetween,
                threshold: this.thresholds.minTimeBetweenActions
            });
        }
        
        // 5. Check for too many consecutive similar actions
        const consecutiveSimilar = this.findConsecutiveSimilarActions(recentActions);
        if (consecutiveSimilar > this.thresholds.maxConsecutiveSimilarActions) {
            suspiciousScore += 70;
            await this.flagSuspiciousActivity(userId, 'consecutive_similar_actions', {
                consecutiveCount: consecutiveSimilar,
                threshold: this.thresholds.maxConsecutiveSimilarActions
            });
        }
        
        // 6. Check for multiple device fingerprints (potential multi-accounting)
        if (userPattern.deviceFingerprints.size > 3) {
            suspiciousScore += 80;
            await this.flagSuspiciousActivity(userId, 'multiple_devices', {
                deviceCount: userPattern.deviceFingerprints.size
            });
        }
        
        // 7. Check for perfect timing patterns (automation)
        const timingPatterns = this.analyzeTimingPatterns(recentActions);
        if (timingPatterns.isAutomated) {
            suspiciousScore += 90;
            await this.flagSuspiciousActivity(userId, 'automated_timing', {
                pattern: timingPatterns.pattern,
                confidence: timingPatterns.confidence
            });
        }
        
        // 8. Check for lack of human-like behavior
        const humanLikeScore = this.calculateHumanLikeScore(recentActions);
        if (humanLikeScore < 0.3) {
            suspiciousScore += 100;
            await this.flagSuspiciousActivity(userId, 'non_human_behavior', {
                humanLikeScore,
                threshold: 0.3
            });
        }
        
        userPattern.suspiciousScore = suspiciousScore;
        
        // Apply restrictions based on suspicious score
        if (suspiciousScore > 200) {
            await this.applyRestrictions(userId, 'high_suspicion', { score: suspiciousScore });
        } else if (suspiciousScore > 100) {
            await this.applyRestrictions(userId, 'medium_suspicion', { score: suspiciousScore });
        }
    }

    // Find consecutive similar actions
    findConsecutiveSimilarActions(actions) {
        if (actions.length < 2) return 0;
        
        let maxConsecutive = 1;
        let currentConsecutive = 1;
        
        for (let i = 1; i < actions.length; i++) {
            if (actions[i].action === actions[i-1].action) {
                currentConsecutive++;
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            } else {
                currentConsecutive = 1;
            }
        }
        
        return maxConsecutive;
    }

    // Analyze timing patterns for automation detection
    analyzeTimingPatterns(actions) {
        if (actions.length < 5) return { isAutomated: false, confidence: 0 };
        
        const intervals = actions.slice(1).map((action, index) => 
            action.timestamp - actions[index].timestamp
        );
        
        // Check for consistent intervals (automation)
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => 
            sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Low variance suggests automation
        const coefficientOfVariation = standardDeviation / avgInterval;
        const isAutomated = coefficientOfVariation < 0.1 && avgInterval > 1000;
        
        return {
            isAutomated,
            confidence: isAutomated ? 1 - coefficientOfVariation : 0,
            pattern: {
                avgInterval,
                standardDeviation,
                coefficientOfVariation
            }
        };
    }

    // Calculate human-like behavior score
    calculateHumanLikeScore(actions) {
        if (actions.length < 3) return 1;
        
        let score = 1;
        
        // Check for natural variation in action types
        const actionTypes = new Set(actions.map(a => a.action));
        const diversityScore = actionTypes.size / actions.length;
        score *= diversityScore;
        
        // Check for natural timing variation
        const intervals = actions.slice(1).map((action, index) => 
            action.timestamp - actions[index].timestamp
        );
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => 
            sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const naturalVariation = Math.min(variance / (avgInterval * avgInterval), 1);
        score *= naturalVariation;
        
        // Check for reasonable action distribution
        const actionCounts = new Map();
        actions.forEach(action => {
            actionCounts.set(action.action, (actionCounts.get(action.action) || 0) + 1);
        });
        const maxActionCount = Math.max(...actionCounts.values());
        const distributionScore = 1 - (maxActionCount / actions.length - 0.2);
        score *= Math.max(distributionScore, 0.1);
        
        return Math.max(score, 0);
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

        // Track in memory
        if (!this.suspiciousActivities.has(userId)) {
            this.suspiciousActivities.set(userId, []);
        }
        this.suspiciousActivities.get(userId).push(flag);

        console.warn(`🚨 Anti-Automation Flag: User ${userId} - ${type}`, data);
    }

    // Apply restrictions based on suspicion level
    async applyRestrictions(userId, level, data) {
        const restrictions = {
            level,
            data,
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + this.getRestrictionDuration(level))
        };

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, 'restricted', $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET restrictions = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, JSON.stringify(restrictions)]);

        console.warn(`🔒 Restrictions Applied: User ${userId} - ${level}`, data);
    }

    // Get restriction duration based on level
    getRestrictionDuration(level) {
        const durations = {
            'low_suspicion': 3600000,      // 1 hour
            'medium_suspicion': 86400000,  // 24 hours
            'high_suspicion': 604800000,   // 7 days
            'critical_suspicion': 2592000000 // 30 days
        };
        return durations[level] || 3600000;
    }

    // Get severity level for different flag types
    getSeverity(type) {
        const severityMap = {
            'high_action_frequency': 'medium',
            'high_game_frequency': 'high',
            'high_command_frequency': 'medium',
            'rapid_actions': 'high',
            'consecutive_similar_actions': 'high',
            'multiple_devices': 'critical',
            'automated_timing': 'critical',
            'non_human_behavior': 'critical'
        };
        return severityMap[type] || 'low';
    }

    // Check if user is restricted
    async isUserRestricted(userId) {
        const query = `
            SELECT restrictions FROM user_security 
            WHERE user_id = $1 AND status = 'restricted'
        `;
        const result = await Database.query(query, [userId]);
        
        if (result.rows.length === 0) return false;
        
        const restrictions = JSON.parse(result.rows[0].restrictions);
        const now = new Date();
        
        if (new Date(restrictions.expiresAt) < now) {
            // Restrictions expired, remove them
            await Database.query(`
                UPDATE user_security 
                SET status = 'active', restrictions = '[]' 
                WHERE user_id = $1
            `, [userId]);
            return false;
        }
        
        return true;
    }

    // Rate limiting with exponential backoff
    async checkRateLimit(userId, action, baseLimit = 10) {
        const key = `${userId}_${action}`;
        const now = Date.now();
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, {
                count: 1,
                resetTime: now + 60000,
                violations: 0
            });
            return true;
        }

        const rateLimit = this.rateLimits.get(key);
        
        if (now > rateLimit.resetTime) {
            rateLimit.count = 1;
            rateLimit.resetTime = now + 60000;
            return true;
        }

        // Apply exponential backoff for violations
        const effectiveLimit = Math.max(1, baseLimit - (rateLimit.violations * 2));
        
        if (rateLimit.count >= effectiveLimit) {
            rateLimit.violations++;
            await this.flagSuspiciousActivity(userId, 'rate_limit_exceeded', {
                action,
                count: rateLimit.count,
                limit: effectiveLimit,
                violations: rateLimit.violations
            });
            return false;
        }

        rateLimit.count++;
        return true;
    }

    // Cleanup old data
    cleanup() {
        const now = Date.now();
        
        // Clean behavioral patterns
        for (const [userId, pattern] of this.behavioralPatterns) {
            this.cleanupUserPattern(userId);
        }
        
        // Clean rate limits
        for (const [key, rateLimit] of this.rateLimits) {
            if (now > rateLimit.resetTime + 300000) { // Keep for 5 minutes after reset
                this.rateLimits.delete(key);
            }
        }
        
        // Clean suspicious activities
        for (const [userId, activities] of this.suspiciousActivities) {
            const recentActivities = activities.filter(
                activity => now - activity.timestamp.getTime() < 86400000 // Keep for 24 hours
            );
            this.suspiciousActivities.set(userId, recentActivities);
        }
    }

    // Cleanup user pattern data
    cleanupUserPattern(userId) {
        const pattern = this.behavioralPatterns.get(userId);
        if (!pattern) return;
        
        const now = Date.now();
        const cutoff = now - this.thresholds.behavioralAnalysisWindow;
        
        // Keep only recent actions
        pattern.actions = pattern.actions.filter(action => action.timestamp > cutoff);
        
        // Clean old action counts
        for (const [key, count] of pattern.actionCounts) {
            const timestamp = parseInt(key.split('_').pop()) * 60000;
            if (now - timestamp > this.thresholds.behavioralAnalysisWindow) {
                pattern.actionCounts.delete(key);
            }
        }
    }

    // Analyze behavioral patterns periodically
    async analyzeBehavioralPatterns() {
        for (const [userId, pattern] of this.behavioralPatterns) {
            if (pattern.actions.length > 10) {
                await this.detectSuspiciousPatterns(userId, pattern);
            }
        }
    }

    // Get user's current suspicious score
    getUserSuspiciousScore(userId) {
        const pattern = this.behavioralPatterns.get(userId);
        return pattern ? pattern.suspiciousScore : 0;
    }

    // Get user's behavioral summary
    getUserBehaviorSummary(userId) {
        const pattern = this.behavioralPatterns.get(userId);
        if (!pattern) return null;
        
        const now = Date.now();
        const recentActions = pattern.actions.filter(
            a => now - a.timestamp < this.thresholds.behavioralAnalysisWindow
        );
        
        return {
            suspiciousScore: pattern.suspiciousScore,
            actionCount: recentActions.length,
            deviceCount: pattern.deviceFingerprints.size,
            lastAction: pattern.lastAction,
            actionTypes: [...new Set(recentActions.map(a => a.action))],
            avgTimeBetweenActions: this.calculateAvgTimeBetweenActions(recentActions)
        };
    }

    // Calculate average time between actions
    calculateAvgTimeBetweenActions(actions) {
        if (actions.length < 2) return 0;
        
        const intervals = actions.slice(1).map((action, index) => 
            action.timestamp - actions[index].timestamp
        );
        
        return intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }
}

// Singleton instance
const antiAutomationManager = new AntiAutomationManager();

module.exports = antiAutomationManager;

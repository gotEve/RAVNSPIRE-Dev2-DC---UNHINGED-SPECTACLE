// Unified security core - consolidates all security operations
const Database = require('../database/db');
const crypto = require('crypto');

class SecurityCore {
    constructor() {
        this.rateLimits = new Map();
        this.suspiciousActivities = new Map();
        this.behavioralPatterns = new Map();
        this.deviceFingerprints = new Map();
        this.accountClusters = new Map();
        this.suspiciousConnections = new Map();
        this.ipAddresses = new Map();
        
        // Unified thresholds
        this.thresholds = {
            // Anti-automation
            maxActionsPerMinute: 20,
            maxGamesPerHour: 10,
            maxCommandsPerMinute: 70,
            minTimeBetweenActions: 500, // 0.5 seconds
            maxConsecutiveSimilarActions: 5,
            behavioralAnalysisWindow: 300000, // 5 minutes
            deviceFingerprintWindow: 86400000, // 24 hours
            
            // Anti-multi-account
            maxAccountsPerIP: 3,
            maxAccountsPerDevice: 2,
            maxSimilarUsernames: 2,
            maxAccountsPerTimeWindow: 5,
            timeWindow: 86400000, // 24 hours
            clusterSimilarityThreshold: 0.8,
            suspiciousActivityThreshold: 100,
            
            // Game-specific
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
            maxSimilarScores: 3
        };
        
        // Cleanup intervals
        setInterval(() => this.cleanup(), 60000); // Every minute
        setInterval(() => this.analyzeBehavioralPatterns(), 300000); // Every 5 minutes
        setInterval(() => this.analyzeAccountClusters(), 1800000); // Every 30 minutes
    }

    // ===== UNIFIED FLAGGING SYSTEM =====
    
    async flagSuspiciousActivity(userId, type, data, source = 'security_core') {
        const flag = {
            userId,
            type,
            data,
            source,
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
        console.warn(`🚨 Security Flag [${source}]: User ${userId} - ${type}`, data);

        return flag;
    }

    // ===== UNIFIED PENALTY SYSTEM =====
    
    async applyPenalty(userId, penaltyType, reason, duration = null, data = {}) {
        const penalty = {
            type: penaltyType,
            reason,
            appliedAt: new Date(),
            expiresAt: duration ? new Date(Date.now() + duration) : null,
            data
        };

        // Determine status based on penalty type
        let status = 'active';
        switch (penaltyType) {
            case 'temporary_restriction':
            case 'game_block':
                status = 'restricted';
                break;
            case 'increased_monitoring':
            case 'connection_monitoring':
            case 'score_validation':
            case 'timing_validation':
                status = 'monitored';
                break;
            case 'account_verification':
                status = 'verification_required';
                break;
        }

        await Database.query(`
            INSERT INTO user_security (user_id, status, restrictions, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET status = $2, restrictions = $3, updated_at = CURRENT_TIMESTAMP
        `, [userId, status, JSON.stringify(penalty)]);

        // Also log in penalties table
        await Database.query(`
            INSERT INTO user_penalties (user_id, penalty_type, reason, applied_at, expires_at, data, active)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        `, [userId, penaltyType, reason, penalty.appliedAt, penalty.expiresAt, JSON.stringify(data)]);

        console.warn(`🔒 Penalty Applied [${penaltyType}]: User ${userId} - ${reason}`);
        return penalty;
    }

    // ===== UNIFIED RATE LIMITING =====
    
    async checkRateLimit(userId, action, limit = 10, window = 60000) {
        // Handle edge cases
        if (!userId || userId === null || userId === undefined) {
            return false;
        }
        
        const key = `${userId}_${action}`;
        const now = Date.now();
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, { count: 1, resetTime: now + window, violations: 0 });
            return true;
        }

        const rateLimit = this.rateLimits.get(key);
        
        if (now > rateLimit.resetTime) {
            rateLimit.count = 1;
            rateLimit.resetTime = now + window;
            return true;
        }

        // Apply exponential backoff for violations
        const effectiveLimit = Math.max(1, limit - (rateLimit.violations * 2));
        
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

    // ===== UNIFIED BEHAVIORAL ANALYSIS =====
    
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

    // ===== UNIFIED DEVICE FINGERPRINTING =====
    
    generateDeviceFingerprint(userData, userAgent = '') {
        const data = {
            username: userData.username,
            discriminator: userData.discriminator,
            avatar: userData.avatar,
            createdTimestamp: userData.createdTimestamp,
            userAgent: userAgent,
            bot: userData.bot,
            system: userData.system
        };
        
        return crypto.createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    // ===== UNIFIED MULTI-ACCOUNT DETECTION =====
    
    async trackUserActivity(userId, userData, metadata = {}) {
        const timestamp = Date.now();
        const ipAddress = metadata.ipAddress || 'unknown';
        const userAgent = metadata.userAgent || 'unknown';
        
        // Generate device fingerprint
        const deviceFingerprint = this.generateDeviceFingerprint(userData, userAgent);
        
        // Track IP address
        await this.trackIPAddress(ipAddress, userId, timestamp);
        
        // Track device fingerprint
        await this.trackDeviceFingerprint(deviceFingerprint, userId, timestamp);
        
        // Analyze for multi-account patterns
        await this.analyzeMultiAccountPatterns(userId, userData, metadata);
    }

    // ===== UNIFIED GAME VALIDATION =====
    
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

        // 2. Behavioral checks
        await this.trackUserBehavior(userId, `game_${gameType}`, {
            user: metadata.user,
            score: result.score,
            duration: result.duration
        });

        // 3. Rate limiting
        const rateLimitCheck = await this.checkRateLimit(userId, `game_${gameType}`, 10);
        if (!rateLimitCheck) {
            validation.flags.push('rate_limit_exceeded');
            validation.penalties.push({ type: 'temporary_restriction', duration: 3600000 });
        }

        // 4. Score validation
        const scoreValidation = await this.validateScore(userId, gameType, result);
        if (!scoreValidation.isValid) {
            validation.isValid = false;
            validation.flags.push(...scoreValidation.flags);
        }

        // 5. Apply penalties if needed
        if (validation.penalties.length > 0) {
            for (const penalty of validation.penalties) {
                await this.applyPenalty(userId, penalty.type, `Game validation failed: ${validation.flags.join(', ')}`, penalty.duration);
            }
        }

        // 6. Log the validation
        await this.logValidation(userId, gameType, result, validation);

        return validation;
    }

    // ===== HELPER METHODS =====
    
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
        const minDuration = this.thresholds.minGameDuration[gameType];
        if (result.duration < minDuration) {
            validation.flags.push('suspicious_duration');
        }

        return validation;
    }

    calculateMaxReasonableScore(gameType, duration) {
        const baseRate = this.thresholds.maxScorePerSecond[gameType] || 50;
        const maxScore = Math.floor((duration / 1000) * baseRate);
        return maxScore * 1.5; // Add buffer for exceptional performance
    }

    async validateScore(userId, gameType, result) {
        const validation = { isValid: true, flags: [] };

        // Check for impossible scores
        const maxScore = this.calculateMaxReasonableScore(gameType, result.duration);
        if (result.score > maxScore) {
            validation.isValid = false;
            validation.flags.push('impossible_score');
        }

        return validation;
    }

    async detectSuspiciousPatterns(userId, userPattern) {
        const now = Date.now();
        const recentActions = userPattern.actions.filter(
            a => now - a.timestamp < this.thresholds.behavioralAnalysisWindow
        );
        
        let suspiciousScore = 0;
        
        // Check for too many actions per minute
        const actionsPerMinute = recentActions.length / (this.thresholds.behavioralAnalysisWindow / 60000);
        if (actionsPerMinute > this.thresholds.maxActionsPerMinute) {
            suspiciousScore += 50;
            await this.flagSuspiciousActivity(userId, 'high_action_frequency', {
                actionsPerMinute,
                threshold: this.thresholds.maxActionsPerMinute
            });
        }
        
        // Check for too many commands per minute
        const commandActions = recentActions.filter(a => a.action.startsWith('command_'));
        const commandsPerMinute = commandActions.length / (this.thresholds.behavioralAnalysisWindow / 60000);
        if (commandsPerMinute > this.thresholds.maxCommandsPerMinute) {
            suspiciousScore += 30;
            await this.flagSuspiciousActivity(userId, 'high_command_frequency', {
                commandsPerMinute,
                threshold: this.thresholds.maxCommandsPerMinute
            });
        }
        
        // Check for too little time between actions
        const timeBetweenActions = recentActions.slice(1).map((action, index) => 
            action.timestamp - recentActions[index].timestamp
        );
        if (timeBetweenActions.length > 0) {
            const avgTimeBetween = timeBetweenActions.reduce((a, b) => a + b, 0) / timeBetweenActions.length;
            if (avgTimeBetween < this.thresholds.minTimeBetweenActions) {
                suspiciousScore += 60;
                await this.flagSuspiciousActivity(userId, 'rapid_actions', {
                    avgTimeBetween,
                    threshold: this.thresholds.minTimeBetweenActions
                });
            }
        }
        
        // Check for multiple device fingerprints
        if (userPattern.deviceFingerprints.size > 3) {
            suspiciousScore += 80;
            await this.flagSuspiciousActivity(userId, 'multiple_devices', {
                deviceCount: userPattern.deviceFingerprints.size
            });
        }
        
        userPattern.suspiciousScore = suspiciousScore;
        
        // Apply restrictions based on suspicious score
        if (suspiciousScore > 200) {
            await this.applyPenalty(userId, 'temporary_restriction', 'High suspicious activity score', 604800000); // 7 days
        } else if (suspiciousScore > 100) {
            await this.applyPenalty(userId, 'increased_monitoring', 'Medium suspicious activity score', 86400000); // 24 hours
        }
    }

    async trackIPAddress(ipAddress, userId, timestamp) {
        if (!this.ipAddresses.has(ipAddress)) {
            this.ipAddresses.set(ipAddress, {
                users: new Set(),
                firstSeen: timestamp,
                lastSeen: timestamp,
                activityCount: 0
            });
        }
        
        const ipData = this.ipAddresses.get(ipAddress);
        ipData.users.add(userId);
        ipData.lastSeen = timestamp;
        ipData.activityCount++;
        
        // Check for too many accounts per IP
        if (ipData.users.size > this.thresholds.maxAccountsPerIP) {
            await this.flagSuspiciousActivity(0, 'suspicious_ip', {
                ipAddress,
                accountCount: ipData.users.size,
                threshold: this.thresholds.maxAccountsPerIP
            });
        }
    }

    async trackDeviceFingerprint(fingerprint, userId, timestamp) {
        if (!this.deviceFingerprints.has(fingerprint)) {
            this.deviceFingerprints.set(fingerprint, {
                users: new Set(),
                firstSeen: timestamp,
                lastSeen: timestamp,
                activityCount: 0
            });
        }
        
        const deviceData = this.deviceFingerprints.get(fingerprint);
        deviceData.users.add(userId);
        deviceData.lastSeen = timestamp;
        deviceData.activityCount++;
        
        // Check for too many accounts per device
        if (deviceData.users.size > this.thresholds.maxAccountsPerDevice) {
            await this.flagSuspiciousActivity(0, 'suspicious_device', {
                fingerprint: fingerprint.substring(0, 8) + '...',
                accountCount: deviceData.users.size,
                threshold: this.thresholds.maxAccountsPerDevice
            });
        }
    }

    async analyzeMultiAccountPatterns(userId, userData, metadata) {
        // Check for similar usernames
        await this.checkSimilarUsernames(userId, userData.username);
        
        // Check for rapid account creation
        await this.checkRapidAccountCreation(userId, Date.now());
    }

    async checkSimilarUsernames(userId, username) {
        const query = `
            SELECT username FROM users 
            WHERE username ILIKE $1 
            AND username != $2
            ORDER BY created_at DESC
            LIMIT 10
        `;
        
        const pattern = `%${username}%`;
        const result = await Database.query(query, [pattern, username]);
        const similarUsernames = result.rows.map(row => row.username);
        
        if (similarUsernames.length > this.thresholds.maxSimilarUsernames) {
            await this.flagSuspiciousActivity(userId, 'similar_usernames', {
                username,
                similarCount: similarUsernames.length,
                similarUsernames: similarUsernames.slice(0, 5)
            });
        }
    }

    async checkRapidAccountCreation(userId, timestamp) {
        const timeWindow = this.thresholds.timeWindow;
        const cutoff = timestamp - timeWindow;
        
        const query = `
            SELECT COUNT(*) as count FROM users 
            WHERE created_at > $1
        `;
        const result = await Database.query(query, [new Date(cutoff)]);
        const recentAccounts = parseInt(result.rows[0].count);
        
        if (recentAccounts > this.thresholds.maxAccountsPerTimeWindow) {
            await this.flagSuspiciousActivity(userId, 'rapid_account_creation', {
                recentAccounts,
                threshold: this.thresholds.maxAccountsPerTimeWindow,
                timeWindow: timeWindow / 3600000
            });
        }
    }

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

    async analyzeBehavioralPatterns() {
        for (const [userId, pattern] of this.behavioralPatterns) {
            if (pattern.actions.length > 10) {
                await this.detectSuspiciousPatterns(userId, pattern);
            }
        }
    }

    async analyzeAccountClusters() {
        // Analyze IP-based clusters
        for (const [ipAddress, ipData] of this.ipAddresses) {
            if (ipData.users.size > 1) {
                const suspiciousScore = ipData.users.size * 20;
                if (suspiciousScore > this.thresholds.suspiciousActivityThreshold) {
                    await this.flagSuspiciousActivity(0, 'suspicious_cluster', {
                        type: 'ip',
                        identifier: ipAddress,
                        accountCount: ipData.users.size,
                        suspiciousScore
                    });
                }
            }
        }
        
        // Analyze device-based clusters
        for (const [fingerprint, deviceData] of this.deviceFingerprints) {
            if (deviceData.users.size > 1) {
                const suspiciousScore = deviceData.users.size * 25;
                if (suspiciousScore > this.thresholds.suspiciousActivityThreshold) {
                    await this.flagSuspiciousActivity(0, 'suspicious_cluster', {
                        type: 'device',
                        identifier: fingerprint.substring(0, 8) + '...',
                        accountCount: deviceData.users.size,
                        suspiciousScore
                    });
                }
            }
        }
    }

    getSeverity(type) {
        const severityMap = {
            'high_action_frequency': 'medium',
            'high_command_frequency': 'medium',
            'rapid_actions': 'high',
            'multiple_devices': 'critical',
            'similar_usernames': 'medium',
            'rapid_account_creation': 'high',
            'rate_limit_exceeded': 'low',
            'impossible_score': 'high',
            'suspicious_duration': 'medium',
            'negative_score': 'critical',
            'suspicious_ip': 'high',
            'suspicious_device': 'high',
            'suspicious_cluster': 'critical'
        };
        return severityMap[type] || 'low';
    }

    cleanup() {
        const now = Date.now();
        
        // Clean behavioral patterns
        for (const [userId, pattern] of this.behavioralPatterns) {
            this.cleanupUserPattern(userId);
        }
        
        // Clean rate limits
        for (const [key, rateLimit] of this.rateLimits) {
            if (now > rateLimit.resetTime + 300000) {
                this.rateLimits.delete(key);
            }
        }
        
        // Clean suspicious activities
        for (const [userId, activities] of this.suspiciousActivities) {
            const recentActivities = activities.filter(
                activity => now - activity.timestamp.getTime() < 86400000
            );
            this.suspiciousActivities.set(userId, recentActivities);
        }
        
        // Clean IP addresses
        const cutoff = now - this.thresholds.timeWindow;
        for (const [ipAddress, ipData] of this.ipAddresses) {
            if (ipData.lastSeen < cutoff) {
                this.ipAddresses.delete(ipAddress);
            }
        }
        
        // Clean device fingerprints
        for (const [fingerprint, deviceData] of this.deviceFingerprints) {
            if (deviceData.lastSeen < cutoff) {
                this.deviceFingerprints.delete(fingerprint);
            }
        }
    }

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

    // ===== PUBLIC API METHODS =====
    
    async isUserRestricted(userId) {
        const query = `
            SELECT restrictions FROM user_security 
            WHERE user_id = $1 AND status IN ('restricted', 'monitored', 'verification_required')
        `;
        const result = await Database.query(query, [userId]);
        
        if (result.rows.length === 0) return false;
        
        const restrictions = JSON.parse(result.rows[0].restrictions);
        const now = new Date();
        
        if (restrictions.expiresAt && new Date(restrictions.expiresAt) < now) {
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

    getUserSuspiciousScore(userId) {
        const pattern = this.behavioralPatterns.get(userId);
        return pattern ? pattern.suspiciousScore : 0;
    }

    getUserRiskScore(userId) {
        let riskScore = 0;
        
        // Check IP-based risk
        for (const [ipAddress, ipData] of this.ipAddresses) {
            if (ipData.users.has(userId)) {
                riskScore += ipData.users.size * 10;
            }
        }
        
        // Check device-based risk
        for (const [fingerprint, deviceData] of this.deviceFingerprints) {
            if (deviceData.users.has(userId)) {
                riskScore += deviceData.users.size * 15;
            }
        }
        
        return riskScore;
    }
}

// Singleton instance
const securityCore = new SecurityCore();

module.exports = securityCore;

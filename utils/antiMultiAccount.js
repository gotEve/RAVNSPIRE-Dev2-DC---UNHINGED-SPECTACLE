// Anti-multi-account detection and prevention
const Database = require('../database/db');
const crypto = require('crypto');

class AntiMultiAccountManager {
    constructor() {
        this.accountClusters = new Map();
        this.suspiciousConnections = new Map();
        this.ipAddresses = new Map();
        this.deviceFingerprints = new Map();
        
        // Multi-account detection thresholds
        this.thresholds = {
            maxAccountsPerIP: 3,
            maxAccountsPerDevice: 2,
            maxSimilarUsernames: 2,
            maxAccountsPerTimeWindow: 5,
            timeWindow: 86400000, // 24 hours
            clusterSimilarityThreshold: 0.8,
            suspiciousActivityThreshold: 100
        };
        
        // Cleanup intervals
        setInterval(() => this.cleanup(), 300000); // Every 5 minutes
        setInterval(() => this.analyzeAccountClusters(), 1800000); // Every 30 minutes
    }

    // Track user registration and activity
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
        
        // Check for suspicious connections
        await this.checkSuspiciousConnections(userId, ipAddress, deviceFingerprint);
    }

    // Generate device fingerprint
    generateDeviceFingerprint(userData, userAgent) {
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

    // Track IP address usage
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
            await this.flagSuspiciousIP(ipAddress, 'too_many_accounts', {
                accountCount: ipData.users.size,
                threshold: this.thresholds.maxAccountsPerIP
            });
        }
    }

    // Track device fingerprint usage
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
            await this.flagSuspiciousDevice(fingerprint, 'too_many_accounts', {
                accountCount: deviceData.users.size,
                threshold: this.thresholds.maxAccountsPerDevice
            });
        }
    }

    // Analyze multi-account patterns
    async analyzeMultiAccountPatterns(userId, userData, metadata) {
        const timestamp = Date.now();
        
        // Check for similar usernames
        await this.checkSimilarUsernames(userId, userData.username);
        
        // Check for rapid account creation
        await this.checkRapidAccountCreation(userId, timestamp);
        
        // Check for coordinated activity
        await this.checkCoordinatedActivity(userId, metadata);
        
        // Check for account age patterns
        await this.checkAccountAgePatterns(userId, userData);
    }

    // Check for similar usernames
    async checkSimilarUsernames(userId, username) {
        const similarUsernames = await this.findSimilarUsernames(username);
        
        if (similarUsernames.length > this.thresholds.maxSimilarUsernames) {
            await this.flagSuspiciousActivity(userId, 'similar_usernames', {
                username,
                similarCount: similarUsernames.length,
                similarUsernames: similarUsernames.slice(0, 5) // Limit to 5 for privacy
            });
        }
    }

    // Find similar usernames
    async findSimilarUsernames(username) {
        const query = `
            SELECT username FROM users 
            WHERE username ILIKE $1 
            AND username != $2
            ORDER BY created_at DESC
            LIMIT 10
        `;
        
        // Create pattern for similar usernames
        const pattern = `%${username}%`;
        const result = await Database.query(query, [pattern, username]);
        
        return result.rows.map(row => row.username);
    }

    // Check for rapid account creation
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
                timeWindow: timeWindow / 3600000 // Convert to hours
            });
        }
    }

    // Check for coordinated activity
    async checkCoordinatedActivity(userId, metadata) {
        const ipAddress = metadata.ipAddress;
        const deviceFingerprint = metadata.deviceFingerprint;
        
        if (!ipAddress || !deviceFingerprint) return;
        
        // Check if multiple accounts are active from same IP/device
        const ipUsers = this.ipAddresses.get(ipAddress)?.users || new Set();
        const deviceUsers = this.deviceFingerprints.get(deviceFingerprint)?.users || new Set();
        
        if (ipUsers.size > 1 && deviceUsers.size > 1) {
            const intersection = new Set([...ipUsers].filter(x => deviceUsers.has(x)));
            
            if (intersection.size > 1) {
                await this.flagSuspiciousActivity(userId, 'coordinated_activity', {
                    ipAddress,
                    deviceFingerprint: deviceFingerprint.substring(0, 8) + '...',
                    accountCount: intersection.size,
                    accounts: Array.from(intersection)
                });
            }
        }
    }

    // Check account age patterns
    async checkAccountAgePatterns(userId, userData) {
        const accountAge = Date.now() - userData.createdTimestamp;
        const minAccountAge = 86400000; // 24 hours
        
        if (accountAge < minAccountAge) {
            await this.flagSuspiciousActivity(userId, 'new_account', {
                accountAge: accountAge / 3600000, // Convert to hours
                minAge: minAccountAge / 3600000
            });
        }
    }

    // Check for suspicious connections
    async checkSuspiciousConnections(userId, ipAddress, deviceFingerprint) {
        const connectionKey = `${ipAddress}_${deviceFingerprint}`;
        
        if (!this.suspiciousConnections.has(connectionKey)) {
            this.suspiciousConnections.set(connectionKey, {
                users: new Set(),
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                activityCount: 0
            });
        }
        
        const connection = this.suspiciousConnections.get(connectionKey);
        connection.users.add(userId);
        connection.lastSeen = Date.now();
        connection.activityCount++;
        
        // Check for too many users per connection
        if (connection.users.size > 2) {
            await this.flagSuspiciousActivity(userId, 'suspicious_connection', {
                connectionKey: connectionKey.substring(0, 16) + '...',
                userCount: connection.users.size,
                activityCount: connection.activityCount
            });
        }
    }

    // Analyze account clusters
    async analyzeAccountClusters() {
        const clusters = new Map();
        
        // Group accounts by IP address
        for (const [ipAddress, ipData] of this.ipAddresses) {
            if (ipData.users.size > 1) {
                const clusterKey = `ip_${ipAddress}`;
                clusters.set(clusterKey, {
                    type: 'ip',
                    identifier: ipAddress,
                    accounts: Array.from(ipData.users),
                    size: ipData.users.size,
                    firstSeen: ipData.firstSeen,
                    lastSeen: ipData.lastSeen
                });
            }
        }
        
        // Group accounts by device fingerprint
        for (const [fingerprint, deviceData] of this.deviceFingerprints) {
            if (deviceData.users.size > 1) {
                const clusterKey = `device_${fingerprint}`;
                clusters.set(clusterKey, {
                    type: 'device',
                    identifier: fingerprint,
                    accounts: Array.from(deviceData.users),
                    size: deviceData.users.size,
                    firstSeen: deviceData.firstSeen,
                    lastSeen: deviceData.lastSeen
                });
            }
        }
        
        // Analyze clusters for suspicious patterns
        for (const [clusterKey, cluster] of clusters) {
            await this.analyzeCluster(cluster);
        }
    }

    // Analyze individual cluster
    async analyzeCluster(cluster) {
        const suspiciousScore = this.calculateClusterSuspiciousScore(cluster);
        
        if (suspiciousScore > this.thresholds.suspiciousActivityThreshold) {
            await this.flagSuspiciousCluster(cluster, suspiciousScore);
        }
    }

    // Calculate cluster suspicious score
    calculateClusterSuspiciousScore(cluster) {
        let score = 0;
        
        // Base score from cluster size
        score += cluster.size * 20;
        
        // Time-based scoring
        const timeSpan = cluster.lastSeen - cluster.firstSeen;
        if (timeSpan < 3600000) { // Less than 1 hour
            score += 50;
        } else if (timeSpan < 86400000) { // Less than 24 hours
            score += 25;
        }
        
        // Activity-based scoring
        const activityPerAccount = cluster.activityCount / cluster.size;
        if (activityPerAccount > 100) {
            score += 30;
        }
        
        return score;
    }

    // Flag suspicious IP address
    async flagSuspiciousIP(ipAddress, type, data) {
        const flag = {
            type: 'suspicious_ip',
            ipAddress,
            flagType: type,
            data,
            timestamp: new Date(),
            severity: 'high'
        };

        await Database.query(`
            INSERT INTO security_flags (user_id, flag_type, data, severity, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [0, `suspicious_ip_${type}`, JSON.stringify(flag), 'high', flag.timestamp]);

        console.warn(`🚨 Suspicious IP: ${ipAddress} - ${type}`, data);
    }

    // Flag suspicious device
    async flagSuspiciousDevice(fingerprint, type, data) {
        const flag = {
            type: 'suspicious_device',
            fingerprint: fingerprint.substring(0, 8) + '...',
            flagType: type,
            data,
            timestamp: new Date(),
            severity: 'high'
        };

        await Database.query(`
            INSERT INTO security_flags (user_id, flag_type, data, severity, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [0, `suspicious_device_${type}`, JSON.stringify(flag), 'high', flag.timestamp]);

        console.warn(`🚨 Suspicious Device: ${fingerprint.substring(0, 8)}... - ${type}`, data);
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

        await Database.query(`
            INSERT INTO security_flags (user_id, flag_type, data, severity, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, type, JSON.stringify(data), flag.severity, flag.timestamp]);

        console.warn(`🚨 Multi-Account Flag: User ${userId} - ${type}`, data);
    }

    // Flag suspicious cluster
    async flagSuspiciousCluster(cluster, suspiciousScore) {
        const flag = {
            type: 'suspicious_cluster',
            cluster,
            suspiciousScore,
            timestamp: new Date(),
            severity: 'critical'
        };

        await Database.query(`
            INSERT INTO security_flags (user_id, flag_type, data, severity, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [0, 'suspicious_cluster', JSON.stringify(flag), 'critical', flag.timestamp]);

        console.warn(`🚨 Suspicious Cluster: ${cluster.type} - ${cluster.identifier}`, {
            size: cluster.size,
            suspiciousScore
        });
    }

    // Get severity level
    getSeverity(type) {
        const severityMap = {
            'similar_usernames': 'medium',
            'rapid_account_creation': 'high',
            'coordinated_activity': 'critical',
            'new_account': 'low',
            'suspicious_connection': 'high'
        };
        return severityMap[type] || 'low';
    }

    // Cleanup old data
    cleanup() {
        const now = Date.now();
        const cutoff = now - this.thresholds.timeWindow;
        
        // Clean IP addresses
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
        
        // Clean suspicious connections
        for (const [connectionKey, connection] of this.suspiciousConnections) {
            if (connection.lastSeen < cutoff) {
                this.suspiciousConnections.delete(connectionKey);
            }
        }
    }

    // Get user's multi-account risk score
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

    // Get user's connection summary
    getUserConnectionSummary(userId) {
        const summary = {
            ipAddresses: [],
            deviceFingerprints: [],
            riskScore: 0,
            suspiciousConnections: 0
        };
        
        // Find IP addresses
        for (const [ipAddress, ipData] of this.ipAddresses) {
            if (ipData.users.has(userId)) {
                summary.ipAddresses.push({
                    ip: ipAddress,
                    accountCount: ipData.users.size,
                    firstSeen: ipData.firstSeen,
                    lastSeen: ipData.lastSeen
                });
            }
        }
        
        // Find device fingerprints
        for (const [fingerprint, deviceData] of this.deviceFingerprints) {
            if (deviceData.users.has(userId)) {
                summary.deviceFingerprints.push({
                    fingerprint: fingerprint.substring(0, 8) + '...',
                    accountCount: deviceData.users.size,
                    firstSeen: deviceData.firstSeen,
                    lastSeen: deviceData.lastSeen
                });
            }
        }
        
        summary.riskScore = this.getUserRiskScore(userId);
        
        return summary;
    }
}

// Singleton instance
const antiMultiAccountManager = new AntiMultiAccountManager();

module.exports = antiMultiAccountManager;

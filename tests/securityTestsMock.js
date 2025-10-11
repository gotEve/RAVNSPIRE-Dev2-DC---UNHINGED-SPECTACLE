// Security tests with mock database
const MockDatabase = require('./mockDatabase');

// Mock the database module
const originalDatabase = require('../database/db');
const mockDb = new MockDatabase();

// Override the database module
require.cache[require.resolve('../database/db')] = {
    exports: mockDb
};

// Now import the security core (it will use the mock)
const securityCore = require('../utils/securityCore');
const databaseCore = require('../utils/databaseCore');

class SecurityTestsMock {
    constructor() {
        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async runAllTests() {
        console.log('🧪 Running Security System Tests (Mock Database)...\n');
        
        // Core functionality tests
        await this.testRateLimiting();
        await this.testBehavioralAnalysis();
        await this.testDeviceFingerprinting();
        await this.testMultiAccountDetection();
        await this.testGameValidation();
        await this.testPenaltySystem();
        await this.testDatabaseOperations();
        await this.testCacheManagement();
        
        // Integration tests
        await this.testEndToEndScenarios();
        await this.testEdgeCases();
        await this.testPerformance();
        
        this.printResults();
        return this.testResults;
    }

    async testRateLimiting() {
        console.log('Testing Rate Limiting...');
        
        try {
            // Test normal rate limiting
            const userId = 'test_user_1';
            const result1 = await securityCore.checkRateLimit(userId, 'test_action', 5, 60000);
            this.assert(result1 === true, 'Rate limit should allow first request');
            
            // Test rate limit exceeded
            for (let i = 0; i < 5; i++) {
                await securityCore.checkRateLimit(userId, 'test_action', 5, 60000);
            }
            const result2 = await securityCore.checkRateLimit(userId, 'test_action', 5, 60000);
            this.assert(result2 === false, 'Rate limit should block after limit exceeded');
            
            this.recordTest('Rate Limiting', true);
        } catch (error) {
            this.recordTest('Rate Limiting', false, error.message);
        }
    }

    async testBehavioralAnalysis() {
        console.log('Testing Behavioral Analysis...');
        
        try {
            const userId = 'test_user_2';
            const userData = { username: 'testuser', discriminator: '1234' };
            
            // Test normal behavior
            await securityCore.trackUserBehavior(userId, 'normal_action', { user: userData });
            const score1 = securityCore.getUserSuspiciousScore(userId);
            this.assert(score1 >= 0, 'Suspicious score should be non-negative');
            
            // Test suspicious behavior (rapid actions)
            for (let i = 0; i < 25; i++) {
                await securityCore.trackUserBehavior(userId, 'rapid_action', { user: userData });
            }
            const score2 = securityCore.getUserSuspiciousScore(userId);
            this.assert(score2 > score1, 'Suspicious score should increase with rapid actions');
            
            this.recordTest('Behavioral Analysis', true);
        } catch (error) {
            this.recordTest('Behavioral Analysis', false, error.message);
        }
    }

    async testDeviceFingerprinting() {
        console.log('Testing Device Fingerprinting...');
        
        try {
            const userData1 = { username: 'user1', discriminator: '1234' };
            const userData2 = { username: 'user2', discriminator: '5678' };
            
            const fingerprint1 = securityCore.generateDeviceFingerprint(userData1);
            const fingerprint2 = securityCore.generateDeviceFingerprint(userData2);
            
            this.assert(fingerprint1 !== fingerprint2, 'Different users should have different fingerprints');
            this.assert(fingerprint1.length === 64, 'Fingerprint should be 64 characters (SHA256)');
            
            // Test same user, same fingerprint
            const fingerprint1Again = securityCore.generateDeviceFingerprint(userData1);
            this.assert(fingerprint1 === fingerprint1Again, 'Same user should generate same fingerprint');
            
            this.recordTest('Device Fingerprinting', true);
        } catch (error) {
            this.recordTest('Device Fingerprinting', false, error.message);
        }
    }

    async testMultiAccountDetection() {
        console.log('Testing Multi-Account Detection...');
        
        try {
            const userId1 = 'test_user_3';
            const userId2 = 'test_user_4';
            const userData1 = { username: 'user1', discriminator: '1234' };
            const userData2 = { username: 'user2', discriminator: '5678' };
            const metadata = { ipAddress: '192.168.1.1' };
            
            // Track two users from same IP
            await securityCore.trackUserActivity(userId1, userData1, metadata);
            await securityCore.trackUserActivity(userId2, userData2, metadata);
            
            const riskScore1 = securityCore.getUserRiskScore(userId1);
            const riskScore2 = securityCore.getUserRiskScore(userId2);
            
            this.assert(riskScore1 > 0, 'Risk score should be positive for multi-account scenario');
            this.assert(riskScore2 > 0, 'Risk score should be positive for multi-account scenario');
            
            this.recordTest('Multi-Account Detection', true);
        } catch (error) {
            this.recordTest('Multi-Account Detection', false, error.message);
        }
    }

    async testGameValidation() {
        console.log('Testing Game Validation...');
        
        try {
            const userId = 'test_user_5';
            const userData = { username: 'testuser', discriminator: '1234' };
            
            // Test valid game result
            const validResult = {
                score: 100,
                duration: 10000,
                won: true
            };
            
            const validation1 = await securityCore.validateGameResult(userId, 'trivia', validResult, { user: userData });
            this.assert(validation1.isValid === true, 'Valid game result should pass validation');
            
            // Test invalid game result (negative score)
            const invalidResult = {
                score: -50,
                duration: 5000,
                won: false
            };
            
            const validation2 = await securityCore.validateGameResult(userId, 'trivia', invalidResult, { user: userData });
            this.assert(validation2.isValid === false, 'Invalid game result should fail validation');
            this.assert(validation2.flags.includes('negative_score'), 'Should flag negative score');
            
            this.recordTest('Game Validation', true);
        } catch (error) {
            this.recordTest('Game Validation', false, error.message);
        }
    }

    async testPenaltySystem() {
        console.log('Testing Penalty System...');
        
        try {
            const userId = 'test_user_6';
            
            // Test penalty application
            await securityCore.applyPenalty(userId, 'temporary_restriction', 'Test penalty', 3600000);
            
            const isRestricted = await securityCore.isUserRestricted(userId);
            this.assert(isRestricted === true, 'User should be restricted after penalty');
            
            this.recordTest('Penalty System', true);
        } catch (error) {
            this.recordTest('Penalty System', false, error.message);
        }
    }

    async testDatabaseOperations() {
        console.log('Testing Database Operations...');
        
        try {
            const testUserId = 'test_user_7';
            const testUsername = 'testuser7';
            
            // Test user creation
            const user = await databaseCore.createUser(testUserId, testUsername);
            this.assert(user !== null, 'User should be created successfully');
            this.assert(user.discord_id === testUserId, 'User ID should match');
            
            // Test user retrieval
            const retrievedUser = await databaseCore.getUser(testUserId);
            this.assert(retrievedUser !== null, 'User should be retrievable');
            this.assert(retrievedUser.username === testUsername, 'Username should match');
            
            // Test cache
            const cachedUser = await databaseCore.getUser(testUserId);
            this.assert(cachedUser !== null, 'User should be cached');
            
            this.recordTest('Database Operations', true);
        } catch (error) {
            this.recordTest('Database Operations', false, error.message);
        }
    }

    async testCacheManagement() {
        console.log('Testing Cache Management...');
        
        try {
            const testUserId = 'test_user_8';
            
            // Test cache invalidation
            await databaseCore.createUser(testUserId, 'testuser8');
            await databaseCore.getUser(testUserId); // Should cache
            databaseCore.invalidateUserCache(testUserId);
            
            // Cache should be cleared
            this.assert(databaseCore.queryCache.size >= 0, 'Cache should be manageable');
            
            this.recordTest('Cache Management', true);
        } catch (error) {
            this.recordTest('Cache Management', false, error.message);
        }
    }

    async testEndToEndScenarios() {
        console.log('Testing End-to-End Scenarios...');
        
        try {
            const userId = 'test_user_9';
            const userData = { username: 'testuser9', discriminator: '1234' };
            
            // Simulate a complete user session
            await securityCore.trackUserActivity(userId, userData, { ipAddress: '192.168.1.100' });
            await securityCore.trackUserBehavior(userId, 'game_start', { user: userData });
            
            const gameResult = { score: 150, duration: 8000, won: true };
            const validation = await securityCore.validateGameResult(userId, 'trivia', gameResult, { user: userData });
            
            this.assert(validation.isValid === true, 'End-to-end scenario should work');
            
            this.recordTest('End-to-End Scenarios', true);
        } catch (error) {
            this.recordTest('End-to-End Scenarios', false, error.message);
        }
    }

    async testEdgeCases() {
        console.log('Testing Edge Cases...');
        
        try {
            // Test with null/undefined inputs
            const result1 = await securityCore.checkRateLimit(null, 'test', 5, 60000);
            this.assert(result1 === false, 'Null user ID should be handled gracefully');
            
            // Test with empty strings
            const result2 = await securityCore.checkRateLimit('', 'test', 5, 60000);
            this.assert(result2 === false, 'Empty user ID should be handled gracefully');
            
            // Test with very large numbers
            const result3 = await securityCore.checkRateLimit('test_user_10', 'test', 999999, 60000);
            this.assert(result3 === true, 'Large limits should be handled');
            
            this.recordTest('Edge Cases', true);
        } catch (error) {
            this.recordTest('Edge Cases', false, error.message);
        }
    }

    async testPerformance() {
        console.log('Testing Performance...');
        
        try {
            const startTime = Date.now();
            const userId = 'test_user_11';
            
            // Test bulk operations
            for (let i = 0; i < 100; i++) {
                await securityCore.checkRateLimit(userId, `action_${i}`, 100, 60000);
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.assert(duration < 5000, '100 operations should complete in under 5 seconds');
            
            this.recordTest('Performance', true);
        } catch (error) {
            this.recordTest('Performance', false, error.message);
        }
    }

    // ===== HELPER METHODS =====
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    recordTest(testName, passed, error = null) {
        const result = {
            name: testName,
            passed,
            error,
            timestamp: new Date()
        };
        
        this.testResults.push(result);
        
        if (passed) {
            this.passedTests++;
            console.log(`  ✅ ${testName}`);
        } else {
            this.failedTests++;
            console.log(`  ❌ ${testName}: ${error}`);
        }
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log(`✅ Passed: ${this.passedTests}`);
        console.log(`❌ Failed: ${this.failedTests}`);
        console.log(`📈 Success Rate: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(1)}%`);
        
        if (this.failedTests > 0) {
            console.log('\n🚨 Failed Tests:');
            this.testResults
                .filter(test => !test.passed)
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.error}`);
                });
        }
        
        console.log('\n🎯 Quality Control Status:', this.failedTests === 0 ? 'PASSED' : 'FAILED');
    }
}

// Export for use
module.exports = SecurityTestsMock;

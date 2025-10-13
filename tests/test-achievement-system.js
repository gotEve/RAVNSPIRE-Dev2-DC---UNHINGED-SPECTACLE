// Test the enhanced achievement system
const achievementManager = require('../utils/achievementManager');
const Database = require('../database/db');

async function testAchievementSystem() {
    console.log('🏆 Testing Achievement System...\n');

    try {
        // Test 1: Initialize achievements
        console.log('1. Initializing achievements...');
        await achievementManager.initializeAchievements();
        console.log('   ✅ Achievements initialized');

        // Test 2: Create test user
        console.log('\n2. Creating test user...');
        const testUserId = '888888888';
        await Database.createUser(testUserId, 'AchievementTestUser');
        console.log('   ✅ Test user created');

        // Test 3: Test first game achievement
        console.log('\n3. Testing first game achievement...');
        const userStats1 = {
            games_played: 1,
            games_won: 0,
            average_score: 0,
            max_score: 0,
            lore_discovered: 0,
            guild_joined: false,
            guild_role: null,
            achievements_unlocked: 0,
            badges_earned: 0,
            titles_earned: 0,
            current_faction: 'human',
            faction_purity: 1.0,
            currency: 0,
            global_xp: 0
        };

        const newAchievements1 = await achievementManager.checkAndAwardAchievements(testUserId, userStats1);
        console.log(`   ✅ Found ${newAchievements1.length} new achievements`);
        newAchievements1.forEach(achievement => {
            console.log(`     - ${achievement.name}: ${achievement.rewards.xp} XP`);
        });

        // Test 4: Test first win achievement
        console.log('\n4. Testing first win achievement...');
        const userStats2 = {
            ...userStats1,
            games_played: 5,
            games_won: 1,
            average_score: 120,
            max_score: 150
        };

        const newAchievements2 = await achievementManager.checkAndAwardAchievements(testUserId, userStats2);
        console.log(`   ✅ Found ${newAchievements2.length} new achievements`);
        newAchievements2.forEach(achievement => {
            console.log(`     - ${achievement.name}: ${achievement.rewards.xp} XP`);
        });

        // Test 5: Test guild achievement
        console.log('\n5. Testing guild achievement...');
        const userStats3 = {
            ...userStats2,
            guild_joined: true,
            guild_role: 'member'
        };

        const newAchievements3 = await achievementManager.checkAndAwardAchievements(testUserId, userStats3);
        console.log(`   ✅ Found ${newAchievements3.length} new achievements`);
        newAchievements3.forEach(achievement => {
            console.log(`     - ${achievement.name}: ${achievement.rewards.xp} XP`);
        });

        // Test 6: Test lore achievement
        console.log('\n6. Testing lore achievement...');
        const userStats4 = {
            ...userStats3,
            lore_discovered: 1
        };

        const newAchievements4 = await achievementManager.checkAndAwardAchievements(testUserId, userStats4);
        console.log(`   ✅ Found ${newAchievements4.length} new achievements`);
        newAchievements4.forEach(achievement => {
            console.log(`     - ${achievement.name}: ${achievement.rewards.xp} XP`);
        });

        // Test 7: Get user's achievements
        console.log('\n7. Getting user achievements...');
        const userAchievements = await achievementManager.getUserAchievements(testUserId);
        console.log(`   ✅ User has ${userAchievements.length} achievements`);

        // Test 8: Get user's badges
        console.log('\n8. Getting user badges...');
        const userBadges = await achievementManager.getUserBadges(testUserId);
        console.log(`   ✅ User has ${userBadges.length} badges`);
        userBadges.forEach(badge => {
            console.log(`     - ${badge.badge_name}`);
        });

        // Test 9: Get user's titles
        console.log('\n9. Getting user titles...');
        const userTitles = await achievementManager.getUserTitles(testUserId);
        console.log(`   ✅ User has ${userTitles.length} titles`);
        userTitles.forEach(title => {
            console.log(`     - ${title.title_name}`);
        });

        // Test 10: Test achievement progress
        console.log('\n10. Testing achievement progress...');
        const progress = await achievementManager.getAchievementProgress(testUserId, 'century_club');
        if (progress) {
            console.log(`   ✅ Progress for Century Club:`);
            console.log(`     - Games played: ${progress.progress.games_played.current}/${progress.progress.games_played.target}`);
            console.log(`     - Percentage: ${Math.round(progress.progress.games_played.percentage)}%`);
            console.log(`     - Completed: ${progress.completed}`);
        }

        // Test 11: Test high-level achievement (should not trigger)
        console.log('\n11. Testing high-level achievement...');
        const userStats5 = {
            ...userStats4,
            games_played: 50, // Not enough for century club
            games_won: 25
        };

        const newAchievements5 = await achievementManager.checkAndAwardAchievements(testUserId, userStats5);
        console.log(`   ✅ Found ${newAchievements5.length} new achievements (should be 0)`);

        console.log('\n🎉 Achievement system tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test if called directly
if (require.main === module) {
    testAchievementSystem().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testAchievementSystem };

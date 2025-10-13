// Test the new standardized reward system
const { gameRewardCalculator } = require('../config/gameRewards');
const Database = require('../database/db');

async function testRewardSystem() {
    console.log('🎁 Testing Standardized Reward System...\n');

    try {
        // Test 1: Basic reward calculation
        console.log('1. Testing basic reward calculation...');
        const gameData = {
            gameType: 'tetris',
            score: 150,
            duration: 120000, // 2 minutes
            accuracy: 85,
            userFaction: 'human'
        };

        const userStats = {
            current_faction: 'human',
            guild: null,
            gamesPlayed: { tetris: 5, tictactoe: 3 },
            winStreak: 2,
            plots: null
        };

        const rewards = gameRewardCalculator.calculateRewards(gameData, userStats);
        console.log('   Rewards calculated:', rewards);

        // Test 2: Different factions
        console.log('\n2. Testing different factions...');
        const aiGameData = { ...gameData, userFaction: 'ai' };
        const aiRewards = gameRewardCalculator.calculateRewards(aiGameData, { ...userStats, current_faction: 'ai' });
        console.log('   AI rewards:', aiRewards.factionResources);

        const natureGameData = { ...gameData, userFaction: 'nature' };
        const natureRewards = gameRewardCalculator.calculateRewards(natureGameData, { ...userStats, current_faction: 'nature' });
        console.log('   Nature rewards:', natureRewards.factionResources);

        // Test 3: Variety bonus
        console.log('\n3. Testing variety bonus...');
        const highVarietyStats = {
            ...userStats,
            gamesPlayed: { tetris: 2, tictactoe: 2, puzzle: 2, strategy: 2 }
        };
        const varietyRewards = gameRewardCalculator.calculateRewards(gameData, highVarietyStats);
        console.log('   Variety multiplier:', varietyRewards.multipliers.variety);

        // Test 4: Speed bonus
        console.log('\n4. Testing speed bonus...');
        const fastGameData = { ...gameData, duration: 30000 }; // 30 seconds
        const speedRewards = gameRewardCalculator.calculateRewards(fastGameData, userStats);
        console.log('   Speed multiplier:', speedRewards.multipliers.speed);

        // Test 5: Accuracy bonus
        console.log('\n5. Testing accuracy bonus...');
        const accurateGameData = { ...gameData, accuracy: 100 };
        const accuracyRewards = gameRewardCalculator.calculateRewards(accurateGameData, userStats);
        console.log('   Accuracy multiplier:', accuracyRewards.multipliers.accuracy);

        // Test 6: Database integration
        console.log('\n6. Testing database integration...');
        try {
            // Create test user
            await Database.createUser('999999999', 'RewardTestUser');
            
            // Test faction resource update
            const testResources = { food: 10, water: 5 };
            const updateQuery = `
                INSERT INTO player_resources (discord_id, food, water)
                VALUES ($1, $2, $3)
                ON CONFLICT (discord_id) DO UPDATE SET
                    food = player_resources.food + EXCLUDED.food,
                    water = player_resources.water + EXCLUDED.water
            `;
            await Database.query(updateQuery, ['999999999', 10, 5]);
            console.log('   ✅ Faction resources updated successfully');

            // Test game variety tracking
            const varietyQuery = `
                INSERT INTO game_variety_log (discord_id, game_type, times_played, last_played)
                VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (discord_id, game_type) DO UPDATE SET
                    times_played = game_variety_log.times_played + 1,
                    last_played = CURRENT_TIMESTAMP
            `;
            await Database.query(varietyQuery, ['999999999', 'tetris']);
            console.log('   ✅ Game variety tracking updated successfully');

        } catch (error) {
            console.log('   ❌ Database integration failed:', error.message);
        }

        console.log('\n🎉 Reward system tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test if called directly
if (require.main === module) {
    testRewardSystem().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testRewardSystem };

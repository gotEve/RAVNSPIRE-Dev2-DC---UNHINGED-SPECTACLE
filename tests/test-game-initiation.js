// Test game initiation to debug issues
const gameRegistry = require('../games/GameRegistry');
const gameSessionManager = require('../games/engine/GameSession');
const Database = require('../database/db');

async function testGameInitiation() {
    console.log('🎮 Testing Game Initiation...\n');

    try {
        // Test 1: Check GameRegistry
        console.log('1. Testing GameRegistry...');
        const games = gameRegistry.getAllGames();
        console.log(`   Found ${games.length} games:`, games.map(g => g.name));

        // Test 2: Test Tetris instantiation
        console.log('\n2. Testing Tetris Game...');
        const TetrisClass = gameRegistry.getGameClass('tetris');
        if (!TetrisClass) {
            throw new Error('Tetris game class not found');
        }

        const tetrisGame = new TetrisClass();
        console.log('   ✅ Tetris game instantiated');

        // Test 3: Test game metadata
        console.log('\n3. Testing game metadata...');
        const metadata = tetrisGame.getMetadata();
        console.log('   Metadata:', metadata);

        // Test 4: Test game initialization
        console.log('\n4. Testing game initialization...');
        const testUserId = '123456789';
        
        try {
            await tetrisGame.initialize(testUserId, {});
            console.log('   ✅ Game initialized successfully');
        } catch (error) {
            console.log('   ❌ Game initialization failed:', error.message);
        }

        // Test 5: Test game state
        console.log('\n5. Testing game state...');
        try {
            const gameState = await tetrisGame.getGameState();
            console.log('   ✅ Game state retrieved');
            console.log('   State keys:', Object.keys(gameState));
        } catch (error) {
            console.log('   ❌ Game state failed:', error.message);
        }

        // Test 6: Test Tic Tac Toe
        console.log('\n6. Testing Tic Tac Toe Game...');
        const TicTacToeClass = gameRegistry.getGameClass('tictactoe');
        if (!TicTacToeClass) {
            throw new Error('Tic Tac Toe game class not found');
        }

        const tictactoeGame = new TicTacToeClass();
        console.log('   ✅ Tic Tac Toe game instantiated');

        const tttMetadata = tictactoeGame.getMetadata();
        console.log('   Tic Tac Toe metadata:', tttMetadata);

        // Test 7: Test session manager
        console.log('\n7. Testing GameSession Manager...');
        const sessionManager = gameSessionManager;
        console.log('   ✅ Session manager accessed');

        // Test 8: Test database connection
        console.log('\n8. Testing database connection...');
        try {
            const testQuery = await Database.query('SELECT COUNT(*) as count FROM users');
            console.log('   ✅ Database connection working');
        } catch (error) {
            console.log('   ❌ Database connection failed:', error.message);
        }

        console.log('\n🎉 Game initiation tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test if called directly
if (require.main === module) {
    testGameInitiation().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testGameInitiation };

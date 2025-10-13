// Test game commands to see if they work properly
const { SlashCommandBuilder } = require('discord.js');
const gameRegistry = require('../games/GameRegistry');
const gameSessionManager = require('../games/engine/GameSession');
const Database = require('../database/db');

// Mock Discord interaction
class MockInteraction {
    constructor(userId = '123456789', username = 'TestUser') {
        this.user = { id: userId, username };
        this.options = {
            getString: (name) => {
                if (name === 'game') return 'tetris';
                if (name === 'mode') return 'single';
                return null;
            }
        };
        this.reply = async (content) => {
            console.log('   Reply:', typeof content === 'string' ? content : 'Embed/Components sent');
            return { id: 'mock-reply' };
        };
    }
}

async function testGameCommands() {
    console.log('🎮 Testing Game Commands...\n');

    try {
        // Test 1: Test games list command
        console.log('1. Testing /games list command...');
        const gamesListCommand = require('../commands/games/list.js');
        const mockInteraction1 = new MockInteraction();
        
        try {
            await gamesListCommand.execute(mockInteraction1);
            console.log('   ✅ Games list command executed successfully');
        } catch (error) {
            console.log('   ❌ Games list command failed:', error.message);
        }

        // Test 2: Test games play command
        console.log('\n2. Testing /games-play command...');
        const gamesPlayCommand = require('../commands/games/play.js');
        const mockInteraction2 = new MockInteraction();
        
        try {
            await gamesPlayCommand.execute(mockInteraction2);
            console.log('   ✅ Games play command executed successfully');
        } catch (error) {
            console.log('   ❌ Games play command failed:', error.message);
        }

        // Test 3: Test game session creation
        console.log('\n3. Testing game session creation...');
        try {
            const TetrisClass = gameRegistry.getGameClass('tetris');
            const tetrisGame = new TetrisClass();
            
            // Start the game
            const gameState = await tetrisGame.startGame('123456789', {
                mode: { singlePlayer: true }
            });
            
            console.log('   ✅ Game started successfully');
            console.log('   Game state keys:', Object.keys(gameState));
            
            // Create session
            await gameSessionManager.createSession(tetrisGame);
            console.log('   ✅ Session created successfully');
            
        } catch (error) {
            console.log('   ❌ Game session creation failed:', error.message);
        }

        // Test 4: Test database user creation
        console.log('\n4. Testing user creation...');
        try {
            await Database.createUser('123456789', 'TestUser');
            console.log('   ✅ User created successfully');
        } catch (error) {
            console.log('   ❌ User creation failed:', error.message);
        }

        console.log('\n🎉 Game command tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test if called directly
if (require.main === module) {
    testGameCommands().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testGameCommands };

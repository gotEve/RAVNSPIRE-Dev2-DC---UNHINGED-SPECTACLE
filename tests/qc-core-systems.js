// Quality Control Testing Framework for Ravnspire
// Tests existing systems before implementing new features

const gameRegistry = require('../games/GameRegistry');
const Database = require('../database/db');
const fs = require('fs');
const path = require('path');

class CoreSystemQC {
    constructor() {
        this.results = {
            games: { passed: 0, failed: 0, errors: [] },
            database: { passed: 0, failed: 0, errors: [] },
            commands: { passed: 0, failed: 0, errors: [] },
            security: { passed: 0, failed: 0, errors: [] },
            help: { passed: 0, failed: 0, errors: [] }
        };
    }

    async runAllTests() {
        console.log('🔍 Starting Quality Control Tests...\n');
        
        try {
            await this.testExistingGames();
            await this.testDatabaseConnections();
            await this.testExistingCommands();
            await this.testSecuritySystems();
            await this.testHelpSystem();
            
            this.printResults();
        } catch (error) {
            console.error('❌ QC Test Suite Failed:', error);
        }
    }

    async testExistingGames() {
        console.log('🎮 Testing Existing Games...');
        
        try {
            // Test GameRegistry loads games correctly
            const games = gameRegistry.getAllGames();
            if (games.length === 0) {
                this.addError('games', 'No games loaded by GameRegistry');
            } else {
                console.log(`✅ GameRegistry loaded ${games.length} games`);
                this.results.games.passed++;
            }

            // Test each game can be instantiated
            for (const game of games) {
                try {
                    const GameClass = gameRegistry.getGameClass(game.id);
                    if (!GameClass) {
                        this.addError('games', `Game class not found for ${game.id}`);
                        continue;
                    }

                    const gameInstance = new GameClass();
                    const metadata = gameInstance.getMetadata();
                    
                    if (!metadata || !metadata.id) {
                        this.addError('games', `Invalid metadata for ${game.id}`);
                    } else {
                        console.log(`✅ Game ${game.id} instantiated successfully`);
                        this.results.games.passed++;
                    }
                } catch (error) {
                    this.addError('games', `Failed to instantiate ${game.id}: ${error.message}`);
                }
            }

            // Test specific games mentioned in issues
            const tetrisGame = gameRegistry.getGame('tetris');
            const tictactoeGame = gameRegistry.getGame('tictactoe');
            
            if (!tetrisGame) {
                this.addError('games', 'Tetris game not found in registry');
            } else {
                console.log('✅ Tetris game found in registry');
                this.results.games.passed++;
            }

            if (!tictactoeGame) {
                this.addError('games', 'Tic Tac Toe game not found in registry');
            } else {
                console.log('✅ Tic Tac Toe game found in registry');
                this.results.games.passed++;
            }

        } catch (error) {
            this.addError('games', `Game testing failed: ${error.message}`);
        }
    }

    async testDatabaseConnections() {
        console.log('\n🗄️ Testing Database Connections...');
        
        try {
            // Test basic connection
            const testQuery = await Database.query('SELECT NOW() as current_time');
            if (testQuery.rows && testQuery.rows.length > 0) {
                console.log('✅ Database connection successful');
                this.results.database.passed++;
            } else {
                this.addError('database', 'Database query returned no results');
            }

            // Test JSONB support
            const jsonbTest = await Database.query(`
                SELECT '{"test": "value"}'::jsonb as test_json
            `);
            if (jsonbTest.rows && jsonbTest.rows[0].test_json) {
                console.log('✅ JSONB support confirmed');
                this.results.database.passed++;
            } else {
                this.addError('database', 'JSONB support not available');
            }

            // Test existing tables
            const tables = [
                'users', 'guilds', 'neighborhoods', 'game_sessions', 
                'achievements', 'user_achievements', 'lore_entries'
            ];

            for (const table of tables) {
                try {
                    const tableCheck = await Database.query(`
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = $1
                        ) as exists
                    `, [table]);
                    
                    if (tableCheck.rows[0].exists) {
                        console.log(`✅ Table ${table} exists`);
                        this.results.database.passed++;
                    } else {
                        this.addError('database', `Table ${table} does not exist`);
                    }
                } catch (error) {
                    this.addError('database', `Error checking table ${table}: ${error.message}`);
                }
            }

        } catch (error) {
            this.addError('database', `Database testing failed: ${error.message}`);
        }
    }

    async testExistingCommands() {
        console.log('\n⚡ Testing Existing Commands...');
        
        try {
            const commandsDir = path.join(__dirname, '../commands');
            const commandFiles = this.getCommandFiles(commandsDir);
            
            for (const file of commandFiles) {
                try {
                    const commandPath = path.join(commandsDir, file);
                    const command = require(commandPath);
                    
                    if (!command.data || !command.data.name) {
                        this.addError('commands', `Command ${file} missing data.name`);
                    } else {
                        console.log(`✅ Command ${command.data.name} loaded successfully`);
                        this.results.commands.passed++;
                    }
                } catch (error) {
                    this.addError('commands', `Failed to load command ${file}: ${error.message}`);
                }
            }

        } catch (error) {
            this.addError('commands', `Command testing failed: ${error.message}`);
        }
    }

    async testSecuritySystems() {
        console.log('\n🔒 Testing Security Systems...');
        
        try {
            // Test security utilities exist
            const securityFiles = [
                '../utils/security.js',
                '../utils/securityCore.js',
                '../utils/antiCheat.js',
                '../utils/antiAutomation.js'
            ];

            for (const file of securityFiles) {
                try {
                    const securityPath = path.join(__dirname, file);
                    if (fs.existsSync(securityPath)) {
                        const security = require(securityPath);
                        console.log(`✅ Security module ${file} exists`);
                        this.results.security.passed++;
                    } else {
                        this.addError('security', `Security module ${file} not found`);
                    }
                } catch (error) {
                    this.addError('security', `Error loading ${file}: ${error.message}`);
                }
            }

        } catch (error) {
            this.addError('security', `Security testing failed: ${error.message}`);
        }
    }

    async testHelpSystem() {
        console.log('\n❓ Testing Help System...');
        
        try {
            const helpCommand = require('../commands/help/index.js');
            
            if (!helpCommand.data || helpCommand.data.name !== 'help') {
                this.addError('help', 'Help command not found or incorrectly named');
            } else {
                console.log('✅ Help command found');
                this.results.help.passed++;
            }

            // Test help command has execute function
            if (typeof helpCommand.execute !== 'function') {
                this.addError('help', 'Help command missing execute function');
            } else {
                console.log('✅ Help command has execute function');
                this.results.help.passed++;
            }

        } catch (error) {
            this.addError('help', `Help system testing failed: ${error.message}`);
        }
    }

    getCommandFiles(dir, files = []) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.getCommandFiles(fullPath, files);
            } else if (item.endsWith('.js') && item !== 'index.js') {
                files.push(path.relative(path.join(__dirname, '../commands'), fullPath));
            }
        }
        
        return files;
    }

    addError(category, message) {
        this.results[category].failed++;
        this.results[category].errors.push(message);
        console.log(`❌ ${message}`);
    }

    printResults() {
        console.log('\n📊 QC Test Results Summary:');
        console.log('================================');
        
        for (const [category, result] of Object.entries(this.results)) {
            const total = result.passed + result.failed;
            const percentage = total > 0 ? Math.round((result.passed / total) * 100) : 0;
            
            console.log(`\n${category.toUpperCase()}:`);
            console.log(`  ✅ Passed: ${result.passed}`);
            console.log(`  ❌ Failed: ${result.failed}`);
            console.log(`  📈 Success Rate: ${percentage}%`);
            
            if (result.errors.length > 0) {
                console.log(`  🚨 Errors:`);
                result.errors.forEach(error => console.log(`    - ${error}`));
            }
        }

        const totalPassed = Object.values(this.results).reduce((sum, r) => sum + r.passed, 0);
        const totalFailed = Object.values(this.results).reduce((sum, r) => sum + r.failed, 0);
        const overallPercentage = totalPassed + totalFailed > 0 ? 
            Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0;

        console.log('\n🎯 OVERALL RESULTS:');
        console.log(`  ✅ Total Passed: ${totalPassed}`);
        console.log(`  ❌ Total Failed: ${totalFailed}`);
        console.log(`  📈 Overall Success Rate: ${overallPercentage}%`);

        if (overallPercentage >= 80) {
            console.log('\n🎉 QC Tests PASSED - Ready to proceed with implementation!');
        } else {
            console.log('\n⚠️ QC Tests FAILED - Fix issues before proceeding!');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const qc = new CoreSystemQC();
    qc.runAllTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('QC Test Suite Error:', error);
        process.exit(1);
    });
}

module.exports = CoreSystemQC;

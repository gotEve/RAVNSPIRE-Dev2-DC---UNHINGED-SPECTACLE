// Database setup script
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
    console.log('Setting up Ravnspire database...');
    
    // Create connection pool
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Executing database schema...');
        await pool.query(schema);
        console.log('✅ Database schema executed successfully');

        // Insert initial data
        await insertInitialData(pool);
        
        console.log('✅ Database setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

async function insertInitialData(pool) {
    console.log('Inserting initial data...');

    // Insert initial games
    const games = [
        {
            name: 'trivia',
            description: 'Test your knowledge with questions from various categories',
            category: 'knowledge',
            config: JSON.stringify({
                questionsPerGame: 10,
                categories: ['general', 'science', 'history', 'geography', 'entertainment', 'sports', 'technology', 'literature'],
                difficulty: ['easy', 'medium', 'hard']
            })
        },
        {
            name: 'tetris',
            description: 'Classic falling blocks puzzle game',
            category: 'puzzle',
            config: JSON.stringify({
                gridSize: { width: 10, height: 20 },
                pieces: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'],
                scoring: { lineClear: 100, levelUp: 1000 }
            })
        },
        {
            name: 'tictactoe',
            description: 'Classic 3x3 grid strategy game for two players',
            category: 'strategy',
            config: JSON.stringify({
                gridSize: 3,
                maxPlayers: 2,
                winConditions: ['row', 'column', 'diagonal']
            })
        }
    ];

    for (const game of games) {
        await pool.query(`
            INSERT INTO games (name, description, category, config) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT (name) DO NOTHING
        `, [game.name, game.description, game.category, game.config]);
    }

    // Insert initial achievements
    const achievements = [
        {
            name: 'first_steps',
            description: 'Complete your first game',
            category: 'global',
            type: 'global',
            rarity: 'common',
            requirements: JSON.stringify({ games_played: 1 }),
            rewards: JSON.stringify({ xp: 100, currency: 50, badge: 'newcomer' })
        },
        {
            name: 'trivia_master',
            description: 'Get a perfect score in trivia',
            category: 'game',
            type: 'game-specific',
            rarity: 'uncommon',
            requirements: JSON.stringify({ game: 'trivia', perfect_score: 1 }),
            rewards: JSON.stringify({ xp: 300, currency: 150, badge: 'trivia_master' })
        },
        {
            name: 'tetris_expert',
            description: 'Reach level 10 in Tetris',
            category: 'game',
            type: 'game-specific',
            rarity: 'rare',
            requirements: JSON.stringify({ game: 'tetris', level: 10 }),
            rewards: JSON.stringify({ xp: 500, currency: 250, title: 'Tetris Expert' })
        },
        {
            name: 'tictactoe_champion',
            description: 'Win 10 games of Tic Tac Toe',
            category: 'game',
            type: 'game-specific',
            rarity: 'uncommon',
            requirements: JSON.stringify({ game: 'tictactoe', wins: 10 }),
            rewards: JSON.stringify({ xp: 400, currency: 200, badge: 'champion' })
        }
    ];

    for (const achievement of achievements) {
        await pool.query(`
            INSERT INTO achievements (name, description, category, type, rarity, requirements, rewards) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            ON CONFLICT (name) DO NOTHING
        `, [achievement.name, achievement.description, achievement.category, achievement.type, 
           achievement.rarity, achievement.requirements, achievement.rewards]);
    }

    // Insert sample lore entries
    const loreEntries = [
        {
            title: 'The Founding of Ravnspire',
            content: 'In the ancient times, when the world was young and magic flowed freely through the land, the great city of Ravnspire was founded by the legendary mage-king Aldric the Wise. Built upon a nexus of magical energy, the city became a beacon of knowledge and power.',
            category: 'events',
            tags: JSON.stringify(['founding', 'history', 'aldric', 'magic']),
            hidden: false
        },
        {
            title: 'The Crystal Gardens',
            content: 'Located in the heart of Ravnspire, the Crystal Gardens are a magnificent display of magical flora that grows only in the presence of pure magical energy. The gardens are tended by the Gardeners of Light, an ancient order dedicated to preserving the natural magic of the world.',
            category: 'locations',
            tags: JSON.stringify(['garden', 'crystal', 'magic', 'nature']),
            hidden: false
        },
        {
            title: 'The Shadow War',
            content: 'A secret conflict that raged in the shadows of Ravnspire for over a century. The details of this war are known only to a select few, and the truth behind it remains one of the greatest mysteries of the realm.',
            category: 'events',
            tags: JSON.stringify(['war', 'secret', 'mystery', 'shadow']),
            hidden: true
        }
    ];

    for (const lore of loreEntries) {
        await pool.query(`
            INSERT INTO lore_entries (title, content, category, tags, hidden) 
            VALUES ($1, $2, $3, $4, $5) 
            ON CONFLICT DO NOTHING
        `, [lore.title, lore.content, lore.category, lore.tags, lore.hidden]);
    }

    console.log('✅ Initial data inserted successfully');
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };

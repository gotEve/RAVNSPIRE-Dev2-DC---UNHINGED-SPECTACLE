const Database = require('./db');

async function fixUserAchievementsConstraint() {
    console.log('🔧 Fixing user_achievements table constraint...\n');

    try {
        // First, let's see what data we have
        const existingData = await Database.query('SELECT * FROM user_achievements LIMIT 5');
        console.log('Existing data sample:', existingData.rows);

        // Drop the existing table and recreate it with the correct constraint
        console.log('Dropping and recreating user_achievements table...');
        
        // Create a backup of existing data
        const allData = await Database.query('SELECT * FROM user_achievements');
        console.log(`Backing up ${allData.rows.length} existing records...`);

        // Drop the table
        await Database.query('DROP TABLE user_achievements');
        console.log('✅ Dropped old user_achievements table');

        // Recreate the table with the correct schema
        await Database.query(`
            CREATE TABLE user_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id INTEGER REFERENCES users(discord_id),
                achievement_id INTEGER REFERENCES achievements(id),
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                progress JSONB DEFAULT "{}",
                UNIQUE(discord_id, achievement_id)
            )
        `);
        console.log('✅ Created new user_achievements table with correct constraint');

        // Restore data if any existed (though we expect none in this test environment)
        if (allData.rows.length > 0) {
            console.log('Restoring existing data...');
            for (const row of allData.rows) {
                // Try to find the achievement_id for the achievement_name
                const achievement = await Database.query(
                    'SELECT id FROM achievements WHERE name = ?',
                    [row.achievement_name]
                );
                
                if (achievement.rows.length > 0) {
                    await Database.query(`
                        INSERT INTO user_achievements (discord_id, achievement_id, unlocked_at, progress)
                        VALUES (?, ?, ?, ?)
                    `, [
                        row.discord_id,
                        achievement.rows[0].id,
                        row.unlocked_at,
                        row.progress || '{}'
                    ]);
                } else {
                    console.log(`⚠️  Could not find achievement: ${row.achievement_name}`);
                }
            }
            console.log('✅ Restored existing data');
        }

        console.log('\n🎉 user_achievements table constraint fixed successfully!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
        throw error;
    }
}

// If run directly, execute the fix
if (require.main === module) {
    fixUserAchievementsConstraint().catch(console.error);
}

module.exports = { fixUserAchievementsConstraint };

const Database = require('./db');

async function runAchievementMigration() {
    console.log('🎯 Running Achievement System Migration for SQLite...\n');

    try {
        // Check if hidden column exists in achievements table
        const achievementsColumns = await Database.query('PRAGMA table_info(achievements)');
        const hasHiddenColumn = achievementsColumns.rows.some(col => col.name === 'hidden');
        
        if (!hasHiddenColumn) {
            console.log('Adding hidden column to achievements table...');
            try {
                await Database.query('ALTER TABLE achievements ADD COLUMN hidden BOOLEAN DEFAULT FALSE');
                console.log('✅ Added hidden column to achievements table');
            } catch (error) {
                if (error.message.includes('duplicate column name')) {
                    console.log('✅ hidden column already exists in achievements table');
                } else {
                    throw error;
                }
            }
        } else {
            console.log('✅ hidden column already exists in achievements table');
        }

        // Check if achievement_id column exists in user_achievements table
        const userAchievementsColumns = await Database.query('PRAGMA table_info(user_achievements)');
        const hasAchievementIdColumn = userAchievementsColumns.rows.some(col => col.name === 'achievement_id');
        const hasProgressColumn = userAchievementsColumns.rows.some(col => col.name === 'progress');
        
        if (!hasAchievementIdColumn) {
            console.log('Adding achievement_id column to user_achievements table...');
            try {
                await Database.query('ALTER TABLE user_achievements ADD COLUMN achievement_id INTEGER REFERENCES achievements(id)');
                console.log('✅ Added achievement_id column to user_achievements table');
            } catch (error) {
                if (error.message.includes('duplicate column name')) {
                    console.log('✅ achievement_id column already exists in user_achievements table');
                } else {
                    throw error;
                }
            }
        } else {
            console.log('✅ achievement_id column already exists in user_achievements table');
        }

        if (!hasProgressColumn) {
            console.log('Adding progress column to user_achievements table...');
            try {
                await Database.query('ALTER TABLE user_achievements ADD COLUMN progress JSONB DEFAULT "{}"');
                console.log('✅ Added progress column to user_achievements table');
            } catch (error) {
                if (error.message.includes('duplicate column name')) {
                    console.log('✅ progress column already exists in user_achievements table');
                } else {
                    throw error;
                }
            }
        } else {
            console.log('✅ progress column already exists in user_achievements table');
        }

        // Update existing user_achievements records to use achievement_id instead of achievement_name
        console.log('Updating existing user_achievements records...');
        const existingRecords = await Database.query('SELECT * FROM user_achievements WHERE achievement_id IS NULL');
        
        for (const record of existingRecords.rows) {
            // Try to find the achievement by name
            const achievement = await Database.query(
                'SELECT id FROM achievements WHERE name = $1',
                [record.achievement_name]
            );
            
            if (achievement.rows.length > 0) {
                await Database.query(
                    'UPDATE user_achievements SET achievement_id = $1 WHERE id = $2',
                    [achievement.rows[0].id, record.id]
                );
                console.log(`  ✅ Updated record for achievement: ${record.achievement_name}`);
            } else {
                console.log(`  ⚠️  Could not find achievement: ${record.achievement_name}`);
            }
        }

        console.log('\n🎉 Achievement system migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// If run directly, execute the migration
if (require.main === module) {
    runAchievementMigration().catch(console.error);
}

module.exports = { runAchievementMigration };

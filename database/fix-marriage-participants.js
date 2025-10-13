const Database = require('./db');

async function fixMarriageParticipants() {
    console.log('🔧 Fixing marriage_participants table...\n');

    try {
        // Drop and recreate the table
        await Database.query('DROP TABLE IF EXISTS marriage_participants');
        console.log('✅ Dropped existing marriage_participants table');

        await Database.query(`
            CREATE TABLE marriage_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marriage_id INTEGER REFERENCES marriages(id),
                character_id BIGINT REFERENCES player_characters(id),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                left_at TIMESTAMP,
                role VARCHAR(20) DEFAULT 'spouse',
                UNIQUE(marriage_id, character_id)
            )
        `);
        console.log('✅ Created marriage_participants table with correct structure');

        // Verify the table structure
        const result = await Database.query('PRAGMA table_info(marriage_participants)');
        console.log('\n📋 Table structure:');
        result.rows.forEach(row => {
            console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
        });

        console.log('\n🎉 marriage_participants table fixed successfully!\n');

    } catch (error) {
        console.error('❌ Error fixing marriage_participants table:', error);
        process.exit(1);
    }
}

// If run directly, execute the fix
if (require.main === module) {
    fixMarriageParticipants().catch(console.error);
}

module.exports = { fixMarriageParticipants };

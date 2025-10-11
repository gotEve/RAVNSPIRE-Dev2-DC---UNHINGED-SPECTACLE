const Database = require('./db');

async function clearLore() {
    console.log('Clearing all lore entries from database...');
    
    try {
        // Clear all lore entries and discoveries
        await Database.query('DELETE FROM lore_discoveries');
        await Database.query('DELETE FROM lore_entries');
        
        console.log('✅ All lore entries cleared successfully');
        
        // Verify the entries are cleared
        const result = await Database.query('SELECT COUNT(*) FROM lore_entries');
        console.log(`📊 Lore entries remaining: ${result.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error clearing lore:', error);
        throw error;
    }
}

if (require.main === module) {
    clearLore().catch(error => {
        console.error('Clear failed:', error);
        process.exit(1);
    });
}

module.exports = { clearLore };

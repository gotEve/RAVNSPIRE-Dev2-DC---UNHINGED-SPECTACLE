const Database = require('./db');

async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    try {
        // Clean up test characters and related data
        const testUserIds = ['111111111111', '222222222222'];
        
        for (const userId of testUserIds) {
            console.log(`Cleaning up data for user ${userId}...`);
            
            // Delete family achievements
            await Database.query('DELETE FROM user_family_achievements WHERE discord_id = ?', [userId]);
            
            // Delete family statistics
            await Database.query('DELETE FROM family_statistics WHERE discord_id = ?', [userId]);
            
            // Delete child care activities
            await Database.query('DELETE FROM child_care_activities WHERE caregiver_character_id IN (SELECT id FROM player_characters WHERE discord_id = ?)', [userId]);
            
            // Delete family interactions
            await Database.query('DELETE FROM family_interactions WHERE marriage_id IN (SELECT m.id FROM marriages m JOIN marriage_participants mp ON m.id = mp.marriage_id JOIN player_characters pc ON mp.character_id = pc.id WHERE pc.discord_id = ?)', [userId]);
            
            // Delete relationship affection
            await Database.query('DELETE FROM relationship_affection WHERE character_1 IN (SELECT id FROM player_characters WHERE discord_id = ?) OR character_2 IN (SELECT id FROM player_characters WHERE discord_id = ?)', [userId, userId]);
            
            // Delete marriage participants
            await Database.query('DELETE FROM marriage_participants WHERE character_id IN (SELECT id FROM player_characters WHERE discord_id = ?)', [userId]);
            
            // Delete marriages
            await Database.query('DELETE FROM marriages WHERE id IN (SELECT m.id FROM marriages m JOIN marriage_participants mp ON m.id = mp.marriage_id JOIN player_characters pc ON mp.character_id = pc.id WHERE pc.discord_id = ?)', [userId]);
            
            // Delete marriage proposals
            await Database.query('DELETE FROM marriage_proposals WHERE proposer_character_id IN (SELECT id FROM player_characters WHERE discord_id = ?) OR target_character_id IN (SELECT id FROM player_characters WHERE discord_id = ?)', [userId, userId]);
            
            // Delete children
            await Database.query('DELETE FROM children WHERE character_id IN (SELECT id FROM player_characters WHERE discord_id = ?)', [userId]);
            
            // Delete player characters
            await Database.query('DELETE FROM player_characters WHERE discord_id = ?', [userId]);
            
            // Delete faction data
            await Database.query('DELETE FROM player_factions WHERE discord_id = ?', [userId]);
            await Database.query('DELETE FROM faction_resources WHERE discord_id = ?', [userId]);
            
            // Delete user data
            await Database.query('DELETE FROM users WHERE discord_id = ?', [userId]);
        }
        
        console.log('✅ Test data cleanup completed');
        
    } catch (error) {
        console.error('❌ Error cleaning up test data:', error);
    }
}

if (require.main === module) {
    cleanupTestData();
}

module.exports = { cleanupTestData };

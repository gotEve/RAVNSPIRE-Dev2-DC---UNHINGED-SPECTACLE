const Database = require('../database/db');
const FactionManager = require('../utils/factionManager');

async function testFactionSystem() {
    console.log('⚔️ Testing Faction System...\n');

    try {
        // Test 1: Create a character
        console.log('1. Testing character creation...');
        const testUserId = '111222333';
        const characterName = 'Test Hero';
        const faction = 'Human';

        const characterResult = await FactionManager.createCharacter(testUserId, characterName, faction);
        console.log(`✅ Character created:`);
        console.log(`   ID: ${characterResult.characterId}`);
        console.log(`   Name: ${characterResult.characterName}`);
        console.log(`   Faction: ${characterResult.faction}`);
        console.log(`   Purity: ${characterResult.purity}`);

        // Test 2: Get faction information
        console.log('\n2. Testing faction information retrieval...');
        const factionInfo = await FactionManager.getFactionInfo(testUserId);
        console.log(`✅ Faction info retrieved:`);
        console.log(`   Current Faction: ${factionInfo.current_faction}`);
        console.log(`   Faction Purity: ${factionInfo.faction_purity}`);
        console.log(`   History entries: ${factionInfo.faction_history.length}`);

        // Test 3: Get current character
        console.log('\n3. Testing current character retrieval...');
        const currentCharacter = await FactionManager.getCurrentCharacter(testUserId);
        console.log(`✅ Current character retrieved:`);
        console.log(`   Name: ${currentCharacter.character_name}`);
        console.log(`   Age: ${currentCharacter.age_years} years`);
        console.log(`   Life Stage: ${currentCharacter.life_stage}`);
        console.log(`   Birth Faction: ${currentCharacter.birth_faction}`);

        // Test 4: Get faction resources
        console.log('\n4. Testing faction resources...');
        const resources = await FactionManager.getFactionResources(testUserId);
        console.log(`✅ Faction resources retrieved:`);
        console.log(`   Food: ${resources.food}`);
        console.log(`   Water: ${resources.water}`);
        console.log(`   Currency: ${resources.currency}`);

        // Test 5: Add resources
        console.log('\n5. Testing resource addition...');
        await FactionManager.addFactionResources(testUserId, {
            food: 50,
            water: 25,
            currency: 100
        });
        
        const updatedResources = await FactionManager.getFactionResources(testUserId);
        console.log(`✅ Resources added:`);
        console.log(`   Food: ${updatedResources.food}`);
        console.log(`   Water: ${updatedResources.water}`);
        console.log(`   Currency: ${updatedResources.currency}`);

        // Test 6: Create a second character (child)
        console.log('\n6. Testing child character creation...');
        const childResult = await Database.query(`
            INSERT INTO player_characters (
                discord_id, original_creator, character_name, birth_faction,
                current_faction, parent_1, is_active, is_alive
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [testUserId, testUserId, 'Test Child', 'AI', 'AI', currentCharacter.id, false, true]);
        
        const childId = childResult.rows[0].id;
        console.log(`✅ Child character created with ID: ${childId}`);

        // Test 7: Character switching
        console.log('\n7. Testing character switching...');
        const switchResult = await FactionManager.switchToCharacter(testUserId, childId);
        console.log(`✅ Character switch successful:`);
        console.log(`   New Character: ${switchResult.characterName}`);
        console.log(`   New Faction: ${switchResult.newFaction}`);
        console.log(`   Character Age: ${switchResult.characterAge} years`);

        // Test 8: Get faction history
        console.log('\n8. Testing faction history...');
        const history = await FactionManager.getFactionHistory(testUserId);
        console.log(`✅ Faction history retrieved:`);
        console.log(`   Total switches: ${history.length}`);
        history.forEach((switchEvent, index) => {
            console.log(`   ${index + 1}. ${switchEvent.from_faction} → ${switchEvent.to_faction} (${switchEvent.switch_reason})`);
        });

        // Test 9: Get character lineage
        console.log('\n9. Testing character lineage...');
        const lineage = await FactionManager.getCharacterLineage(testUserId);
        console.log(`✅ Character lineage retrieved:`);
        console.log(`   Total characters: ${lineage.length}`);
        lineage.forEach((character, index) => {
            const status = character.is_active ? 'Active' : 'Inactive';
            console.log(`   ${index + 1}. ${character.character_name} (${character.current_faction}) - ${status}`);
        });

        // Test 10: Get faction achievements
        console.log('\n10. Testing faction achievements...');
        const achievements = await FactionManager.getFactionAchievements(testUserId);
        console.log(`✅ Faction achievements retrieved:`);
        console.log(`   Total achievements: ${achievements.length}`);

        // Test 11: Check for new achievements
        console.log('\n11. Testing achievement checking...');
        const newAchievements = await FactionManager.checkFactionAchievements(testUserId);
        console.log(`✅ Achievement check completed:`);
        console.log(`   New achievements found: ${newAchievements.length}`);

        // Test 12: Daily resource consumption
        console.log('\n12. Testing daily resource consumption...');
        await FactionManager.deductDailyCosts(testUserId);
        
        const resourcesAfterConsumption = await FactionManager.getFactionResources(testUserId);
        console.log(`✅ Daily costs deducted:`);
        console.log(`   Food after consumption: ${resourcesAfterConsumption.food}`);
        console.log(`   Water after consumption: ${resourcesAfterConsumption.water}`);

        // Test 13: Database queries for verification
        console.log('\n13. Testing database queries...');
        
        // Check player_factions table
        const factionCheck = await Database.query('SELECT * FROM player_factions WHERE discord_id = $1', [testUserId]);
        console.log(`✅ Player factions: ${factionCheck.rows.length} entries`);

        // Check player_characters table
        const characterCheck = await Database.query('SELECT * FROM player_characters WHERE discord_id = $1', [testUserId]);
        console.log(`✅ Player characters: ${characterCheck.rows.length} entries`);

        // Check faction_resources table
        const resourceCheck = await Database.query('SELECT * FROM faction_resources WHERE discord_id = $1', [testUserId]);
        console.log(`✅ Faction resources: ${resourceCheck.rows.length} entries`);

        // Check faction_switches table
        const switchCheck = await Database.query('SELECT * FROM faction_switches WHERE discord_id = $1', [testUserId]);
        console.log(`✅ Faction switches: ${switchCheck.rows.length} entries`);

        // Check faction_achievements table
        const achievementCheck = await Database.query('SELECT COUNT(*) as count FROM faction_achievements');
        console.log(`✅ Faction achievements: ${achievementCheck.rows[0].count} total achievements`);

        console.log('\n🎉 Faction System test completed successfully!\n');

    } catch (error) {
        console.error('❌ Faction System test failed:', error);
        process.exit(1);
    }
}

// If run directly, execute the test
if (require.main === module) {
    testFactionSystem().catch(console.error);
}

module.exports = { testFactionSystem };

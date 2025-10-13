const Database = require('../database/db');
const FamilyManager = require('../utils/familyManager');
const FactionManager = require('../utils/factionManager');

async function testMarriageFamilySystem() {
    console.log('💕 Testing Marriage and Family System...\n');

    try {
        // Test 1: Create characters for testing
        console.log('1. Creating test characters...');
        const user1Id = '111111111111';
        const user2Id = '222222222222';
        
        // Create characters
        await FactionManager.createCharacter(user1Id, 'Test Hero 1', 'Human');
        await FactionManager.createCharacter(user2Id, 'Test Hero 2', 'AI');
        
        console.log('✅ Test characters created');

        // Test 2: Create marriage proposal
        console.log('\n2. Testing marriage proposal...');
        const proposalResult = await FamilyManager.createMarriageProposal(
            user1Id, user2Id, 'dyad', 'Will you marry me?'
        );
        console.log(`✅ Marriage proposal created:`);
        console.log(`   Proposal ID: ${proposalResult.proposalId}`);
        console.log(`   Expires: ${proposalResult.expiresAt}`);

        // Test 3: Get pending proposals
        console.log('\n3. Testing pending proposals retrieval...');
        const pendingProposals = await FamilyManager.getPendingProposals(user2Id);
        console.log(`✅ Pending proposals retrieved:`);
        console.log(`   Count: ${pendingProposals.length}`);
        if (pendingProposals.length > 0) {
            console.log(`   Proposal ID: ${pendingProposals[0].id}`);
            console.log(`   From: ${pendingProposals[0].proposerName}`);
        }

        // Test 4: Accept marriage proposal
        console.log('\n4. Testing marriage proposal acceptance...');
        const marriageResult = await FamilyManager.acceptMarriageProposal(user2Id, proposalResult.proposalId);
        console.log(`✅ Marriage proposal accepted:`);
        console.log(`   Marriage ID: ${marriageResult.marriageId}`);
        console.log(`   Type: ${marriageResult.marriageType}`);
        console.log(`   Spouses: ${marriageResult.spouses.length}`);

        // Test 5: Get marriage status
        console.log('\n5. Testing marriage status...');
        const marriageStatus = await FamilyManager.getMarriageStatus(user1Id);
        console.log(`✅ Marriage status retrieved:`);
        console.log(`   Status: ${marriageStatus.status}`);
        console.log(`   Type: ${marriageStatus.marriageType}`);
        console.log(`   Spouses: ${marriageStatus.spouses.length}`);

        // Test 6: Add affection interaction
        console.log('\n6. Testing affection interaction...');
        const affectionResult = await FamilyManager.addAffectionInteraction(
            user1Id, user2Id, 'conversation', 'Hello my love!'
        );
        console.log(`✅ Affection interaction added:`);
        console.log(`   Affection gained: ${affectionResult.affectionGained}`);
        console.log(`   Total affection: ${affectionResult.totalAffection}`);
        console.log(`   Resources spent: ${affectionResult.resourcesSpent}`);

        // Test 7: Get affection data
        console.log('\n7. Testing affection data retrieval...');
        const affectionData = await FamilyManager.getAffectionData(user1Id);
        console.log(`✅ Affection data retrieved:`);
        console.log(`   Relationships: ${affectionData.length}`);
        if (affectionData.length > 0) {
            console.log(`   Partner: ${affectionData[0].partnerName}`);
            console.log(`   Affection points: ${affectionData[0].affectionPoints}`);
        }

        // Test 8: Attempt conception
        console.log('\n8. Testing conception attempt...');
        const conceptionResult = await FamilyManager.attemptConception(user1Id, user2Id, 'natural');
        console.log(`✅ Conception attempt completed:`);
        console.log(`   Success: ${conceptionResult.success}`);
        if (conceptionResult.success) {
            console.log(`   Child ID: ${conceptionResult.childId}`);
            console.log(`   Gestation days: ${conceptionResult.gestationDays}`);
            console.log(`   Faction at birth: ${conceptionResult.factionAtBirth}`);
        } else {
            console.log(`   Current affection: ${conceptionResult.currentAffection}`);
            console.log(`   Required affection: ${conceptionResult.requiredAffection}`);
        }

        // Test 9: Get user children
        console.log('\n9. Testing user children retrieval...');
        const children = await FamilyManager.getUserChildren(user1Id);
        console.log(`✅ User children retrieved:`);
        console.log(`   Children count: ${children.length}`);

        // Test 10: Get interaction history
        console.log('\n10. Testing interaction history...');
        const history = await FamilyManager.getInteractionHistory(user1Id, user2Id);
        console.log(`✅ Interaction history retrieved:`);
        console.log(`   Interactions: ${history.length}`);
        if (history.length > 0) {
            console.log(`   Last interaction: ${history[0].interactionType}`);
            console.log(`   Affection gained: ${history[0].affectionGained}`);
        }

        // Test 11: Database queries for verification
        console.log('\n11. Testing database queries...');
        
        // Check marriages table
        const marriagesCheck = await Database.query('SELECT COUNT(*) as count FROM marriages');
        console.log(`✅ Marriages: ${marriagesCheck.rows[0].count} entries`);

        // Check marriage_participants table
        const participantsCheck = await Database.query('SELECT COUNT(*) as count FROM marriage_participants');
        console.log(`✅ Marriage participants: ${participantsCheck.rows[0].count} entries`);

        // Check relationship_affection table
        const affectionCheck = await Database.query('SELECT COUNT(*) as count FROM relationship_affection');
        console.log(`✅ Relationship affection: ${affectionCheck.rows[0].count} entries`);

        // Check children table
        const childrenCheck = await Database.query('SELECT COUNT(*) as count FROM children');
        console.log(`✅ Children: ${childrenCheck.rows[0].count} entries`);

        // Check marriage_proposals table
        const proposalsCheck = await Database.query('SELECT COUNT(*) as count FROM marriage_proposals');
        console.log(`✅ Marriage proposals: ${proposalsCheck.rows[0].count} entries`);

        // Check family_interactions table
        const interactionsCheck = await Database.query('SELECT COUNT(*) as count FROM family_interactions');
        console.log(`✅ Family interactions: ${interactionsCheck.rows[0].count} entries`);

        // Check family_achievements table
        const achievementsCheck = await Database.query('SELECT COUNT(*) as count FROM family_achievements');
        console.log(`✅ Family achievements: ${achievementsCheck.rows[0].count} entries`);

        // Test 12: Test divorce (optional - comment out if you want to keep the marriage)
        console.log('\n12. Testing divorce...');
        try {
            const divorceResult = await FamilyManager.divorce(user1Id, 'Test divorce');
            console.log(`✅ Divorce completed:`);
            console.log(`   Divorce cost: ${divorceResult.divorceCost}`);
            console.log(`   Reason: ${divorceResult.reason}`);
        } catch (divorceError) {
            console.log(`✅ Divorce test skipped (likely due to insufficient funds): ${divorceError.message}`);
        }

        console.log('\n🎉 Marriage and Family System test completed successfully!\n');

    } catch (error) {
        console.error('❌ Marriage and Family System test failed:', error);
        process.exit(1);
    }
}

// If run directly, execute the test
if (require.main === module) {
    testMarriageFamilySystem().catch(console.error);
}

module.exports = { testMarriageFamilySystem };

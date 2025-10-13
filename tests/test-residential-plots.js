const Database = require('../database/db');
const residentialManager = require('../utils/residentialManager');
const factionManager = require('../utils/factionManager');

async function testResidentialPlots() {
    try {
        console.log('🧪 Testing Residential Plot System...\n');

        // Test 1: Get neighborhoods with plots
        console.log('1. Testing getNeighborhoodsWithPlots...');
        const neighborhoods = await residentialManager.getNeighborhoodsWithPlots();
        console.log(`✅ Found ${neighborhoods.length} neighborhoods with plots`);
        neighborhoods.forEach(n => {
            console.log(`   - ${n.name}: ${n.available_plots}/${n.total_plots} plots available`);
        });

        // Test 2: Get available plots in a neighborhood
        console.log('\n2. Testing getAvailablePlots...');
        const firstNeighborhood = neighborhoods[0];
        const availablePlots = await residentialManager.getAvailablePlots(firstNeighborhood.id);
        console.log(`✅ Found ${availablePlots.length} available plots in ${firstNeighborhood.name}`);
        if (availablePlots.length > 0) {
            console.log(`   - First plot: #${availablePlots[0].plot_number} (${availablePlots[0].plot_size || 'Not set'})`);
        }

        // Test 3: Create test characters
        console.log('\n3. Creating test characters...');
        const testUser1 = '111111111111';
        const testUser2 = '222222222222';

        // Create test users
        await Database.query(`
            INSERT OR IGNORE INTO users (discord_id, username, currency)
            VALUES (?, 'TestUser1', 50000), (?, 'TestUser2', 50000)
        `, [testUser1, testUser2]);

        // Create test characters
        await Database.query(`
            INSERT OR IGNORE INTO player_characters (discord_id, character_name, birth_faction, current_faction, is_active)
            VALUES (?, 'TestCharacter1', 'Human', 'Human', 1), (?, 'TestCharacter2', 'AI', 'AI', 1)
        `, [testUser1, testUser2]);

        const character1 = await Database.query('SELECT * FROM player_characters WHERE discord_id = ?', [testUser1]);
        const character2 = await Database.query('SELECT * FROM player_characters WHERE discord_id = ?', [testUser2]);

        console.log(`✅ Created test characters: ${character1.rows[0].character_name} and ${character2.rows[0].character_name}`);

        // Test 4: Purchase a plot
        console.log('\n4. Testing plot purchase...');
        if (availablePlots.length > 0) {
            const plotToBuy = availablePlots[0];
            const purchaseResult = await residentialManager.purchasePlot(
                character1.rows[0].id,
                firstNeighborhood.id,
                plotToBuy.plot_number,
                'small'
            );
            console.log(`✅ Successfully purchased plot #${purchaseResult.plotNumber} for ${purchaseResult.price} currency`);
        }

        // Test 5: Get character plots
        console.log('\n5. Testing getCharacterPlots...');
        const characterPlots = await residentialManager.getCharacterPlots(character1.rows[0].id);
        console.log(`✅ Character owns ${characterPlots.length} plot(s)`);
        if (characterPlots.length > 0) {
            const plot = characterPlots[0];
            console.log(`   - Plot #${plot.plot_number} in ${plot.neighborhood_name} (${plot.plot_size})`);
        }

        // Test 6: List plot for sale
        console.log('\n6. Testing listPlotForSale...');
        if (characterPlots.length > 0) {
            const plotId = characterPlots[0].id;
            const saleResult = await residentialManager.listPlotForSale(character1.rows[0].id, plotId, 1500);
            console.log(`✅ Listed plot for sale at ${saleResult.salePrice} currency`);
        }

        // Test 7: Get plot details
        console.log('\n7. Testing getPlotDetails...');
        if (characterPlots.length > 0) {
            const plotId = characterPlots[0].id;
            const plotDetails = await residentialManager.getPlotDetails(plotId);
            console.log(`✅ Retrieved plot details for plot #${plotDetails.plot_number}`);
            console.log(`   - Owner: ${plotDetails.owner_name} (${plotDetails.owner_faction})`);
            console.log(`   - For Sale: ${plotDetails.is_for_sale ? 'Yes' : 'No'}`);
            console.log(`   - Occupants: ${plotDetails.occupants.length}`);
        }

        // Test 8: Invite occupant
        console.log('\n8. Testing inviteOccupant...');
        if (characterPlots.length > 0) {
            const plotId = characterPlots[0].id;
            const inviteResult = await residentialManager.inviteOccupant(
                character1.rows[0].id,
                plotId,
                character2.rows[0].id,
                100
            );
            console.log(`✅ Invited ${character2.rows[0].character_name} to live in plot with ${inviteResult.rentAmount} currency rent`);
        }

        // Test 9: Get plot occupants
        console.log('\n9. Testing getPlotOccupants...');
        if (characterPlots.length > 0) {
            const plotId = characterPlots[0].id;
            const occupants = await residentialManager.getPlotOccupants(plotId);
            console.log(`✅ Plot has ${occupants.length} occupant(s)`);
            occupants.forEach(occ => {
                console.log(`   - ${occ.character_name} (${occ.current_faction}) - ${occ.occupancy_type}`);
            });
        }

        // Test 10: Upgrade plot
        console.log('\n10. Testing upgradePlot...');
        if (characterPlots.length > 0) {
            const plotId = characterPlots[0].id;
            const upgradeResult = await residentialManager.upgradePlot(character1.rows[0].id, plotId);
            console.log(`✅ Upgraded plot to tier ${upgradeResult.newTier} for ${upgradeResult.upgradeCost} currency`);
            console.log(`   - New max occupants: ${upgradeResult.newMaxOccupants}`);
            console.log(`   - New maintenance cost: ${upgradeResult.newMaintenanceCost} currency`);
        }

        console.log('\n✅ All residential plot tests passed!');
        console.log('\n📊 Test Summary:');
        console.log(`- Neighborhoods: ${neighborhoods.length}`);
        console.log(`- Available plots: ${availablePlots.length}`);
        console.log(`- Character plots: ${characterPlots.length}`);
        console.log(`- Plot upgrades: 1`);
        console.log(`- Occupant invitations: 1`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testResidentialPlots();

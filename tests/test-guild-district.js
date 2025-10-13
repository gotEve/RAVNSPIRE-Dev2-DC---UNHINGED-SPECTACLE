const Database = require('../database/db');
const GuildDistrictManager = require('../utils/guildDistrictManager');

async function testGuildDistrict() {
    console.log('🏢 Testing Guild District System...\n');

    try {
        // Test 1: Get available plots
        console.log('1. Testing available plots...');
        const availablePlots = await GuildDistrictManager.getAvailablePlots();
        console.log(`✅ Found ${availablePlots.length} available plots`);

        // Test 2: Get building types
        console.log('\n2. Testing building types...');
        const buildingTypes = await GuildDistrictManager.getBuildingTypes();
        console.log(`✅ Found ${buildingTypes.length} building types:`);
        buildingTypes.forEach(building => {
            console.log(`   • ${building.building_name} (${building.building_type}) - ${building.base_cost} currency`);
        });

        // Test 3: Create a test guild (if not exists)
        console.log('\n3. Testing guild creation...');
        let testGuildId;
        const existingGuild = await Database.query('SELECT id FROM guilds WHERE name = $1', ['Test Guild']);
        
        if (existingGuild.rows.length === 0) {
            const guildResult = await Database.query(
                'INSERT INTO guilds (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id',
                ['Test Guild', 'Test guild for Guild District testing', '123456789']
            );
            testGuildId = guildResult.rows[0].id;
            console.log(`✅ Created test guild with ID: ${testGuildId}`);
        } else {
            testGuildId = existingGuild.rows[0].id;
            console.log(`✅ Using existing test guild with ID: ${testGuildId}`);
        }

        // Test 4: Purchase a plot
        console.log('\n4. Testing plot purchase...');
        if (availablePlots.length > 0) {
            const plotToPurchase = availablePlots[0];
            try {
                const purchaseResult = await GuildDistrictManager.purchasePlot(testGuildId, plotToPurchase.plot_number, '123456789');
                console.log(`✅ Purchased plot #${plotToPurchase.plot_number} for ${purchaseResult.cost} currency`);
            } catch (error) {
                console.log(`⚠️  Plot purchase failed: ${error.message}`);
            }
        } else {
            console.log('⚠️  No available plots to purchase');
        }

        // Test 5: Get guild plots
        console.log('\n5. Testing guild plots retrieval...');
        const guildPlots = await GuildDistrictManager.getGuildPlots(testGuildId);
        console.log(`✅ Guild owns ${guildPlots.length} plots`);

        if (guildPlots.length > 0) {
            const plot = guildPlots[0];
            console.log(`   • Plot #${plot.plot_number} (${plot.plot_size}) - Tier ${plot.plot_tier}, Value: ${plot.current_value}`);

            // Test 6: Build a structure
            console.log('\n6. Testing building construction...');
            try {
                const buildingResult = await GuildDistrictManager.buildStructure(plot.id, 'resource_mine', testGuildId, '123456789');
                console.log(`✅ Built ${buildingResult.building_name} on plot #${plot.plot_number}`);
            } catch (error) {
                console.log(`⚠️  Building construction failed: ${error.message}`);
            }

            // Test 7: Collect resources
            console.log('\n7. Testing resource collection...');
            try {
                const collectResult = await GuildDistrictManager.collectResources(testGuildId, '123456789');
                console.log(`✅ Collected resources from ${collectResult.collectedCount} buildings:`);
                for (const [resource, amount] of Object.entries(collectResult.totalResources)) {
                    console.log(`   • ${resource}: ${amount}`);
                }
            } catch (error) {
                console.log(`⚠️  Resource collection failed: ${error.message}`);
            }

            // Test 8: Upgrade plot
            console.log('\n8. Testing plot upgrade...');
            try {
                const upgradeResult = await GuildDistrictManager.upgradePlot(plot.id, testGuildId, '123456789');
                console.log(`✅ Upgraded plot to tier ${upgradeResult.newTier}, new value: ${upgradeResult.newValue}`);
            } catch (error) {
                console.log(`⚠️  Plot upgrade failed: ${error.message}`);
            }
        }

        // Test 9: Get plot statistics
        console.log('\n9. Testing plot statistics...');
        const stats = await GuildDistrictManager.getPlotStatistics(testGuildId);
        console.log(`✅ Plot statistics:`);
        console.log(`   • Total plots: ${stats.totalPlots}`);
        console.log(`   • Total value: ${stats.totalValue.toLocaleString()} currency`);
        console.log(`   • Buildings: ${stats.buildings}`);
        console.log(`   • Total maintenance: ${stats.totalMaintenance} currency`);

        // Test 10: Get transaction history
        console.log('\n10. Testing transaction history...');
        const transactions = await GuildDistrictManager.getGuildTransactions(testGuildId, 5);
        console.log(`✅ Found ${transactions.length} recent transactions:`);
        transactions.forEach(transaction => {
            console.log(`   • ${transaction.transaction_type}: ${transaction.amount} currency - ${transaction.description}`);
        });

        console.log('\n🎉 Guild District system test completed successfully!\n');

    } catch (error) {
        console.error('❌ Guild District test failed:', error);
        process.exit(1);
    }
}

// If run directly, execute the test
if (require.main === module) {
    testGuildDistrict().catch(console.error);
}

module.exports = { testGuildDistrict };

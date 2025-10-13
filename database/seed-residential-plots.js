const Database = require('./db');

async function seedResidentialPlots() {
    try {
        console.log('🌱 Seeding residential plots data...');

        // Create sample neighborhoods if they don't exist
        const neighborhoods = [
            { name: 'Sunrise Valley', description: 'A peaceful residential area with beautiful gardens', defense_level: 2 },
            { name: 'Moonlight District', description: 'An upscale neighborhood with luxury homes', defense_level: 4 },
            { name: 'Garden Grove', description: 'A family-friendly community with parks and schools', defense_level: 3 },
            { name: 'Tech Heights', description: 'Modern residential area near the AI faction headquarters', defense_level: 3 },
            { name: 'Nature\'s Rest', description: 'Eco-friendly neighborhood surrounded by natural beauty', defense_level: 2 }
        ];

        for (const neighborhood of neighborhoods) {
            await Database.query(`
                INSERT OR IGNORE INTO neighborhoods (name, description, defense_level)
                VALUES (?, ?, ?)
            `, [neighborhood.name, neighborhood.description, neighborhood.defense_level]);
        }

        console.log('✅ Created neighborhoods');

        // Get neighborhood IDs
        const neighborhoodResults = await Database.query('SELECT id, name FROM neighborhoods ORDER BY id');
        const neighborhoodIds = neighborhoodResults.rows;

        // Create residential plots for each neighborhood
        for (const neighborhood of neighborhoodIds) {
            const plotCount = Math.floor(Math.random() * 8) + 5; // 5-12 plots per neighborhood
            
            for (let i = 1; i <= plotCount; i++) {
                const plotSizes = ['small', 'medium', 'large', 'estate'];
                const plotSize = plotSizes[Math.floor(Math.random() * plotSizes.length)];
                
                // Calculate base values based on size
                const baseValues = {
                    small: 1000,
                    medium: 2500,
                    large: 5000,
                    estate: 10000
                };
                
                const maintenanceCosts = {
                    small: 50,
                    medium: 125,
                    large: 250,
                    estate: 500
                };
                
                const maxOccupants = {
                    small: 2,
                    medium: 4,
                    large: 6,
                    estate: 10
                };

                await Database.query(`
                    INSERT OR IGNORE INTO residential_plots (
                        neighborhood_id, plot_number, plot_size, plot_tier, max_occupants,
                        base_value, current_value, monthly_maintenance_cost
                    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?)
                `, [
                    neighborhood.id, 
                    i, 
                    plotSize, 
                    maxOccupants[plotSize],
                    baseValues[plotSize], 
                    baseValues[plotSize], 
                    maintenanceCosts[plotSize]
                ]);
            }
            
            console.log(`✅ Created ${plotCount} plots for ${neighborhood.name}`);
        }

        // Show summary
        const totalPlots = await Database.query('SELECT COUNT(*) as count FROM residential_plots');
        const availablePlots = await Database.query('SELECT COUNT(*) as count FROM residential_plots WHERE owner_character_id IS NULL');
        
        console.log(`\n📊 Summary:`);
        console.log(`- Total neighborhoods: ${neighborhoodIds.length}`);
        console.log(`- Total plots created: ${totalPlots.rows[0].count}`);
        console.log(`- Available plots: ${availablePlots.rows[0].count}`);
        
        console.log('\n✅ Residential plots seeding completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding residential plots:', error);
        process.exit(1);
    }
}

seedResidentialPlots();

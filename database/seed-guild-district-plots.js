const Database = require('./db');

async function seedGuildDistrictPlots() {
    console.log('🌱 Seeding Guild District plots...\n');

    try {
        // Create initial plots
        const plots = [
            // Small plots (1-10)
            { plot_number: 1, plot_size: 'small', base_value: 1000, current_value: 1000 },
            { plot_number: 2, plot_size: 'small', base_value: 1000, current_value: 1000 },
            { plot_number: 3, plot_size: 'small', base_value: 1000, current_value: 1000 },
            { plot_number: 4, plot_size: 'small', base_value: 1000, current_value: 1000 },
            { plot_number: 5, plot_size: 'small', base_value: 1000, current_value: 1000 },
            
            // Medium plots (11-20)
            { plot_number: 11, plot_size: 'medium', base_value: 2500, current_value: 2500 },
            { plot_number: 12, plot_size: 'medium', base_value: 2500, current_value: 2500 },
            { plot_number: 13, plot_size: 'medium', base_value: 2500, current_value: 2500 },
            { plot_number: 14, plot_size: 'medium', base_value: 2500, current_value: 2500 },
            { plot_number: 15, plot_size: 'medium', base_value: 2500, current_value: 2500 },
            
            // Large plots (21-30)
            { plot_number: 21, plot_size: 'large', base_value: 5000, current_value: 5000 },
            { plot_number: 22, plot_size: 'large', base_value: 5000, current_value: 5000 },
            { plot_number: 23, plot_size: 'large', base_value: 5000, current_value: 5000 },
            { plot_number: 24, plot_size: 'large', base_value: 5000, current_value: 5000 },
            { plot_number: 25, plot_size: 'large', base_value: 5000, current_value: 5000 },
            
            // Commercial estates (31-35)
            { plot_number: 31, plot_size: 'commercial_estate', base_value: 10000, current_value: 10000 },
            { plot_number: 32, plot_size: 'commercial_estate', base_value: 10000, current_value: 10000 },
            { plot_number: 33, plot_size: 'commercial_estate', base_value: 10000, current_value: 10000 },
            { plot_number: 34, plot_size: 'commercial_estate', base_value: 10000, current_value: 10000 },
            { plot_number: 35, plot_size: 'commercial_estate', base_value: 10000, current_value: 10000 }
        ];

        let insertedCount = 0;
        let skippedCount = 0;

        for (const plot of plots) {
            try {
                // Check if plot already exists
                const existing = await Database.query(
                    'SELECT id FROM guild_district_plots WHERE plot_number = $1',
                    [plot.plot_number]
                );

                if (existing.rows.length > 0) {
                    skippedCount++;
                    continue;
                }

                // Insert the plot
                await Database.query(
                    'INSERT INTO guild_district_plots (plot_number, plot_size, base_value, current_value) VALUES ($1, $2, $3, $4)',
                    [plot.plot_number, plot.plot_size, plot.base_value, plot.current_value]
                );

                insertedCount++;
                console.log(`✅ Created plot #${plot.plot_number} (${plot.plot_size}) - ${plot.base_value} currency`);

            } catch (error) {
                console.error(`❌ Error creating plot #${plot.plot_number}:`, error.message);
            }
        }

        console.log(`\n📊 Seeding Summary:`);
        console.log(`  • Plots created: ${insertedCount}`);
        console.log(`  • Plots skipped (already exist): ${skippedCount}`);
        console.log(`  • Total plots: ${insertedCount + skippedCount}`);

        // Verify the plots were created
        const totalPlots = await Database.query('SELECT COUNT(*) as count FROM guild_district_plots');
        console.log(`  • Database total: ${totalPlots.rows[0].count} plots`);

        console.log('\n🎉 Guild District plots seeded successfully!\n');

    } catch (error) {
        console.error('❌ Error seeding Guild District plots:', error);
        process.exit(1);
    }
}

// If run directly, execute the seeding
if (require.main === module) {
    seedGuildDistrictPlots().catch(console.error);
}

module.exports = { seedGuildDistrictPlots };

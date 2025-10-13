const Database = require('../database/db');

class GuildDistrictManager {
    constructor() {
        this.plotCosts = {
            small: 1000,
            medium: 2500,
            large: 5000,
            commercial_estate: 10000
        };

        this.plotSizes = {
            small: { maxBuildings: 1, baseValue: 1000 },
            medium: { maxBuildings: 2, baseValue: 2500 },
            large: { maxBuildings: 3, baseValue: 5000 },
            commercial_estate: { maxBuildings: 5, baseValue: 10000 }
        };
    }

    /**
     * Get all available plots for purchase
     */
    async getAvailablePlots(size = null) {
        let query = 'SELECT plot_number, plot_size, base_value FROM guild_district_plots WHERE guild_id IS NULL';
        let params = [];

        if (size) {
            query += ' AND plot_size = $1';
            params.push(size);
        }

        query += ' ORDER BY plot_number';

        const result = await Database.query(query, params);
        return result.rows;
    }

    /**
     * Get guild's plots
     */
    async getGuildPlots(guildId) {
        const result = await Database.query(
            'SELECT * FROM guild_district_plots WHERE guild_id = $1 ORDER BY plot_number',
            [guildId]
        );
        return result.rows;
    }

    /**
     * Get plot by ID
     */
    async getPlot(plotId) {
        const result = await Database.query(
            'SELECT * FROM guild_district_plots WHERE id = $1',
            [plotId]
        );
        return result.rows[0] || null;
    }

    /**
     * Purchase a plot
     */
    async purchasePlot(guildId, plotNumber, processedBy) {
        const plot = await Database.query(
            'SELECT * FROM guild_district_plots WHERE plot_number = $1 AND guild_id IS NULL',
            [plotNumber]
        );

        if (plot.rows.length === 0) {
            throw new Error('Plot not available for purchase');
        }

        const plotData = plot.rows[0];
        const cost = this.plotCosts[plotData.plot_size];

        // Update plot ownership
        await Database.query(
            'UPDATE guild_district_plots SET guild_id = $1, purchased_at = CURRENT_TIMESTAMP WHERE plot_number = $2',
            [guildId, plotNumber]
        );

        // Log transaction
        await Database.query(
            'INSERT INTO guild_district_transactions (guild_id, transaction_type, amount, description, processed_by) VALUES ($1, $2, $3, $4, $5)',
            [guildId, 'plot_purchase', cost, `Purchased ${plotData.plot_size} plot #${plotNumber}`, processedBy]
        );

        return { plot: plotData, cost };
    }

    /**
     * Upgrade a plot
     */
    async upgradePlot(plotId, guildId, processedBy) {
        const plot = await this.getPlot(plotId);

        if (!plot || plot.guild_id !== guildId) {
            throw new Error('Plot not found or not owned by guild');
        }

        if (plot.plot_tier >= 5) {
            throw new Error('Plot is already at maximum tier');
        }

        const upgradeCost = Math.floor(plot.current_value * 0.5);
        const newTier = plot.plot_tier + 1;
        const newValue = Math.floor(plot.current_value * 1.5);

        // Update plot
        await Database.query(
            'UPDATE guild_district_plots SET plot_tier = $1, current_value = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [newTier, newValue, plotId]
        );

        // Log transaction
        await Database.query(
            'INSERT INTO guild_district_transactions (guild_id, transaction_type, plot_id, amount, description, processed_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [guildId, 'plot_upgrade', plotId, upgradeCost, `Upgraded plot #${plot.plot_number} to tier ${newTier}`, processedBy]
        );

        return { newTier, newValue, upgradeCost };
    }

    /**
     * Build a structure on a plot
     */
    async buildStructure(plotId, buildingType, guildId, processedBy) {
        const plot = await this.getPlot(plotId);

        if (!plot || plot.guild_id !== guildId) {
            throw new Error('Plot not found or not owned by guild');
        }

        if (plot.building_type) {
            throw new Error('Plot already has a building');
        }

        // Get building info
        const buildingInfo = await Database.query(
            'SELECT * FROM guild_building_types WHERE building_type = $1',
            [buildingType]
        );

        if (buildingInfo.rows.length === 0) {
            throw new Error('Invalid building type');
        }

        const building = buildingInfo.rows[0];

        // Build the structure
        await Database.query(
            'UPDATE guild_district_plots SET building_type = $1, building_level = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [buildingType, plotId]
        );

        // Log transaction
        await Database.query(
            'INSERT INTO guild_district_transactions (guild_id, transaction_type, plot_id, amount, description, processed_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [guildId, 'building_construction', plotId, building.base_cost, `Built ${building.building_name} on plot #${plot.plot_number}`, processedBy]
        );

        return building;
    }

    /**
     * Collect resources from guild's buildings
     */
    async collectResources(guildId, collectedBy) {
        const plots = await Database.query(
            'SELECT * FROM guild_district_plots WHERE guild_id = $1 AND building_type IS NOT NULL',
            [guildId]
        );

        if (plots.rows.length === 0) {
            throw new Error('No buildings to collect from');
        }

        const today = new Date().toISOString().split('T')[0];
        let totalResources = {};
        let collectedCount = 0;

        for (const plot of plots.rows) {
            // Check if already collected today
            const alreadyCollected = await Database.query(
                'SELECT id FROM guild_resource_generation WHERE guild_id = $1 AND plot_id = $2 AND generation_date = $3',
                [guildId, plot.id, today]
            );

            if (alreadyCollected.rows.length > 0) {
                continue;
            }

            // Get building info
            const buildingInfo = await Database.query(
                'SELECT * FROM guild_building_types WHERE building_type = $1',
                [plot.building_type]
            );

            if (buildingInfo.rows.length === 0) {
                continue;
            }

            const building = buildingInfo.rows[0];
            const resourceOutput = JSON.parse(building.resource_output);

            // Calculate resources based on building level
            const multiplier = 1 + (plot.building_level - 1) * 0.2; // 20% increase per level

            for (const [resource, amount] of Object.entries(resourceOutput)) {
                const finalAmount = Math.floor(amount * multiplier);
                totalResources[resource] = (totalResources[resource] || 0) + finalAmount;
            }

            // Log the resource generation
            await Database.query(
                'INSERT INTO guild_resource_generation (guild_id, plot_id, resources_generated, collected_by) VALUES ($1, $2, $3, $4)',
                [guildId, plot.id, JSON.stringify(resourceOutput), collectedBy]
            );

            collectedCount++;
        }

        if (collectedCount === 0) {
            throw new Error('All resources have already been collected today');
        }

        return { totalResources, collectedCount };
    }

    /**
     * Sell a plot
     */
    async sellPlot(plotId, guildId, processedBy) {
        const plot = await this.getPlot(plotId);

        if (!plot || plot.guild_id !== guildId) {
            throw new Error('Plot not found or not owned by guild');
        }

        const sellValue = Math.floor(plot.current_value * 0.7);

        // Sell the plot
        await Database.query(
            'UPDATE guild_district_plots SET guild_id = NULL, building_type = NULL, building_level = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [plotId]
        );

        // Log transaction
        await Database.query(
            'INSERT INTO guild_district_transactions (guild_id, transaction_type, plot_id, amount, description, processed_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [guildId, 'plot_sale', plotId, sellValue, `Sold plot #${plot.plot_number}`, processedBy]
        );

        return { sellValue, plot };
    }

    /**
     * Get building types
     */
    async getBuildingTypes() {
        const result = await Database.query('SELECT * FROM guild_building_types ORDER BY building_type');
        return result.rows;
    }

    /**
     * Get guild's transaction history
     */
    async getGuildTransactions(guildId, limit = 10) {
        const result = await Database.query(
            'SELECT * FROM guild_district_transactions WHERE guild_id = $1 ORDER BY processed_at DESC LIMIT $2',
            [guildId, limit]
        );
        return result.rows;
    }

    /**
     * Get guild's upgrades
     */
    async getGuildUpgrades(guildId) {
        const result = await Database.query(
            'SELECT * FROM guild_upgrades WHERE guild_id = $1 AND active = true',
            [guildId]
        );
        return result.rows;
    }

    /**
     * Calculate plot maintenance cost
     */
    calculateMaintenanceCost(plot) {
        const baseMaintenance = this.plotSizes[plot.plot_size].baseValue * 0.1; // 10% of base value
        const tierMultiplier = 1 + (plot.plot_tier - 1) * 0.2; // 20% increase per tier
        const buildingMaintenance = plot.building_type ? 100 : 0; // 100 currency per building

        return Math.floor(baseMaintenance * tierMultiplier + buildingMaintenance);
    }

    /**
     * Get plot statistics
     */
    async getPlotStatistics(guildId) {
        const plots = await this.getGuildPlots(guildId);
        
        const stats = {
            totalPlots: plots.length,
            totalValue: plots.reduce((sum, plot) => sum + plot.current_value, 0),
            buildings: plots.filter(plot => plot.building_type).length,
            totalMaintenance: plots.reduce((sum, plot) => sum + this.calculateMaintenanceCost(plot), 0),
            bySize: {},
            byTier: {}
        };

        // Count by size
        for (const plot of plots) {
            stats.bySize[plot.plot_size] = (stats.bySize[plot.plot_size] || 0) + 1;
            stats.byTier[plot.plot_tier] = (stats.byTier[plot.plot_tier] || 0) + 1;
        }

        return stats;
    }
}

module.exports = new GuildDistrictManager();

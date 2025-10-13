const Database = require('../database/db');

class ResidentialManager {
    constructor() {
        this.plotSizes = {
            small: { basePrice: 1000, maxOccupants: 2, maintenanceCost: 50 },
            medium: { basePrice: 2500, maxOccupants: 4, maintenanceCost: 125 },
            large: { basePrice: 5000, maxOccupants: 6, maintenanceCost: 250 },
            estate: { basePrice: 10000, maxOccupants: 10, maintenanceCost: 500 }
        };
        
        this.tierMultipliers = {
            1: 1.0,
            2: 1.5,
            3: 2.0,
            4: 2.5,
            5: 3.0
        };
    }

    /**
     * Get available plots in a neighborhood
     */
    async getAvailablePlots(neighborhoodId) {
        try {
            const result = await Database.query(`
                SELECT rp.*, n.name as neighborhood_name
                FROM residential_plots rp
                JOIN neighborhoods n ON rp.neighborhood_id = n.id
                WHERE rp.neighborhood_id = ? AND rp.owner_character_id IS NULL
                ORDER BY rp.plot_number
            `, [neighborhoodId]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting available plots:', error);
            throw error;
        }
    }

    /**
     * Get plots owned by a character
     */
    async getCharacterPlots(characterId) {
        try {
            const result = await Database.query(`
                SELECT rp.*, n.name as neighborhood_name,
                       COUNT(po.id) as current_occupants
                FROM residential_plots rp
                JOIN neighborhoods n ON rp.neighborhood_id = n.id
                LEFT JOIN plot_occupants po ON rp.id = po.plot_id AND po.moved_out_at IS NULL
                WHERE rp.owner_character_id = ?
                GROUP BY rp.id
                ORDER BY rp.purchased_at DESC
            `, [characterId]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting character plots:', error);
            throw error;
        }
    }

    /**
     * Purchase a residential plot
     */
    async purchasePlot(characterId, neighborhoodId, plotNumber, plotSize) {
        try {
            // Check if plot is available
            const plotCheck = await Database.query(`
                SELECT * FROM residential_plots 
                WHERE neighborhood_id = ? AND plot_number = ? AND owner_character_id IS NULL
            `, [neighborhoodId, plotNumber]);
            
            if (plotCheck.rows.length === 0) {
                throw new Error('Plot is not available for purchase');
            }

            const plot = plotCheck.rows[0];
            const sizeConfig = this.plotSizes[plotSize];
            
            if (!sizeConfig) {
                throw new Error('Invalid plot size');
            }

            const basePrice = sizeConfig.basePrice;
            const maintenanceCost = sizeConfig.maintenanceCost;
            const maxOccupants = sizeConfig.maxOccupants;

            // Check if character has enough currency
            const character = await Database.query(`
                SELECT pc.*, u.currency 
                FROM player_characters pc
                JOIN users u ON pc.discord_id = u.discord_id
                WHERE pc.id = ?
            `, [characterId]);

            if (character.rows.length === 0) {
                throw new Error('Character not found');
            }

            const userCurrency = character.rows[0].currency;
            if (userCurrency < basePrice) {
                throw new Error(`Insufficient currency. Need ${basePrice}, have ${userCurrency}`);
            }

            // Update plot ownership
            await Database.query(`
                UPDATE residential_plots 
                SET owner_character_id = ?, 
                    plot_size = ?, 
                    base_value = ?, 
                    current_value = ?, 
                    max_occupants = ?,
                    monthly_maintenance_cost = ?,
                    purchased_at = CURRENT_TIMESTAMP,
                    is_for_sale = 0
                WHERE id = ?
            `, [characterId, plotSize, basePrice, basePrice, maxOccupants, maintenanceCost, plot.id]);

            // Deduct currency
            await Database.query(`
                UPDATE users 
                SET currency = currency - ? 
                WHERE discord_id = ?
            `, [basePrice, character.rows[0].discord_id]);

            // Add owner as occupant
            await Database.query(`
                INSERT INTO plot_occupants (plot_id, character_id, occupancy_type, rent_amount)
                VALUES (?, ?, 'owner', 0)
            `, [plot.id, characterId]);

            return {
                success: true,
                plotId: plot.id,
                plotNumber: plotNumber,
                plotSize: plotSize,
                price: basePrice,
                maintenanceCost: maintenanceCost
            };

        } catch (error) {
            console.error('Error purchasing plot:', error);
            throw error;
        }
    }

    /**
     * List a plot for sale
     */
    async listPlotForSale(characterId, plotId, salePrice) {
        try {
            // Verify ownership
            const plot = await Database.query(`
                SELECT * FROM residential_plots 
                WHERE id = ? AND owner_character_id = ?
            `, [plotId, characterId]);

            if (plot.rows.length === 0) {
                throw new Error('Plot not found or not owned by character');
            }

            // Update plot for sale
            await Database.query(`
                UPDATE residential_plots 
                SET is_for_sale = 1, sale_price = ?
                WHERE id = ?
            `, [salePrice, plotId]);

            return {
                success: true,
                plotId: plotId,
                salePrice: salePrice
            };

        } catch (error) {
            console.error('Error listing plot for sale:', error);
            throw error;
        }
    }

    /**
     * Buy a plot that's for sale
     */
    async buyPlotForSale(characterId, plotId) {
        try {
            // Get plot details
            const plot = await Database.query(`
                SELECT rp.*, pc.discord_id as owner_discord_id
                FROM residential_plots rp
                JOIN player_characters pc ON rp.owner_character_id = pc.id
                WHERE rp.id = ? AND rp.is_for_sale = 1
            `, [plotId]);

            if (plot.rows.length === 0) {
                throw new Error('Plot not found or not for sale');
            }

            const plotData = plot.rows[0];
            const salePrice = plotData.sale_price;

            // Check buyer's currency
            const buyer = await Database.query(`
                SELECT pc.*, u.currency 
                FROM player_characters pc
                JOIN users u ON pc.discord_id = u.discord_id
                WHERE pc.id = ?
            `, [characterId]);

            if (buyer.rows.length === 0) {
                throw new Error('Buyer character not found');
            }

            const buyerCurrency = buyer.rows[0].currency;
            if (buyerCurrency < salePrice) {
                throw new Error(`Insufficient currency. Need ${salePrice}, have ${buyerCurrency}`);
            }

            // Transfer ownership
            await Database.query(`
                UPDATE residential_plots 
                SET owner_character_id = ?, 
                    is_for_sale = 0, 
                    sale_price = NULL,
                    current_value = ?
                WHERE id = ?
            `, [characterId, salePrice, plotId]);

            // Transfer currency
            await Database.query(`
                UPDATE users 
                SET currency = currency - ? 
                WHERE discord_id = ?
            `, [salePrice, buyer.rows[0].discord_id]);

            await Database.query(`
                UPDATE users 
                SET currency = currency + ? 
                WHERE discord_id = ?
            `, [salePrice, plotData.owner_discord_id]);

            // Update occupants
            await Database.query(`
                UPDATE plot_occupants 
                SET moved_out_at = CURRENT_TIMESTAMP 
                WHERE plot_id = ? AND moved_out_at IS NULL
            `, [plotId]);

            await Database.query(`
                INSERT INTO plot_occupants (plot_id, character_id, occupancy_type, rent_amount)
                VALUES (?, ?, 'owner', 0)
            `, [plotId, characterId]);

            return {
                success: true,
                plotId: plotId,
                salePrice: salePrice,
                newOwner: characterId
            };

        } catch (error) {
            console.error('Error buying plot for sale:', error);
            throw error;
        }
    }

    /**
     * Upgrade a plot tier
     */
    async upgradePlot(characterId, plotId) {
        try {
            // Get plot details
            const plot = await Database.query(`
                SELECT * FROM residential_plots 
                WHERE id = ? AND owner_character_id = ?
            `, [plotId, characterId]);

            if (plot.rows.length === 0) {
                throw new Error('Plot not found or not owned by character');
            }

            const plotData = plot.rows[0];
            const currentTier = plotData.plot_tier;
            
            if (currentTier >= 5) {
                throw new Error('Plot is already at maximum tier');
            }

            const newTier = currentTier + 1;
            const upgradeCost = Math.floor(plotData.base_value * 0.5 * this.tierMultipliers[newTier]);
            const newMaxOccupants = Math.floor(plotData.max_occupants * 1.2);
            const newMaintenanceCost = Math.floor(plotData.monthly_maintenance_cost * 1.3);

            // Check currency
            const character = await Database.query(`
                SELECT pc.*, u.currency 
                FROM player_characters pc
                JOIN users u ON pc.discord_id = u.discord_id
                WHERE pc.id = ?
            `, [characterId]);

            if (character.rows.length === 0) {
                throw new Error('Character not found');
            }

            const userCurrency = character.rows[0].currency;
            if (userCurrency < upgradeCost) {
                throw new Error(`Insufficient currency. Need ${upgradeCost}, have ${userCurrency}`);
            }

            // Update plot
            await Database.query(`
                UPDATE residential_plots 
                SET plot_tier = ?, 
                    max_occupants = ?, 
                    monthly_maintenance_cost = ?,
                    current_value = current_value + ?
                WHERE id = ?
            `, [newTier, newMaxOccupants, newMaintenanceCost, upgradeCost, plotId]);

            // Deduct currency
            await Database.query(`
                UPDATE users 
                SET currency = currency - ? 
                WHERE discord_id = ?
            `, [upgradeCost, character.rows[0].discord_id]);

            return {
                success: true,
                plotId: plotId,
                newTier: newTier,
                upgradeCost: upgradeCost,
                newMaxOccupants: newMaxOccupants,
                newMaintenanceCost: newMaintenanceCost
            };

        } catch (error) {
            console.error('Error upgrading plot:', error);
            throw error;
        }
    }

    /**
     * Invite someone to live in your plot
     */
    async inviteOccupant(ownerCharacterId, plotId, inviteeCharacterId, rentAmount = 0) {
        try {
            // Verify ownership
            const plot = await Database.query(`
                SELECT * FROM residential_plots 
                WHERE id = ? AND owner_character_id = ?
            `, [plotId, ownerCharacterId]);

            if (plot.rows.length === 0) {
                throw new Error('Plot not found or not owned by character');
            }

            const plotData = plot.rows[0];

            // Check current occupants
            const currentOccupants = await Database.query(`
                SELECT COUNT(*) as count FROM plot_occupants 
                WHERE plot_id = ? AND moved_out_at IS NULL
            `, [plotId]);

            if (currentOccupants.rows[0].count >= plotData.max_occupants) {
                throw new Error('Plot is at maximum occupancy');
            }

            // Check if invitee is already an occupant
            const existingOccupant = await Database.query(`
                SELECT * FROM plot_occupants 
                WHERE plot_id = ? AND character_id = ? AND moved_out_at IS NULL
            `, [plotId, inviteeCharacterId]);

            if (existingOccupant.rows.length > 0) {
                throw new Error('Character is already an occupant of this plot');
            }

            // Add occupant
            await Database.query(`
                INSERT INTO plot_occupants (plot_id, character_id, occupancy_type, rent_amount)
                VALUES (?, ?, 'renter', ?)
            `, [plotId, inviteeCharacterId, rentAmount]);

            // Create rent agreement if rent is involved
            if (rentAmount > 0) {
                const owner = await Database.query(`
                    SELECT discord_id FROM player_characters WHERE id = ?
                `, [ownerCharacterId]);

                const invitee = await Database.query(`
                    SELECT discord_id FROM player_characters WHERE id = ?
                `, [inviteeCharacterId]);

                await Database.query(`
                    INSERT INTO rent_agreements (plot_id, renter_id, landlord_id, monthly_rent)
                    VALUES (?, ?, ?, ?)
                `, [plotId, invitee.rows[0].discord_id, owner.rows[0].discord_id, rentAmount]);
            }

            return {
                success: true,
                plotId: plotId,
                inviteeCharacterId: inviteeCharacterId,
                rentAmount: rentAmount
            };

        } catch (error) {
            console.error('Error inviting occupant:', error);
            throw error;
        }
    }

    /**
     * Get plot occupants
     */
    async getPlotOccupants(plotId) {
        try {
            const result = await Database.query(`
                SELECT po.*, pc.character_name, pc.current_faction
                FROM plot_occupants po
                JOIN player_characters pc ON po.character_id = pc.id
                WHERE po.plot_id = ? AND po.moved_out_at IS NULL
                ORDER BY po.moved_in_at
            `, [plotId]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting plot occupants:', error);
            throw error;
        }
    }

    /**
     * Get plot details with occupants
     */
    async getPlotDetails(plotId) {
        try {
            const plot = await Database.query(`
                SELECT rp.*, n.name as neighborhood_name,
                       pc.character_name as owner_name, pc.current_faction as owner_faction
                FROM residential_plots rp
                JOIN neighborhoods n ON rp.neighborhood_id = n.id
                LEFT JOIN player_characters pc ON rp.owner_character_id = pc.id
                WHERE rp.id = ?
            `, [plotId]);

            if (plot.rows.length === 0) {
                throw new Error('Plot not found');
            }

            const plotData = plot.rows[0];
            const occupants = await this.getPlotOccupants(plotId);

            return {
                ...plotData,
                occupants: occupants
            };

        } catch (error) {
            console.error('Error getting plot details:', error);
            throw error;
        }
    }

    /**
     * Get neighborhoods with available plots
     */
    async getNeighborhoodsWithPlots() {
        try {
            const result = await Database.query(`
                SELECT n.*, 
                       COUNT(rp.id) as total_plots,
                       COUNT(CASE WHEN rp.owner_character_id IS NULL THEN 1 END) as available_plots
                FROM neighborhoods n
                LEFT JOIN residential_plots rp ON n.id = rp.neighborhood_id
                GROUP BY n.id
                ORDER BY n.name
            `);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting neighborhoods with plots:', error);
            throw error;
        }
    }
}

module.exports = new ResidentialManager();

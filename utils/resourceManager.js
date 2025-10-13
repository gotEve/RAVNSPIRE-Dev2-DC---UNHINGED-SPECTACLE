const Database = require('../database/db');
const factionManager = require('./factionManager');

class ResourceManager {
    constructor() {
        // Faction-specific daily resource costs
        this.dailyCosts = {
            Human: { food: 10, water: 5 },
            AI: { energy: 8, data_fragments: 3, electricity: 5 },
            Nature: { biomass: 12, organic_matter: 6 }
        };
        
        // Resource types by faction
        this.factionResources = {
            Human: ['food', 'water', 'currency', 'building_materials', 'rare_artifacts'],
            AI: ['energy', 'data_fragments', 'electricity', 'currency', 'building_materials', 'rare_artifacts'],
            Nature: ['biomass', 'organic_matter', 'currency', 'building_materials', 'rare_artifacts']
        };
    }

    /**
     * Get player's current resources
     */
    async getPlayerResources(discordId) {
        try {
            const result = await Database.query(`
                SELECT * FROM player_resources WHERE discord_id = ?
            `, [discordId]);

            if (result.rows.length === 0) {
                // Initialize resources for new player
                await this.initializePlayerResources(discordId);
                return await this.getPlayerResources(discordId);
            }

            return result.rows[0];

        } catch (error) {
            console.error('Error getting player resources:', error);
            throw error;
        }
    }

    /**
     * Initialize resources for a new player
     */
    async initializePlayerResources(discordId) {
        try {
            await Database.query(`
                INSERT INTO player_resources (
                    discord_id, currency, food, energy, biomass, electricity, 
                    water, data_fragments, organic_matter, building_materials, rare_artifacts
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [discordId, 100, 50, 50, 50, 50, 50, 50, 50, 0, 0]);

        } catch (error) {
            console.error('Error initializing player resources:', error);
            throw error;
        }
    }

    /**
     * Update player resources
     */
    async updatePlayerResources(discordId, resourceUpdates) {
        try {
            const setClause = Object.keys(resourceUpdates)
                .map(key => `${key} = ${key} + ?`)
                .join(', ');

            const values = Object.values(resourceUpdates);
            values.push(discordId);

            await Database.query(`
                UPDATE player_resources 
                SET ${setClause}, last_updated = CURRENT_TIMESTAMP
                WHERE discord_id = ?
            `, values);

            return await this.getPlayerResources(discordId);

        } catch (error) {
            console.error('Error updating player resources:', error);
            throw error;
        }
    }

    /**
     * Check if player has sufficient resources
     */
    async hasSufficientResources(discordId, requiredResources) {
        try {
            const resources = await this.getPlayerResources(discordId);
            
            for (const [resourceType, amount] of Object.entries(requiredResources)) {
                if (resources[resourceType] < amount) {
                    return false;
                }
            }
            
            return true;

        } catch (error) {
            console.error('Error checking resources:', error);
            throw error;
        }
    }

    /**
     * Deduct resources from player
     */
    async deductResources(discordId, resourceDeductions) {
        try {
            // Check if player has sufficient resources
            const hasEnough = await this.hasSufficientResources(discordId, resourceDeductions);
            if (!hasEnough) {
                throw new Error('Insufficient resources');
            }

            // Convert deductions to negative values for update
            const negativeDeductions = {};
            for (const [resourceType, amount] of Object.entries(resourceDeductions)) {
                negativeDeductions[resourceType] = -amount;
            }

            return await this.updatePlayerResources(discordId, negativeDeductions);

        } catch (error) {
            console.error('Error deducting resources:', error);
            throw error;
        }
    }

    /**
     * Add resources to player
     */
    async addResources(discordId, resourceAdditions) {
        try {
            return await this.updatePlayerResources(discordId, resourceAdditions);

        } catch (error) {
            console.error('Error adding resources:', error);
            throw error;
        }
    }

    /**
     * Process daily resource consumption for a character
     */
    async processDailyConsumption(characterId) {
        try {
            // Get character info
            const character = await Database.query(`
                SELECT * FROM player_characters WHERE id = ?
            `, [characterId]);

            if (character.rows.length === 0) {
                throw new Error('Character not found');
            }

            const char = character.rows[0];
            const faction = char.current_faction;
            const discordId = char.discord_id;

            // Check if already processed today
            const today = new Date().toISOString().split('T')[0];
            const existingConsumption = await Database.query(`
                SELECT * FROM resource_consumption_log 
                WHERE character_id = ? AND consumption_date = ?
            `, [characterId, today]);

            if (existingConsumption.rows.length > 0) {
                return { message: 'Daily consumption already processed' };
            }

            // Get daily costs for faction
            const costs = this.dailyCosts[faction];
            if (!costs) {
                throw new Error(`Unknown faction: ${faction}`);
            }

            // Check if player has sufficient resources
            const hasEnough = await this.hasSufficientResources(discordId, costs);
            
            if (hasEnough) {
                // Deduct resources
                await this.deductResources(discordId, costs);
                
                // Log consumption
                await Database.query(`
                    INSERT INTO resource_consumption_log (
                        character_id, consumption_date, faction, resources_consumed, auto_deducted
                    ) VALUES (?, ?, ?, ?, ?)
                `, [characterId, today, faction, JSON.stringify(costs), true]);

                return { 
                    success: true, 
                    message: 'Daily consumption processed successfully',
                    consumed: costs
                };
            } else {
                // Log failed consumption
                await Database.query(`
                    INSERT INTO resource_consumption_log (
                        character_id, consumption_date, faction, resources_consumed, auto_deducted
                    ) VALUES (?, ?, ?, ?, ?)
                `, [characterId, today, faction, JSON.stringify(costs), false]);

                return { 
                    success: false, 
                    message: 'Insufficient resources for daily consumption',
                    required: costs
                };
            }

        } catch (error) {
            console.error('Error processing daily consumption:', error);
            throw error;
        }
    }

    /**
     * Process daily consumption for all active characters
     */
    async processAllDailyConsumption() {
        try {
            const activeCharacters = await Database.query(`
                SELECT id, discord_id, character_name, current_faction 
                FROM player_characters 
                WHERE is_active = true AND is_alive = true
            `);

            const results = [];
            
            for (const character of activeCharacters.rows) {
                try {
                    const result = await this.processDailyConsumption(character.id);
                    results.push({
                        characterId: character.id,
                        characterName: character.character_name,
                        discordId: character.discord_id,
                        faction: character.current_faction,
                        ...result
                    });
                } catch (error) {
                    results.push({
                        characterId: character.id,
                        characterName: character.character_name,
                        discordId: character.discord_id,
                        faction: character.current_faction,
                        success: false,
                        error: error.message
                    });
                }
            }

            return results;

        } catch (error) {
            console.error('Error processing all daily consumption:', error);
            throw error;
        }
    }

    /**
     * Get resource consumption history for a character
     */
    async getConsumptionHistory(characterId, days = 7) {
        try {
            const result = await Database.query(`
                SELECT * FROM resource_consumption_log 
                WHERE character_id = ? 
                ORDER BY consumption_date DESC 
                LIMIT ?
            `, [characterId, days]);

            return result.rows;

        } catch (error) {
            console.error('Error getting consumption history:', error);
            throw error;
        }
    }

    /**
     * Get faction-specific resource requirements
     */
    getFactionRequirements(faction) {
        return this.dailyCosts[faction] || {};
    }

    /**
     * Get available resources for a faction
     */
    getFactionResourceTypes(faction) {
        return this.factionResources[faction] || [];
    }

    /**
     * Calculate resource value for trading/display
     */
    calculateResourceValue(resources) {
        const baseValues = {
            currency: 1,
            food: 2,
            water: 2,
            energy: 3,
            data_fragments: 5,
            electricity: 3,
            biomass: 2,
            organic_matter: 4,
            building_materials: 10,
            rare_artifacts: 100
        };

        let totalValue = 0;
        for (const [resourceType, amount] of Object.entries(resources)) {
            totalValue += (baseValues[resourceType] || 1) * amount;
        }

        return totalValue;
    }

    /**
     * Get resource statistics for a player
     */
    async getResourceStats(discordId) {
        try {
            const resources = await this.getPlayerResources(discordId);
            const character = await factionManager.getCurrentCharacter(discordId);
            
            if (!character) {
                throw new Error('No active character found');
            }

            const faction = character.current_faction;
            const dailyCosts = this.getFactionRequirements(faction);
            const totalValue = this.calculateResourceValue(resources);

            return {
                resources,
                faction,
                dailyCosts,
                totalValue,
                canAffordDaily: await this.hasSufficientResources(discordId, dailyCosts)
            };

        } catch (error) {
            console.error('Error getting resource stats:', error);
            throw error;
        }
    }
}

module.exports = new ResourceManager();

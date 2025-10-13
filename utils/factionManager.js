const Database = require('../database/db');

class FactionManager {
    constructor() {
        this.factions = ['Human', 'AI', 'Nature'];
        this.lifeStages = ['baby', 'child', 'teen', 'adult'];
        
        // Faction-specific resource costs per day
        this.dailyCosts = {
            Human: { food: 10, water: 5 },
            AI: { energy: 8, data_fragments: 3, electricity: 5 },
            Nature: { biomass: 12, organic_matter: 6 }
        };
    }

    /**
     * Get faction information for a user
     */
    async getFactionInfo(userId) {
        const result = await Database.query(
            'SELECT * FROM player_factions WHERE discord_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const faction = result.rows[0];
        faction.faction_history = JSON.parse(faction.faction_history || '[]');
        
        return faction;
    }

    /**
     * Get current active character for a user
     */
    async getCurrentCharacter(userId) {
        const result = await Database.query(
            'SELECT * FROM player_characters WHERE discord_id = $1 AND is_active = true AND is_alive = true',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const character = result.rows[0];
        character.genetic_traits = JSON.parse(character.genetic_traits || '{}');
        
        return character;
    }

    /**
     * Create a new character (first character for a user)
     */
    async createCharacter(userId, characterName, faction) {
        // Check if user already has a character
        const existingCharacter = await this.getCurrentCharacter(userId);
        if (existingCharacter) {
            throw new Error('You already have an active character. Use character switching to play as children.');
        }

        // Validate faction
        if (!this.factions.includes(faction)) {
            throw new Error('Invalid faction. Must be Human, AI, or Nature.');
        }

        // Create character
        const characterResult = await Database.query(`
            INSERT INTO player_characters (
                discord_id, original_creator, character_name, birth_faction, 
                current_faction, is_active, is_alive
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [userId, userId, characterName, faction, faction, true, true]);

        const characterId = characterResult.rows[0].id;

        // Create faction entry
        await Database.query(`
            INSERT INTO player_factions (
                discord_id, current_faction, faction_purity, faction_history
            ) VALUES ($1, $2, $3, $4)
        `, [userId, faction, 1.00, JSON.stringify([{
            faction: faction,
            switched_at: new Date().toISOString(),
            reason: 'character_creation',
            character_id: characterId
        }])]);

        // Initialize faction resources
        await Database.query(`
            INSERT INTO faction_resources (discord_id) VALUES ($1)
        `, [userId]);

        return {
            characterId,
            characterName,
            faction,
            purity: 1.00
        };
    }

    /**
     * Switch to a different character (child)
     */
    async switchToCharacter(userId, characterId) {
        // Get the character to switch to
        const characterResult = await Database.query(
            'SELECT * FROM player_characters WHERE id = $1 AND discord_id = $2 AND is_alive = true',
            [characterId, userId]
        );

        if (characterResult.rows.length === 0) {
            throw new Error('Character not found or not available for switching.');
        }

        const newCharacter = characterResult.rows[0];

        // Check if character is already active
        if (newCharacter.is_active) {
            throw new Error('This character is already your active character.');
        }

        // Get current character
        const currentCharacter = await this.getCurrentCharacter(userId);
        if (!currentCharacter) {
            throw new Error('No active character found.');
        }

        // Deactivate current character
        await Database.query(
            'UPDATE player_characters SET is_active = false WHERE id = $1',
            [currentCharacter.id]
        );

        // Activate new character
        await Database.query(
            'UPDATE player_characters SET is_active = true WHERE id = $1',
            [characterId]
        );

        // Update faction information
        const newFaction = newCharacter.current_faction;
        const newPurity = this.calculateFactionPurity(newCharacter);

        // Get current faction history
        const factionInfo = await this.getFactionInfo(userId);
        const history = factionInfo.faction_history || [];
        
        // Add new switch to history
        history.push({
            faction: newFaction,
            switched_at: new Date().toISOString(),
            reason: 'character_switch',
            character_id: characterId,
            from_character_id: currentCharacter.id
        });

        // Update faction entry
        await Database.query(
            'UPDATE player_factions SET current_faction = $1, faction_purity = $2, faction_history = $3, switched_from_character = $4, updated_at = CURRENT_TIMESTAMP WHERE discord_id = $5',
            [newFaction, newPurity, JSON.stringify(history), currentCharacter.id, userId]
        );

        // Log the faction switch
        await Database.query(`
            INSERT INTO faction_switches (
                discord_id, from_faction, to_faction, switch_reason, character_id
            ) VALUES ($1, $2, $3, $4, $5)
        `, [userId, currentCharacter.current_faction, newFaction, 'character_switch', characterId]);

        return {
            characterId: newCharacter.id,
            characterName: newCharacter.character_name,
            newFaction: newFaction,
            characterAge: newCharacter.age_years,
            lifeStage: newCharacter.life_stage,
            purity: newPurity
        };
    }

    /**
     * Calculate faction purity based on character lineage
     */
    calculateFactionPurity(character) {
        // For now, return 1.00 (pure) for all characters
        // This will be enhanced when we implement hybrid children
        return 1.00;
    }

    /**
     * Get faction switching history
     */
    async getFactionHistory(userId) {
        const result = await Database.query(
            'SELECT * FROM faction_switches WHERE discord_id = $1 ORDER BY switched_at DESC',
            [userId]
        );

        return result.rows;
    }

    /**
     * Get character lineage for a user
     */
    async getCharacterLineage(userId) {
        const result = await Database.query(
            'SELECT * FROM player_characters WHERE discord_id = $1 ORDER BY created_at ASC',
            [userId]
        );

        return result.rows.map(character => ({
            ...character,
            genetic_traits: JSON.parse(character.genetic_traits || '{}')
        }));
    }

    /**
     * Get faction resources for a user
     */
    async getFactionResources(userId) {
        const result = await Database.query(
            'SELECT * FROM faction_resources WHERE discord_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Initialize resources if they don't exist
            await Database.query(
                'INSERT INTO faction_resources (discord_id) VALUES ($1)',
                [userId]
            );
            
            return {
                food: 0, water: 0, energy: 0, data_fragments: 0, electricity: 0,
                biomass: 0, organic_matter: 0, currency: 0, building_materials: 0, rare_artifacts: 0
            };
        }

        return result.rows[0];
    }

    /**
     * Add resources to a user's faction resources
     */
    async addFactionResources(userId, resources) {
        const currentResources = await this.getFactionResources(userId);
        
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const [resource, amount] of Object.entries(resources)) {
            if (currentResources.hasOwnProperty(resource)) {
                updates.push(`${resource} = ${resource} + $${paramIndex}`);
                values.push(amount);
                paramIndex++;
            }
        }

        if (updates.length > 0) {
            await Database.query(
                `UPDATE faction_resources SET ${updates.join(', ')}, last_updated = CURRENT_TIMESTAMP WHERE discord_id = $${paramIndex}`,
                [...values, userId]
            );
        }
    }

    /**
     * Deduct daily resource costs
     */
    async deductDailyCosts(userId) {
        const factionInfo = await this.getFactionInfo(userId);
        if (!factionInfo) {
            return;
        }

        const costs = this.dailyCosts[factionInfo.current_faction];
        if (!costs) {
            return;
        }

        const currentResources = await this.getFactionResources(userId);
        const today = new Date().toISOString().split('T')[0];

        // Check if already deducted today
        const consumptionCheck = await Database.query(
            'SELECT id FROM resource_consumption_log WHERE discord_id = $1 AND consumption_date = $2',
            [userId, today]
        );

        if (consumptionCheck.rows.length > 0) {
            return; // Already deducted today
        }

        // Check if user has enough resources
        let canAfford = true;
        for (const [resource, cost] of Object.entries(costs)) {
            if (currentResources[resource] < cost) {
                canAfford = false;
                break;
            }
        }

        if (canAfford) {
            // Deduct resources
            const updates = [];
            const values = [];
            let paramIndex = 1;

            for (const [resource, cost] of Object.entries(costs)) {
                updates.push(`${resource} = ${resource} - $${paramIndex}`);
                values.push(cost);
                paramIndex++;
            }

            await Database.query(
                `UPDATE faction_resources SET ${updates.join(', ')}, last_updated = CURRENT_TIMESTAMP WHERE discord_id = $${paramIndex}`,
                [...values, userId]
            );

            // Log consumption
            await Database.query(`
                INSERT INTO resource_consumption_log (
                    discord_id, consumption_date, faction, resources_consumed
                ) VALUES ($1, $2, $3, $4)
            `, [userId, today, factionInfo.current_faction, JSON.stringify(costs)]);
        }
    }

    /**
     * Get faction achievements for a user
     */
    async getFactionAchievements(userId) {
        const result = await Database.query(`
            SELECT fa.name, fa.description, fa.rarity, fa.rewards
            FROM user_faction_achievements ufa
            JOIN faction_achievements fa ON ufa.achievement_id = fa.id
            WHERE ufa.discord_id = $1
            ORDER BY fa.rarity DESC, ufa.earned_at DESC
        `, [userId]);

        return result.rows.map(achievement => ({
            ...achievement,
            rewards: JSON.parse(achievement.rewards || '{}')
        }));
    }

    /**
     * Check and award faction achievements
     */
    async checkFactionAchievements(userId) {
        const factionInfo = await this.getFactionInfo(userId);
        if (!factionInfo) {
            return [];
        }

        const achievements = await Database.query('SELECT * FROM faction_achievements WHERE active = true');
        const newAchievements = [];

        for (const achievement of achievements.rows) {
            const requirements = JSON.parse(achievement.requirements);
            const rewards = JSON.parse(achievement.rewards);
            
            // Check if user already has this achievement
            const existingAchievement = await Database.query(
                'SELECT id FROM user_faction_achievements WHERE discord_id = $1 AND achievement_id = $2',
                [userId, achievement.id]
            );

            if (existingAchievement.rows.length > 0) {
                continue; // User already has this achievement
            }

            let shouldAward = false;

            // Check achievement requirements
            switch (achievement.achievement_type) {
                case 'faction_purist':
                    if (requirements.faction === factionInfo.current_faction && 
                        factionInfo.faction_purity >= requirements.purity) {
                        // Check duration requirement
                        const durationDays = await this.getFactionDuration(userId, requirements.faction);
                        shouldAward = durationDays >= requirements.duration_days;
                    }
                    break;

                case 'faction_switcher':
                    const switchCount = await this.getFactionSwitchCount(userId);
                    shouldAward = switchCount >= requirements.faction_switches;
                    break;

                case 'character_lineage':
                    const lineageDepth = await this.getLineageDepth(userId);
                    if (requirements.generations) {
                        shouldAward = lineageDepth >= requirements.generations;
                    } else if (requirements.lineage_depth) {
                        shouldAward = lineageDepth >= requirements.lineage_depth;
                    }
                    break;

                case 'faction_balance':
                    if (factionInfo.faction_purity >= requirements.purity_range[0] && 
                        factionInfo.faction_purity <= requirements.purity_range[1]) {
                        const durationDays = await this.getBalancedPurityDuration(userId);
                        shouldAward = durationDays >= requirements.duration_days;
                    }
                    break;
            }

            if (shouldAward) {
                // Award the achievement
                await Database.query(
                    'INSERT INTO user_faction_achievements (discord_id, achievement_id) VALUES ($1, $2)',
                    [userId, achievement.id]
                );

                newAchievements.push({
                    name: achievement.name,
                    description: achievement.description,
                    rarity: achievement.rarity,
                    rewards
                });
            }
        }

        return newAchievements;
    }

    // Helper methods for achievement checking
    async getFactionDuration(userId, faction) {
        const result = await Database.query(
            'SELECT switched_at FROM faction_switches WHERE discord_id = $1 AND to_faction = $2 ORDER BY switched_at DESC LIMIT 1',
            [userId, faction]
        );

        if (result.rows.length === 0) {
            return 0;
        }

        const switchDate = new Date(result.rows[0].switched_at);
        const now = new Date();
        const diffTime = Math.abs(now - switchDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    async getFactionSwitchCount(userId) {
        const result = await Database.query(
            'SELECT COUNT(*) as count FROM faction_switches WHERE discord_id = $1',
            [userId]
        );
        return result.rows[0].count || 0;
    }

    async getLineageDepth(userId) {
        const result = await Database.query(
            'SELECT COUNT(*) as count FROM player_characters WHERE discord_id = $1',
            [userId]
        );
        return result.rows[0].count || 0;
    }

    async getBalancedPurityDuration(userId) {
        // This would track how long the user has maintained balanced purity
        // For now, return 0 as this is a complex calculation
        return 0;
    }

    /**
     * Age characters (called by daily cron job)
     */
    async ageCharacters() {
        // Age all living characters
        await Database.query(`
            UPDATE player_characters 
            SET age_years = age_years + 1,
                life_stage = CASE 
                    WHEN age_years < 2 THEN 'baby'
                    WHEN age_years < 12 THEN 'child'
                    WHEN age_years < 18 THEN 'teen'
                    ELSE 'adult'
                END
            WHERE is_alive = true
        `);
    }
}

module.exports = new FactionManager();

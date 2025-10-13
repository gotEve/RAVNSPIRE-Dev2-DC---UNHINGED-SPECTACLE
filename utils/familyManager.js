const Database = require('../database/db');
const FactionManager = require('./factionManager');

class FamilyManager {
    constructor() {
        this.affectionCosts = {
            'conversation': 0,
            'hug': 0,
            'kiss': 0,
            'gift': 50,
            'game': 25,
            'date': 100,
            'romantic': 75,
            'music': 0,
            'reading': 0,
            'sunset': 0
        };

        this.affectionGains = {
            'conversation': 5,
            'hug': 10,
            'kiss': 15,
            'gift': 25,
            'game': 20,
            'date': 30,
            'romantic': 35,
            'music': 8,
            'reading': 12,
            'sunset': 18
        };

        this.conceptionRequirements = {
            'natural': 100,
            'surrogate': 150,
            'artificial': 200
        };

        this.careActivities = {
            'feeding': { cost: 10, development: 5 },
            'playing': { cost: 5, development: 8 },
            'teaching': { cost: 15, development: 12 },
            'medical': { cost: 25, development: 10 },
            'bedtime': { cost: 5, development: 6 },
            'creative': { cost: 10, development: 15 },
            'physical': { cost: 8, development: 10 },
            'conversation': { cost: 0, development: 8 }
        };
    }

    /**
     * Create a marriage proposal
     */
    async createMarriageProposal(proposerId, targetId, type = 'dyad', message = '') {
        // Check if proposer has a character
        const proposerCharacter = await FactionManager.getCurrentCharacter(proposerId);
        if (!proposerCharacter) {
            throw new Error('You must have a character to propose marriage.');
        }

        // Check if target has a character
        const targetCharacter = await FactionManager.getCurrentCharacter(targetId);
        if (!targetCharacter) {
            throw new Error('Target user must have a character to receive proposals.');
        }

        // Check if proposer is already married
        const existingMarriage = await this.getMarriageStatus(proposerId);
        if (existingMarriage) {
            throw new Error('You are already married.');
        }

        // Check if target is already married
        const targetMarriage = await this.getMarriageStatus(targetId);
        if (targetMarriage) {
            throw new Error('Target user is already married.');
        }

        // Check for existing pending proposals
        const existingProposal = await Database.query(
            'SELECT id FROM marriage_proposals WHERE proposer_character_id = $1 AND target_character_id = $2 AND status = $3',
            [proposerCharacter.id, targetCharacter.id, 'pending']
        );

        if (existingProposal.rows.length > 0) {
            throw new Error('You already have a pending proposal to this user.');
        }

        // Create proposal
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        const result = await Database.query(`
            INSERT INTO marriage_proposals (
                proposer_character_id, target_character_id, proposal_type, message, expires_at
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [proposerCharacter.id, targetCharacter.id, type, message, expiresAt.toISOString()]);

        return {
            proposalId: result.rows[0].id,
            expiresAt: expiresAt.toISOString()
        };
    }

    /**
     * Accept a marriage proposal
     */
    async acceptMarriageProposal(accepterId, proposalId) {
        // Get the proposal
        const proposal = await Database.query(
            'SELECT * FROM marriage_proposals WHERE id = $1 AND status = $2',
            [proposalId, 'pending']
        );

        if (proposal.rows.length === 0) {
            throw new Error('Proposal not found or already processed.');
        }

        const prop = proposal.rows[0];

        // Check if the accepter is the target
        const accepterCharacter = await FactionManager.getCurrentCharacter(accepterId);
        if (!accepterCharacter || accepterCharacter.id !== prop.target_character_id) {
            throw new Error('You are not the target of this proposal.');
        }

        // Check if proposal has expired
        if (new Date() > new Date(prop.expires_at)) {
            throw new Error('This proposal has expired.');
        }

        // Create marriage
        const marriageResult = await Database.query(`
            INSERT INTO marriages (marriage_type, status) VALUES ($1, $2)
            RETURNING id
        `, [prop.proposal_type, 'active']);

        const marriageId = marriageResult.rows[0].id;

        // Add participants
        await Database.query(`
            INSERT INTO marriage_participants (marriage_id, character_id, role)
            VALUES ($1, $2, $3)
        `, [marriageId, prop.proposer_character_id, 'spouse']);

        await Database.query(`
            INSERT INTO marriage_participants (marriage_id, character_id, role)
            VALUES ($1, $2, $3)
        `, [marriageId, prop.target_character_id, 'spouse']);

        // Create affection relationship
        await Database.query(`
            INSERT INTO relationship_affection (marriage_id, character_1, character_2, affection_points)
            VALUES ($1, $2, $3, $4)
        `, [marriageId, prop.proposer_character_id, prop.target_character_id, 50]); // Start with 50 affection

        // Update proposal status
        await Database.query(
            'UPDATE marriage_proposals SET status = $1, responded_at = $2 WHERE id = $3',
            ['accepted', new Date().toISOString(), proposalId]
        );

        // Get spouse information
        const spouses = await Database.query(`
            SELECT pc.discord_id, pc.character_name
            FROM marriage_participants mp
            JOIN player_characters pc ON mp.character_id = pc.id
            WHERE mp.marriage_id = $1
        `, [marriageId]);

        return {
            marriageId,
            marriageType: prop.proposal_type,
            spouses: spouses.rows.map(s => ({
                discordId: s.discord_id,
                characterName: s.character_name
            }))
        };
    }

    /**
     * Reject a marriage proposal
     */
    async rejectMarriageProposal(rejecterId, proposalId) {
        // Get the proposal
        const proposal = await Database.query(
            'SELECT * FROM marriage_proposals WHERE id = $1 AND status = $2',
            [proposalId, 'pending']
        );

        if (proposal.rows.length === 0) {
            throw new Error('Proposal not found or already processed.');
        }

        const prop = proposal.rows[0];

        // Check if the rejecter is the target
        const rejecterCharacter = await FactionManager.getCurrentCharacter(rejecterId);
        if (!rejecterCharacter || rejecterCharacter.id !== prop.target_character_id) {
            throw new Error('You are not the target of this proposal.');
        }

        // Update proposal status
        await Database.query(
            'UPDATE marriage_proposals SET status = $1, responded_at = $2 WHERE id = $3',
            ['rejected', new Date().toISOString(), proposalId]
        );
    }

    /**
     * Get marriage status for a user
     */
    async getMarriageStatus(userId) {
        const result = await Database.query(`
            SELECT m.*, mp.character_id
            FROM marriages m
            JOIN marriage_participants mp ON m.id = mp.marriage_id
            JOIN player_characters pc ON mp.character_id = pc.id
            WHERE pc.discord_id = $1 AND m.status = $2
        `, [userId, 'active']);

        if (result.rows.length === 0) {
            return null;
        }

        const marriage = result.rows[0];

        // Get all spouses
        const spouses = await Database.query(`
            SELECT pc.discord_id, pc.character_name
            FROM marriage_participants mp
            JOIN player_characters pc ON mp.character_id = pc.id
            WHERE mp.marriage_id = $1
        `, [marriage.id]);

        // Get affection points
        const affectionPoints = await Database.query(`
            SELECT ra.affection_points, ra.last_interaction, ra.total_interactions,
                   pc.character_name as partner_name
            FROM relationship_affection ra
            JOIN player_characters pc ON ra.character_2 = pc.id
            WHERE ra.marriage_id = $1 AND ra.character_1 = $2
        `, [marriage.id, marriage.character_id]);

        return {
            id: marriage.id,
            marriageType: marriage.marriage_type,
            status: marriage.status,
            marriedAt: marriage.married_at,
            spouses: spouses.rows.map(s => ({
                discordId: s.discord_id,
                characterName: s.character_name
            })),
            affectionPoints: affectionPoints.rows.map(ap => ({
                partnerName: ap.partner_name,
                affectionPoints: ap.affection_points,
                lastInteraction: ap.last_interaction,
                totalInteractions: ap.total_interactions
            }))
        };
    }

    /**
     * Get pending proposals for a user
     */
    async getPendingProposals(userId) {
        const character = await FactionManager.getCurrentCharacter(userId);
        if (!character) {
            return [];
        }

        const result = await Database.query(`
            SELECT mp.*, pc.discord_id as proposer_discord_id, pc.character_name as proposer_name
            FROM marriage_proposals mp
            JOIN player_characters pc ON mp.proposer_character_id = pc.id
            WHERE mp.target_character_id = $1 AND mp.status = $2
        `, [character.id, 'pending']);

        return result.rows.map(proposal => ({
            id: proposal.id,
            proposerDiscordId: proposal.proposer_discord_id,
            proposerName: proposal.proposer_name,
            proposalType: proposal.proposal_type,
            message: proposal.message,
            proposedAt: proposal.proposed_at,
            expiresAt: proposal.expires_at
        }));
    }

    /**
     * Divorce
     */
    async divorce(userId, reason = '') {
        const marriage = await this.getMarriageStatus(userId);
        if (!marriage) {
            throw new Error('You are not currently married.');
        }

        const divorceCost = 1000; // Base divorce cost

        // Check if user has enough currency
        const resources = await FactionManager.getFactionResources(userId);
        if (resources.currency < divorceCost) {
            throw new Error(`You need ${divorceCost} currency to divorce. You have ${resources.currency}.`);
        }

        // Deduct divorce cost
        await Database.query(
            'UPDATE faction_resources SET currency = currency - $1 WHERE discord_id = $2',
            [divorceCost, userId]
        );

        // Update marriage status
        await Database.query(
            'UPDATE marriages SET status = $1, divorced_at = $2, divorce_cost = $3 WHERE id = $4',
            ['divorced', new Date().toISOString(), divorceCost, marriage.id]
        );

        return {
            divorceCost,
            reason
        };
    }

    /**
     * Get affection data for a user
     */
    async getAffectionData(userId) {
        const character = await FactionManager.getCurrentCharacter(userId);
        if (!character) {
            return [];
        }

        const result = await Database.query(`
            SELECT ra.affection_points, ra.last_interaction, ra.total_interactions,
                   pc.character_name as partner_name
            FROM relationship_affection ra
            JOIN player_characters pc ON ra.character_2 = pc.id
            JOIN marriages m ON ra.marriage_id = m.id
            WHERE ra.character_1 = $1 AND m.status = $2
        `, [character.id, 'active']);

        return result.rows.map(rel => ({
            partnerName: rel.partner_name,
            affectionPoints: rel.affection_points,
            lastInteraction: rel.last_interaction,
            totalInteractions: rel.total_interactions
        }));
    }

    /**
     * Add affection interaction
     */
    async addAffectionInteraction(userId, partnerId, activity, message = '') {
        const character = await FactionManager.getCurrentCharacter(userId);
        if (!character) {
            throw new Error('You must have a character to interact.');
        }

        const partnerCharacter = await FactionManager.getCurrentCharacter(partnerId);
        if (!partnerCharacter) {
            throw new Error('Partner must have a character.');
        }

        // Check if they are married
        const marriage = await this.getMarriageStatus(userId);
        if (!marriage) {
            throw new Error('You must be married to interact with affection.');
        }

        // Check if partner is in the marriage
        const isPartnerInMarriage = marriage.spouses.some(s => s.discordId === parseInt(partnerId));
        if (!isPartnerInMarriage) {
            throw new Error('You can only interact with your spouse(s).');
        }

        // Check if user has enough resources
        const cost = this.affectionCosts[activity] || 0;
        if (cost > 0) {
            const resources = await FactionManager.getFactionResources(userId);
            if (resources.currency < cost) {
                throw new Error(`You need ${cost} currency for this activity. You have ${resources.currency}.`);
            }
        }

        // Deduct cost
        if (cost > 0) {
            await Database.query(
                'UPDATE faction_resources SET currency = currency - $1 WHERE discord_id = $2',
                [cost, userId]
            );
        }

        // Get affection gain
        const affectionGain = this.affectionGains[activity] || 0;

        // Update affection points
        await Database.query(`
            UPDATE relationship_affection 
            SET affection_points = affection_points + $1,
                last_interaction = $2,
                total_interactions = total_interactions + 1,
                interaction_history = json_insert(interaction_history, '$[#]', json_object('type', $3, 'timestamp', $2, 'message', $4))
            WHERE character_1 = $5 AND character_2 = $6
        `, [affectionGain, new Date().toISOString(), activity, message, character.id, partnerCharacter.id]);

        // Log family interaction
        await Database.query(`
            INSERT INTO family_interactions (
                marriage_id, interaction_type, participants, interaction_data, affection_gained, resources_spent
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            marriage.id,
            activity,
            JSON.stringify([character.id, partnerCharacter.id]),
            JSON.stringify({ message }),
            affectionGain,
            cost
        ]);

        // Get updated affection points
        const updatedAffection = await Database.query(
            'SELECT affection_points FROM relationship_affection WHERE character_1 = $1 AND character_2 = $2',
            [character.id, partnerCharacter.id]
        );

        return {
            affectionGained: affectionGain,
            totalAffection: updatedAffection.rows[0].affection_points,
            resourcesSpent: cost
        };
    }

    /**
     * Get interaction history
     */
    async getInteractionHistory(userId, partnerId) {
        const character = await FactionManager.getCurrentCharacter(userId);
        if (!character) {
            return [];
        }

        const partnerCharacter = await FactionManager.getCurrentCharacter(partnerId);
        if (!partnerCharacter) {
            return [];
        }

        const result = await Database.query(`
            SELECT fi.interaction_type, fi.affection_gained, fi.resources_spent, fi.occurred_at,
                   fi.interaction_data
            FROM family_interactions fi
            JOIN marriages m ON fi.marriage_id = m.id
            WHERE fi.participants LIKE $1 AND fi.participants LIKE $2 AND m.status = $3
            ORDER BY fi.occurred_at DESC
        `, [`%${character.id}%`, `%${partnerCharacter.id}%`, 'active']);

        return result.rows.map(interaction => ({
            interactionType: interaction.interaction_type,
            affectionGained: interaction.affection_gained,
            resourcesSpent: interaction.resources_spent,
            occurredAt: interaction.occurred_at,
            message: interaction.interaction_data ? JSON.parse(interaction.interaction_data).message : null
        }));
    }

    /**
     * Attempt conception
     */
    async attemptConception(userId, partnerId, method = 'natural') {
        const character = await FactionManager.getCurrentCharacter(userId);
        if (!character) {
            throw new Error('You must have a character to attempt conception.');
        }

        const partnerCharacter = await FactionManager.getCurrentCharacter(partnerId);
        if (!partnerCharacter) {
            throw new Error('Partner must have a character.');
        }

        // Check if they are married
        const marriage = await this.getMarriageStatus(userId);
        if (!marriage) {
            throw new Error('You must be married to attempt conception.');
        }

        // Check if partner is in the marriage
        const isPartnerInMarriage = marriage.spouses.some(s => s.discordId === parseInt(partnerId));
        if (!isPartnerInMarriage) {
            throw new Error('You can only attempt conception with your spouse(s).');
        }

        // Get current affection points
        const affectionData = await this.getAffectionData(userId);
        const partnerAffection = affectionData.find(a => a.partnerName === partnerCharacter.character_name);
        const currentAffection = partnerAffection ? partnerAffection.affectionPoints : 0;

        const requiredAffection = this.conceptionRequirements[method] || 100;

        if (currentAffection < requiredAffection) {
            return {
                success: false,
                currentAffection,
                requiredAffection,
                method
            };
        }

        // Create child
        const gestationDays = Math.floor(Math.random() * 30) + 270; // 270-300 days
        const birthDate = new Date();
        birthDate.setDate(birthDate.getDate() + gestationDays);

        // Determine faction at birth (simplified - could be more complex)
        const factions = ['Human', 'AI', 'Nature'];
        const factionAtBirth = factions[Math.floor(Math.random() * factions.length)];

        const childResult = await Database.query(`
            INSERT INTO children (
                conception_method, conception_date, birth_date, faction_at_birth,
                hybrid_composition, gestation_complete
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [
            method,
            new Date().toISOString(),
            birthDate.toISOString(),
            factionAtBirth,
            JSON.stringify({ [character.current_faction]: 0.5, [partnerCharacter.current_faction]: 0.5 }),
            false
        ]);

        return {
            success: true,
            childId: childResult.rows[0].id,
            gestationDays,
            factionAtBirth,
            currentAffection,
            requiredAffection
        };
    }

    /**
     * Provide child care
     */
    async provideChildCare(userId, childId, activity, quality = 5) {
        const character = await FactionManager.getCurrentCharacter(userId);
        if (!character) {
            throw new Error('You must have a character to provide care.');
        }

        // Check if child exists and belongs to user
        const child = await Database.query(
            'SELECT * FROM children WHERE id = $1',
            [childId]
        );

        if (child.rows.length === 0) {
            throw new Error('Child not found.');
        }

        const childData = child.rows[0];

        // Check if child is born
        if (!childData.gestation_complete) {
            throw new Error('Child is not yet born.');
        }

        // Check if user is parent (simplified check)
        const marriage = await this.getMarriageStatus(userId);
        if (!marriage) {
            throw new Error('You must be married to care for children.');
        }

        // Get care activity data
        const careData = this.careActivities[activity];
        if (!careData) {
            throw new Error('Invalid care activity.');
        }

        // Check if user has enough resources
        const cost = careData.cost * quality;
        if (cost > 0) {
            const resources = await FactionManager.getFactionResources(userId);
            if (resources.currency < cost) {
                throw new Error(`You need ${cost} currency for this care activity. You have ${resources.currency}.`);
            }
        }

        // Deduct cost
        if (cost > 0) {
            await Database.query(
                'UPDATE faction_resources SET currency = currency - $1 WHERE discord_id = $2',
                [cost, userId]
            );
        }

        // Calculate development impact
        const developmentImpact = Math.floor(careData.development * (quality / 10));

        // Update child development
        await Database.query(`
            UPDATE children 
            SET development_score = development_score + $1,
                daily_care_streak = daily_care_streak + 1,
                total_resources_invested = total_resources_invested + $2
            WHERE id = $3
        `, [developmentImpact, cost, childId]);

        // Log care activity
        await Database.query(`
            INSERT INTO child_care_activities (
                child_id, caregiver_character_id, activity_type, care_quality, resources_spent, development_impact
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [childId, character.id, activity, quality, cost, developmentImpact]);

        // Get updated care streak
        const updatedChild = await Database.query(
            'SELECT daily_care_streak FROM children WHERE id = $1',
            [childId]
        );

        return {
            developmentImpact,
            careStreak: updatedChild.rows[0].daily_care_streak,
            resourcesSpent: cost
        };
    }

    /**
     * Get child status
     */
    async getChildStatus(userId, childId) {
        const child = await Database.query(
            'SELECT * FROM children WHERE id = $1',
            [childId]
        );

        if (child.rows.length === 0) {
            throw new Error('Child not found.');
        }

        const childData = child.rows[0];

        // Calculate gestation progress if not born
        let gestationProgress = 100;
        if (!childData.gestation_complete) {
            const conceptionDate = new Date(childData.conception_date);
            const birthDate = new Date(childData.birth_date);
            const now = new Date();
            const totalGestation = birthDate.getTime() - conceptionDate.getTime();
            const elapsed = now.getTime() - conceptionDate.getTime();
            gestationProgress = Math.min(Math.max((elapsed / totalGestation) * 100, 0), 100);
        }

        return {
            id: childData.id,
            gestationComplete: childData.gestation_complete,
            conceptionDate: childData.conception_date,
            birthDate: childData.birth_date,
            factionAtBirth: childData.faction_at_birth,
            developmentScore: childData.development_score,
            dailyCareStreak: childData.daily_care_streak,
            neglectCount: childData.neglect_count,
            riskOfDeath: childData.risk_of_death,
            intelligence: childData.intelligence,
            creativity: childData.creativity,
            resilience: childData.resilience,
            socialSkill: childData.social_skill,
            gestationProgress
        };
    }

    /**
     * Get user's children
     */
    async getUserChildren(userId) {
        const character = await FactionManager.getCurrentCharacter(userId);
        if (!character) {
            return [];
        }

        const result = await Database.query(
            'SELECT * FROM children ORDER BY created_at DESC',
            []
        );

        // Filter children that belong to user's marriages
        const marriage = await this.getMarriageStatus(userId);
        if (!marriage) {
            return [];
        }

        // For now, return all children (in a real implementation, you'd filter by marriage)
        return result.rows.map(child => ({
            id: child.id,
            gestationComplete: child.gestation_complete,
            factionAtBirth: child.faction_at_birth,
            developmentScore: child.development_score,
            dailyCareStreak: child.daily_care_streak,
            neglectCount: child.neglect_count,
            riskOfDeath: child.risk_of_death
        }));
    }

    /**
     * Switch to child character
     */
    async switchToChild(userId, childId) {
        const character = await FactionManager.getCurrentCharacter(userId);
        if (!character) {
            throw new Error('You must have a character to switch.');
        }

        // Check if child exists and is born
        const child = await Database.query(
            'SELECT * FROM children WHERE id = $1 AND gestation_complete = $2',
            [childId, true]
        );

        if (child.rows.length === 0) {
            throw new Error('Child not found or not yet born.');
        }

        const childData = child.rows[0];

        // Check if child is already switched to
        if (childData.switched_to) {
            throw new Error('This child has already been switched to.');
        }

        // Create new character for the child
        const childCharacterResult = await Database.query(`
            INSERT INTO player_characters (
                discord_id, original_creator, character_name, birth_faction, current_faction,
                parent_1, parent_2, is_active, is_alive, age_years, life_stage
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            userId,
            character.original_creator, // Keep original creator
            `Child of ${character.character_name}`,
            childData.faction_at_birth,
            childData.faction_at_birth,
            character.id, // Parent 1
            null, // Parent 2 (could be partner)
            true,
            true,
            18, // Start as adult
            'adult'
        ]);

        const childCharacterId = childCharacterResult.rows[0].id;

        // Update child record
        await Database.query(
            'UPDATE children SET character_id = $1, switched_to = $2, switched_at = $3 WHERE id = $4',
            [childCharacterId, true, new Date().toISOString(), childId]
        );

        // Deactivate current character
        await Database.query(
            'UPDATE player_characters SET is_active = $1 WHERE id = $2',
            [false, character.id]
        );

        // Update faction information
        await Database.query(
            'UPDATE player_factions SET current_faction = $1, faction_purity = $2, updated_at = $3 WHERE discord_id = $4',
            [childData.faction_at_birth, 1.00, new Date().toISOString(), userId]
        );

        return {
            characterId: childCharacterId,
            characterName: `Child of ${character.character_name}`,
            faction: childData.faction_at_birth,
            age: 18,
            lifeStage: 'adult'
        };
    }
}

module.exports = new FamilyManager();

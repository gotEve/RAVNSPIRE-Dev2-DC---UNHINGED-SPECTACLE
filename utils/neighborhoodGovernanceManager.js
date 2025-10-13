const Database = require('../database/db');

class NeighborhoodGovernanceManager {
    constructor() {
        this.proposalTypes = {
            'building': 'Community building construction or modification',
            'policy': 'Neighborhood policy changes',
            'event': 'Community events and activities',
            'defense': 'Defense system improvements',
            'tax': 'Tax rate adjustments',
            'amenity': 'New amenities or services'
        };
        
        this.votingPeriods = {
            'building': 7, // 7 days
            'policy': 5,   // 5 days
            'event': 3,    // 3 days
            'defense': 2,  // 2 days
            'tax': 10,     // 10 days
            'amenity': 7   // 7 days
        };
    }

    /**
     * Create a new neighborhood proposal
     */
    async createProposal(neighborhoodId, proposerGuildId, title, description, proposalType, proposalData = null) {
        try {
            if (!this.proposalTypes[proposalType]) {
                throw new Error(`Invalid proposal type: ${proposalType}`);
            }

            const votingPeriod = this.votingPeriods[proposalType];
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + votingPeriod);

            const result = await Database.query(`
                INSERT INTO neighborhood_proposals (
                    neighborhood_id, proposer_guild_id, title, description,
                    proposal_type, proposal_data, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [neighborhoodId, proposerGuildId, title, description, proposalType, proposalData, expiresAt.toISOString()]);

            return {
                success: true,
                proposalId: result.lastID,
                expiresAt: expiresAt.toISOString(),
                votingPeriod: votingPeriod
            };

        } catch (error) {
            console.error('Error creating proposal:', error);
            throw error;
        }
    }

    /**
     * Cast a vote on a proposal
     */
    async castVote(proposalId, guildId, voteType) {
        try {
            if (!['for', 'against'].includes(voteType)) {
                throw new Error('Vote type must be "for" or "against"');
            }

            // Check if proposal exists and is active
            const proposal = await Database.query(`
                SELECT * FROM neighborhood_proposals 
                WHERE id = ? AND status = 'active' AND expires_at > datetime('now')
            `, [proposalId]);

            if (proposal.rows.length === 0) {
                throw new Error('Proposal not found, not active, or has expired');
            }

            // Check if guild has already voted
            const existingVote = await Database.query(`
                SELECT * FROM neighborhood_votes 
                WHERE proposal_id = ? AND guild_id = ?
            `, [proposalId, guildId]);

            if (existingVote.rows.length > 0) {
                throw new Error('Guild has already voted on this proposal');
            }

            // Cast the vote
            await Database.query(`
                INSERT INTO neighborhood_votes (proposal_id, guild_id, vote_type)
                VALUES (?, ?, ?)
            `, [proposalId, guildId, voteType]);

            // Update vote counts
            await this.updateVoteCounts(proposalId);

            return {
                success: true,
                proposalId: proposalId,
                guildId: guildId,
                voteType: voteType
            };

        } catch (error) {
            console.error('Error casting vote:', error);
            throw error;
        }
    }

    /**
     * Update vote counts for a proposal
     */
    async updateVoteCounts(proposalId) {
        try {
            const votes = await Database.query(`
                SELECT vote_type, COUNT(*) as count
                FROM neighborhood_votes 
                WHERE proposal_id = ?
                GROUP BY vote_type
            `, [proposalId]);

            let votesFor = 0;
            let votesAgainst = 0;

            votes.rows.forEach(vote => {
                if (vote.vote_type === 'for') {
                    votesFor = vote.count;
                } else if (vote.vote_type === 'against') {
                    votesAgainst = vote.count;
                }
            });

            await Database.query(`
                UPDATE neighborhood_proposals 
                SET votes_for = ?, votes_against = ?
                WHERE id = ?
            `, [votesFor, votesAgainst, proposalId]);

            return { votesFor, votesAgainst };

        } catch (error) {
            console.error('Error updating vote counts:', error);
            throw error;
        }
    }

    /**
     * Get active proposals for a neighborhood
     */
    async getActiveProposals(neighborhoodId) {
        try {
            const result = await Database.query(`
                SELECT np.*, g.name as proposer_guild_name,
                       (SELECT COUNT(*) FROM neighborhood_votes nv WHERE nv.proposal_id = np.id) as total_votes
                FROM neighborhood_proposals np
                LEFT JOIN guilds g ON np.proposer_guild_id = g.id
                WHERE np.neighborhood_id = ? AND np.status = 'active' AND np.expires_at > datetime('now')
                ORDER BY np.created_at DESC
            `, [neighborhoodId]);

            return result.rows;

        } catch (error) {
            console.error('Error getting active proposals:', error);
            throw error;
        }
    }

    /**
     * Get all proposals for a neighborhood (including completed)
     */
    async getAllProposals(neighborhoodId, limit = 20) {
        try {
            const result = await Database.query(`
                SELECT np.*, g.name as proposer_guild_name,
                       (SELECT COUNT(*) FROM neighborhood_votes nv WHERE nv.proposal_id = np.id) as total_votes
                FROM neighborhood_proposals np
                LEFT JOIN guilds g ON np.proposer_guild_id = g.id
                WHERE np.neighborhood_id = ?
                ORDER BY np.created_at DESC
                LIMIT ?
            `, [neighborhoodId, limit]);

            return result.rows;

        } catch (error) {
            console.error('Error getting all proposals:', error);
            throw error;
        }
    }

    /**
     * Get proposal details with votes
     */
    async getProposalDetails(proposalId) {
        try {
            const proposal = await Database.query(`
                SELECT np.*, g.name as proposer_guild_name, n.name as neighborhood_name
                FROM neighborhood_proposals np
                LEFT JOIN guilds g ON np.proposer_guild_id = g.id
                LEFT JOIN neighborhoods n ON np.neighborhood_id = n.id
                WHERE np.id = ?
            `, [proposalId]);

            if (proposal.rows.length === 0) {
                throw new Error('Proposal not found');
            }

            const votes = await Database.query(`
                SELECT nv.*, g.name as guild_name
                FROM neighborhood_votes nv
                LEFT JOIN guilds g ON nv.guild_id = g.id
                WHERE nv.proposal_id = ?
                ORDER BY nv.voted_at
            `, [proposalId]);

            return {
                ...proposal.rows[0],
                votes: votes.rows
            };

        } catch (error) {
            console.error('Error getting proposal details:', error);
            throw error;
        }
    }

    /**
     * Check if a guild has voted on a proposal
     */
    async hasGuildVoted(proposalId, guildId) {
        try {
            const result = await Database.query(`
                SELECT * FROM neighborhood_votes 
                WHERE proposal_id = ? AND guild_id = ?
            `, [proposalId, guildId]);

            return result.rows.length > 0;

        } catch (error) {
            console.error('Error checking guild vote:', error);
            throw error;
        }
    }

    /**
     * Get guilds eligible to vote in a neighborhood
     */
    async getEligibleVoters(neighborhoodId) {
        try {
            const result = await Database.query(`
                SELECT DISTINCT g.id, g.name, g.level
                FROM guilds g
                JOIN neighborhood_plots np ON g.id = np.guild_id
                WHERE np.neighborhood_id = ?
                ORDER BY g.name
            `, [neighborhoodId]);

            return result.rows;

        } catch (error) {
            console.error('Error getting eligible voters:', error);
            throw error;
        }
    }

    /**
     * Process expired proposals
     */
    async processExpiredProposals() {
        try {
            const expiredProposals = await Database.query(`
                SELECT * FROM neighborhood_proposals 
                WHERE status = 'active' AND expires_at <= datetime('now')
            `);

            const results = [];

            for (const proposal of expiredProposals.rows) {
                const voteCounts = await this.updateVoteCounts(proposal.id);
                
                let status = 'rejected';
                if (voteCounts.votesFor > voteCounts.votesAgainst) {
                    status = 'passed';
                    // Enact the proposal
                    await this.enactProposal(proposal);
                }

                await Database.query(`
                    UPDATE neighborhood_proposals 
                    SET status = ?
                    WHERE id = ?
                `, [status, proposal.id]);

                results.push({
                    proposalId: proposal.id,
                    status: status,
                    votesFor: voteCounts.votesFor,
                    votesAgainst: voteCounts.votesAgainst
                });
            }

            return results;

        } catch (error) {
            console.error('Error processing expired proposals:', error);
            throw error;
        }
    }

    /**
     * Enact a passed proposal
     */
    async enactProposal(proposal) {
        try {
            const proposalData = proposal.proposal_data ? JSON.parse(proposal.proposal_data) : {};

            switch (proposal.proposal_type) {
                case 'building':
                    await this.enactBuildingProposal(proposal.neighborhood_id, proposalData);
                    break;
                case 'policy':
                    await this.enactPolicyProposal(proposal.neighborhood_id, proposalData);
                    break;
                case 'event':
                    await this.enactEventProposal(proposal.neighborhood_id, proposalData);
                    break;
                case 'defense':
                    await this.enactDefenseProposal(proposal.neighborhood_id, proposalData);
                    break;
                case 'tax':
                    await this.enactTaxProposal(proposal.neighborhood_id, proposalData);
                    break;
                case 'amenity':
                    await this.enactAmenityProposal(proposal.neighborhood_id, proposalData);
                    break;
            }

            await Database.query(`
                UPDATE neighborhood_proposals 
                SET enacted_at = datetime('now')
                WHERE id = ?
            `, [proposal.id]);

        } catch (error) {
            console.error('Error enacting proposal:', error);
            throw error;
        }
    }

    /**
     * Enact building proposal
     */
    async enactBuildingProposal(neighborhoodId, proposalData) {
        // Implementation for building construction
        console.log(`Enacting building proposal for neighborhood ${neighborhoodId}:`, proposalData);
    }

    /**
     * Enact policy proposal
     */
    async enactPolicyProposal(neighborhoodId, proposalData) {
        // Add to neighborhood rules
        await Database.query(`
            INSERT INTO neighborhood_rules (neighborhood_id, rule_type, rule_value, enacted_by)
            VALUES (?, ?, ?, ?)
        `, [neighborhoodId, proposalData.ruleType, proposalData.ruleValue, proposalData.enactedBy]);
    }

    /**
     * Enact event proposal
     */
    async enactEventProposal(neighborhoodId, proposalData) {
        // Implementation for community events
        console.log(`Enacting event proposal for neighborhood ${neighborhoodId}:`, proposalData);
    }

    /**
     * Enact defense proposal
     */
    async enactDefenseProposal(neighborhoodId, proposalData) {
        // Update neighborhood defense level
        await Database.query(`
            UPDATE neighborhoods 
            SET defense_level = defense_level + ?
            WHERE id = ?
        `, [proposalData.defenseIncrease || 1, neighborhoodId]);
    }

    /**
     * Enact tax proposal
     */
    async enactTaxProposal(neighborhoodId, proposalData) {
        // Implementation for tax changes
        console.log(`Enacting tax proposal for neighborhood ${neighborhoodId}:`, proposalData);
    }

    /**
     * Enact amenity proposal
     */
    async enactAmenityProposal(neighborhoodId, proposalData) {
        // Implementation for new amenities
        console.log(`Enacting amenity proposal for neighborhood ${neighborhoodId}:`, proposalData);
    }

    /**
     * Get neighborhood rules
     */
    async getNeighborhoodRules(neighborhoodId) {
        try {
            const result = await Database.query(`
                SELECT nr.*, g.name as enacted_by_guild
                FROM neighborhood_rules nr
                LEFT JOIN guilds g ON nr.enacted_by = g.id
                WHERE nr.neighborhood_id = ?
                ORDER BY nr.enacted_at DESC
            `, [neighborhoodId]);

            return result.rows;

        } catch (error) {
            console.error('Error getting neighborhood rules:', error);
            throw error;
        }
    }

    /**
     * Get proposal statistics for a neighborhood
     */
    async getProposalStats(neighborhoodId) {
        try {
            const stats = await Database.query(`
                SELECT 
                    COUNT(*) as total_proposals,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_proposals,
                    COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed_proposals,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_proposals,
                    AVG(votes_for + votes_against) as avg_participation
                FROM neighborhood_proposals 
                WHERE neighborhood_id = ?
            `, [neighborhoodId]);

            return stats.rows[0];

        } catch (error) {
            console.error('Error getting proposal stats:', error);
            throw error;
        }
    }
}

module.exports = new NeighborhoodGovernanceManager();

const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('neighborhood-vote')
        .setDescription('Vote on neighborhood proposals')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new neighborhood proposal')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Proposal title')
                        .setRequired(true)
                        .setMaxLength(200))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Proposal description')
                        .setRequired(true)
                        .setMaxLength(1000))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Proposal type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Building', value: 'building' },
                            { name: 'Policy', value: 'policy' },
                            { name: 'Event', value: 'event' },
                            { name: 'Defense', value: 'defense' }
                        ))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Voting duration in hours (1-168)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(168)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List active proposals')
                .addStringOption(option =>
                    option.setName('neighborhood')
                        .setDescription('Neighborhood to view proposals for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cast')
                .setDescription('Cast your vote on a proposal')
                .addIntegerOption(option =>
                    option.setName('proposal_id')
                        .setDescription('ID of the proposal to vote on')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('vote')
                        .setDescription('Your vote')
                        .setRequired(true)
                        .addChoices(
                            { name: 'For', value: 'for' },
                            { name: 'Against', value: 'against' }
                        ))),
    cooldown: 10,
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            if (subcommand === 'create') {
                await this.createProposal(interaction);
            } else if (subcommand === 'list') {
                await this.listProposals(interaction);
            } else if (subcommand === 'cast') {
                await this.castVote(interaction);
            }

        } catch (error) {
            console.error('Error in neighborhood-vote command:', error);
            await interaction.reply({
                content: 'There was an error processing your request.',
                ephemeral: true
            });
        }
    },

    async createProposal(interaction) {
        const userId = interaction.user.id;
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const type = interaction.options.getString('type');
        const duration = interaction.options.getInteger('duration') || 24; // Default 24 hours

        // Check if user is in a guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to create proposals.',
                ephemeral: true
            });
        }

        // Check if user has permission (owner or officer)
        if (userGuild.role !== 'owner' && userGuild.role !== 'officer') {
            return await interaction.reply({
                content: 'Only guild owners and officers can create proposals.',
                ephemeral: true
            });
        }

        // Check if guild is in a neighborhood
        const neighborhoodQuery = `
            SELECT n.* FROM neighborhoods n
            JOIN neighborhood_plots np ON n.id = np.neighborhood_id
            WHERE np.guild_id = $1
        `;
        const neighborhoodResult = await Database.query(neighborhoodQuery, [userGuild.id]);
        const neighborhood = neighborhoodResult.rows[0];

        if (!neighborhood) {
            return await interaction.reply({
                content: 'Your guild must be in a neighborhood to create proposals.',
                ephemeral: true
            });
        }

        // Create proposal
        const endTime = new Date(Date.now() + (duration * 60 * 60 * 1000));
        
        const proposalQuery = `
            INSERT INTO neighborhood_proposals (
                neighborhood_id, proposer_guild_id, title, description, 
                proposal_type, end_time
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const proposalResult = await Database.query(proposalQuery, [
            neighborhood.id, userGuild.id, title, description, type, endTime
        ]);
        const proposal = proposalResult.rows[0];

        const embed = EmbedBuilderUtil.createSuccessEmbed(
            'Proposal Created!',
            `Your proposal has been submitted for voting.`
        );

        embed.addFields(
            { name: 'Title', value: title, inline: false },
            { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
            { name: 'Duration', value: `${duration} hours`, inline: true },
            { name: 'Proposal ID', value: proposal.id.toString(), inline: true },
            { name: 'Description', value: description, inline: false }
        );

        embed.addFields({
            name: 'Voting',
            value: `Voting ends <t:${Math.floor(endTime.getTime() / 1000)}:R>\nUse \`/neighborhood-vote cast proposal_id:${proposal.id}\` to vote!`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async listProposals(interaction) {
        const userId = interaction.user.id;
        const neighborhoodName = interaction.options.getString('neighborhood');

        let neighborhood;
        
        if (neighborhoodName) {
            // View specific neighborhood proposals
            const query = 'SELECT * FROM neighborhoods WHERE name = $1';
            const result = await Database.query(query, [neighborhoodName]);
            neighborhood = result.rows[0];
            
            if (!neighborhood) {
                return await interaction.reply({
                    content: 'Neighborhood not found.',
                    ephemeral: true
                });
            }
        } else {
            // View user's neighborhood proposals
            const userGuild = await Database.getUserGuild(userId);
            if (!userGuild) {
                return await interaction.reply({
                    content: 'You must be a member of a guild to view proposals.',
                    ephemeral: true
                });
            }

            const neighborhoodQuery = `
                SELECT n.* FROM neighborhoods n
                JOIN neighborhood_plots np ON n.id = np.neighborhood_id
                WHERE np.guild_id = $1
            `;
            const neighborhoodResult = await Database.query(neighborhoodQuery, [userGuild.id]);
            neighborhood = neighborhoodResult.rows[0];

            if (!neighborhood) {
                return await interaction.reply({
                    content: 'Your guild is not in a neighborhood.',
                    ephemeral: true
                });
            }
        }

        // Get active proposals
        const proposalsQuery = `
            SELECT np.*, g.name as proposer_guild
            FROM neighborhood_proposals np
            JOIN guilds g ON np.proposer_guild_id = g.id
            WHERE np.neighborhood_id = $1 AND np.status = 'active'
            ORDER BY np.created_at DESC
        `;
        const proposalsResult = await Database.query(proposalsQuery, [neighborhood.id]);
        const proposals = proposalsResult.rows;

        if (proposals.length === 0) {
            const embed = EmbedBuilderUtil.createInfoEmbed(
                'No Active Proposals',
                `There are no active proposals in **${neighborhood.name}**.`
            );
            return await interaction.reply({ embeds: [embed] });
        }

        const embed = EmbedBuilderUtil.createBaseEmbed(
            `🗳️ Active Proposals - ${neighborhood.name}`,
            `Vote on proposals to shape your neighborhood's future!`
        );

        proposals.forEach(proposal => {
            const endTime = new Date(proposal.end_time);
            const timeLeft = endTime.getTime() - Date.now();
            const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
            
            embed.addFields({
                name: `#${proposal.id} - ${proposal.title}`,
                value: `**Type:** ${proposal.proposal_type}\n**Proposed by:** ${proposal.proposer_guild}\n**Votes:** ${proposal.votes_for} for, ${proposal.votes_against} against\n**Time left:** ${hoursLeft} hours\n**Description:** ${proposal.description.substring(0, 200)}${proposal.description.length > 200 ? '...' : ''}`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    },

    async castVote(interaction) {
        const userId = interaction.user.id;
        const proposalId = interaction.options.getInteger('proposal_id');
        const vote = interaction.options.getString('vote');

        // Check if user is in a guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to vote.',
                ephemeral: true
            });
        }

        // Get proposal
        const proposalQuery = `
            SELECT np.*, n.name as neighborhood_name
            FROM neighborhood_proposals np
            JOIN neighborhoods n ON np.neighborhood_id = n.id
            WHERE np.id = $1
        `;
        const proposalResult = await Database.query(proposalQuery, [proposalId]);
        const proposal = proposalResult.rows[0];

        if (!proposal) {
            return await interaction.reply({
                content: 'Proposal not found.',
                ephemeral: true
            });
        }

        // Check if proposal is still active
        if (proposal.status !== 'active') {
            return await interaction.reply({
                content: 'This proposal is no longer active.',
                ephemeral: true
            });
        }

        // Check if voting period has ended
        if (new Date() > new Date(proposal.end_time)) {
            return await interaction.reply({
                content: 'The voting period for this proposal has ended.',
                ephemeral: true
            });
        }

        // Check if user's guild is in the same neighborhood
        const neighborhoodQuery = `
            SELECT n.id FROM neighborhoods n
            JOIN neighborhood_plots np ON n.id = np.neighborhood_id
            WHERE np.guild_id = $1 AND n.id = $2
        `;
        const neighborhoodResult = await Database.query(neighborhoodQuery, [userGuild.id, proposal.neighborhood_id]);
        
        if (neighborhoodResult.rows.length === 0) {
            return await interaction.reply({
                content: 'Your guild is not in this neighborhood.',
                ephemeral: true
            });
        }

        // Check if guild has already voted
        const existingVoteQuery = `
            SELECT * FROM neighborhood_votes
            WHERE neighborhood_id = $1 AND proposal = $2 AND guild_id = $3
        `;
        const existingVoteResult = await Database.query(existingVoteQuery, [
            proposal.neighborhood_id, proposalId.toString(), userGuild.id
        ]);

        if (existingVoteResult.rows.length > 0) {
            return await interaction.reply({
                content: 'Your guild has already voted on this proposal.',
                ephemeral: true
            });
        }

        // Cast vote
        const voteQuery = `
            INSERT INTO neighborhood_votes (neighborhood_id, proposal, guild_id, vote)
            VALUES ($1, $2, $3, $4)
        `;
        await Database.query(voteQuery, [
            proposal.neighborhood_id, proposalId.toString(), userGuild.id, vote
        ]);

        // Update proposal vote counts
        const updateQuery = `
            UPDATE neighborhood_proposals
            SET votes_for = votes_for + $1, votes_against = votes_against + $2
            WHERE id = $3
        `;
        const voteIncrement = vote === 'for' ? 1 : 0;
        const againstIncrement = vote === 'against' ? 1 : 0;
        
        await Database.query(updateQuery, [voteIncrement, againstIncrement, proposalId]);

        const embed = EmbedBuilderUtil.createSuccessEmbed(
            'Vote Cast!',
            `Your vote has been recorded.`
        );

        embed.addFields(
            { name: 'Proposal', value: proposal.title, inline: true },
            { name: 'Your Vote', value: vote === 'for' ? '✅ For' : '❌ Against', inline: true },
            { name: 'Guild', value: userGuild.name, inline: true }
        );

        await interaction.reply({ embeds: [embed] });
    }
};

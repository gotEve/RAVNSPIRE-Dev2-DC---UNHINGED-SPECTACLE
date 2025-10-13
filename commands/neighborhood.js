const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const neighborhoodGovernanceManager = require('../utils/neighborhoodGovernanceManager');
const factionManager = require('../utils/factionManager');
const Database = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('neighborhood')
        .setDescription('Manage neighborhood governance and voting')
        .addSubcommand(subcommand =>
            subcommand
                .setName('propose')
                .setDescription('Create a new neighborhood proposal')
                .addIntegerOption(option =>
                    option.setName('neighborhood_id')
                        .setDescription('Neighborhood ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Proposal title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Proposal description')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Proposal type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Building - Community building construction', value: 'building' },
                            { name: 'Policy - Neighborhood policy changes', value: 'policy' },
                            { name: 'Event - Community events and activities', value: 'event' },
                            { name: 'Defense - Defense system improvements', value: 'defense' },
                            { name: 'Tax - Tax rate adjustments', value: 'tax' },
                            { name: 'Amenity - New amenities or services', value: 'amenity' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('vote')
                .setDescription('Vote on a neighborhood proposal')
                .addIntegerOption(option =>
                    option.setName('proposal_id')
                        .setDescription('Proposal ID to vote on')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('vote')
                        .setDescription('Your vote')
                        .setRequired(true)
                        .addChoices(
                            { name: 'For', value: 'for' },
                            { name: 'Against', value: 'against' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('proposals')
                .setDescription('View neighborhood proposals')
                .addIntegerOption(option =>
                    option.setName('neighborhood_id')
                        .setDescription('Neighborhood ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Filter by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Active', value: 'active' },
                            { name: 'Passed', value: 'passed' },
                            { name: 'Rejected', value: 'rejected' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('proposal')
                .setDescription('View detailed proposal information')
                .addIntegerOption(option =>
                    option.setName('proposal_id')
                        .setDescription('Proposal ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rules')
                .setDescription('View neighborhood rules')
                .addIntegerOption(option =>
                    option.setName('neighborhood_id')
                        .setDescription('Neighborhood ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View neighborhood governance statistics')
                .addIntegerOption(option =>
                    option.setName('neighborhood_id')
                        .setDescription('Neighborhood ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('voters')
                .setDescription('View eligible voters in a neighborhood')
                .addIntegerOption(option =>
                    option.setName('neighborhood_id')
                        .setDescription('Neighborhood ID')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get user's active character
            const activeCharacter = await factionManager.getActiveCharacter(userId);
            if (!activeCharacter) {
                return await interaction.reply({
                    content: '❌ You need to create a character first! Use `/faction create` to get started.',
                    ephemeral: true
                });
            }

            switch (subcommand) {
                case 'propose':
                    await handleCreateProposal(interaction, activeCharacter);
                    break;
                case 'vote':
                    await handleVote(interaction, activeCharacter);
                    break;
                case 'proposals':
                    await handleViewProposals(interaction);
                    break;
                case 'proposal':
                    await handleViewProposal(interaction);
                    break;
                case 'rules':
                    await handleViewRules(interaction);
                    break;
                case 'stats':
                    await handleViewStats(interaction);
                    break;
                case 'voters':
                    await handleViewVoters(interaction);
                    break;
            }

        } catch (error) {
            console.error('Error in neighborhood command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleCreateProposal(interaction, activeCharacter) {
    const neighborhoodId = interaction.options.getInteger('neighborhood_id');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const type = interaction.options.getString('type');

    try {
        // Get user's guild
        const guild = await Database.query(`
            SELECT g.* FROM guilds g
            JOIN guild_members gm ON g.id = gm.guild_id
            WHERE gm.discord_id = ? AND gm.role IN ('owner', 'officer')
        `, [interaction.user.id]);

        if (guild.rows.length === 0) {
            return await interaction.reply({
                content: '❌ You must be a guild owner or officer to create proposals.',
                ephemeral: true
            });
        }

        const result = await neighborhoodGovernanceManager.createProposal(
            neighborhoodId,
            guild.rows[0].id,
            title,
            description,
            type
        );

        const embed = new EmbedBuilder()
            .setTitle('🗳️ Proposal Created!')
            .setDescription(`Your proposal has been created and is now open for voting.`)
            .addFields(
                { name: 'Proposal ID', value: `${result.proposalId}`, inline: true },
                { name: 'Type', value: type, inline: true },
                { name: 'Voting Period', value: `${result.votingPeriod} days`, inline: true },
                { name: 'Expires', value: `<t:${Math.floor(new Date(result.expiresAt).getTime() / 1000)}:R>`, inline: false }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleVote(interaction, activeCharacter) {
    const proposalId = interaction.options.getInteger('proposal_id');
    const vote = interaction.options.getString('vote');

    try {
        // Get user's guild
        const guild = await Database.query(`
            SELECT g.* FROM guilds g
            JOIN guild_members gm ON g.id = gm.guild_id
            WHERE gm.discord_id = ?
        `, [interaction.user.id]);

        if (guild.rows.length === 0) {
            return await interaction.reply({
                content: '❌ You must be a member of a guild to vote.',
                ephemeral: true
            });
        }

        const result = await neighborhoodGovernanceManager.castVote(
            proposalId,
            guild.rows[0].id,
            vote
        );

        const embed = new EmbedBuilder()
            .setTitle('🗳️ Vote Cast!')
            .setDescription(`Your vote has been recorded successfully.`)
            .addFields(
                { name: 'Proposal ID', value: `${result.proposalId}`, inline: true },
                { name: 'Your Vote', value: vote, inline: true },
                { name: 'Guild', value: guild.rows[0].name, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleViewProposals(interaction) {
    const neighborhoodId = interaction.options.getInteger('neighborhood_id');
    const status = interaction.options.getString('status');

    try {
        const proposals = await neighborhoodGovernanceManager.getActiveProposals(neighborhoodId);

        if (proposals.length === 0) {
            return await interaction.reply({
                content: '📋 No active proposals found for this neighborhood.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🗳️ Active Proposals - Neighborhood ${neighborhoodId}`)
            .setDescription(`Found ${proposals.length} active proposal(s)`)
            .setColor(0x0099ff)
            .setTimestamp();

        proposals.forEach((proposal, index) => {
            const timeLeft = new Date(proposal.expires_at) - new Date();
            const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
            
            embed.addFields({
                name: `#${proposal.id} - ${proposal.title}`,
                value: `**Type:** ${proposal.proposal_type}\n**Proposer:** ${proposal.proposer_guild_name}\n**Votes:** ${proposal.votes_for} for, ${proposal.votes_against} against\n**Time Left:** ${daysLeft} days`,
                inline: true
            });
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleViewProposal(interaction) {
    const proposalId = interaction.options.getInteger('proposal_id');

    try {
        const proposal = await neighborhoodGovernanceManager.getProposalDetails(proposalId);

        const embed = new EmbedBuilder()
            .setTitle(`🗳️ Proposal #${proposal.id} - ${proposal.title}`)
            .setDescription(proposal.description)
            .addFields(
                { name: 'Type', value: proposal.proposal_type, inline: true },
                { name: 'Status', value: proposal.status, inline: true },
                { name: 'Proposer', value: proposal.proposer_guild_name, inline: true },
                { name: 'Votes For', value: `${proposal.votes_for}`, inline: true },
                { name: 'Votes Against', value: `${proposal.votes_against}`, inline: true },
                { name: 'Total Votes', value: `${proposal.votes_for + proposal.votes_against}`, inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        if (proposal.expires_at) {
            embed.addFields({ name: 'Expires', value: `<t:${Math.floor(new Date(proposal.expires_at).getTime() / 1000)}:R>`, inline: false });
        }

        if (proposal.votes && proposal.votes.length > 0) {
            const votesList = proposal.votes.map(vote => 
                `${vote.guild_name}: ${vote.vote_type}`
            ).join('\n');
            embed.addFields({ name: 'Votes Cast', value: votesList, inline: false });
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleViewRules(interaction) {
    const neighborhoodId = interaction.options.getInteger('neighborhood_id');

    try {
        const rules = await neighborhoodGovernanceManager.getNeighborhoodRules(neighborhoodId);

        if (rules.length === 0) {
            return await interaction.reply({
                content: '📋 No rules found for this neighborhood.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Neighborhood Rules - Neighborhood ${neighborhoodId}`)
            .setDescription(`Found ${rules.length} rule(s)`)
            .setColor(0x0099ff)
            .setTimestamp();

        rules.forEach((rule, index) => {
            embed.addFields({
                name: `${rule.rule_type}`,
                value: `**Value:** ${rule.rule_value}\n**Enacted:** <t:${Math.floor(new Date(rule.enacted_at).getTime() / 1000)}:R>\n**By:** ${rule.enacted_by_guild || 'System'}`,
                inline: true
            });
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleViewStats(interaction) {
    const neighborhoodId = interaction.options.getInteger('neighborhood_id');

    try {
        const stats = await neighborhoodGovernanceManager.getProposalStats(neighborhoodId);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Governance Statistics - Neighborhood ${neighborhoodId}`)
            .setDescription('Neighborhood governance activity overview')
            .addFields(
                { name: 'Total Proposals', value: `${stats.total_proposals || 0}`, inline: true },
                { name: 'Active Proposals', value: `${stats.active_proposals || 0}`, inline: true },
                { name: 'Passed Proposals', value: `${stats.passed_proposals || 0}`, inline: true },
                { name: 'Rejected Proposals', value: `${stats.rejected_proposals || 0}`, inline: true },
                { name: 'Avg Participation', value: `${Math.round(stats.avg_participation || 0)} votes`, inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleViewVoters(interaction) {
    const neighborhoodId = interaction.options.getInteger('neighborhood_id');

    try {
        const voters = await neighborhoodGovernanceManager.getEligibleVoters(neighborhoodId);

        if (voters.length === 0) {
            return await interaction.reply({
                content: '👥 No eligible voters found for this neighborhood.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`👥 Eligible Voters - Neighborhood ${neighborhoodId}`)
            .setDescription(`Found ${voters.length} eligible guild(s)`)
            .setColor(0x0099ff)
            .setTimestamp();

        voters.forEach((voter, index) => {
            embed.addFields({
                name: voter.name,
                value: `**Level:** ${voter.level}`,
                inline: true
            });
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../../database/db');
const FamilyManager = require('../../utils/familyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Manage marriages and relationships')
        .addSubcommand(subcommand =>
            subcommand
                .setName('propose')
                .setDescription('Propose marriage to another player')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('The player you want to propose to')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Your proposal message (optional)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type of marriage proposal')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Traditional (2 people)', value: 'dyad' },
                            { name: 'Triad (3 people)', value: 'triad' },
                            { name: 'Quad (4 people)', value: 'quad' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('accept')
                .setDescription('Accept a pending marriage proposal')
                .addIntegerOption(option =>
                    option
                        .setName('proposal_id')
                        .setDescription('ID of the proposal to accept')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reject')
                .setDescription('Reject a pending marriage proposal')
                .addIntegerOption(option =>
                    option
                        .setName('proposal_id')
                        .setDescription('ID of the proposal to reject')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View your current marriage status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('divorce')
                .setDescription('Divorce your current spouse(s)')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for divorce (optional)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('proposals')
                .setDescription('View pending marriage proposals')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'propose':
                    await handlePropose(interaction, userId);
                    break;
                case 'accept':
                    await handleAccept(interaction, userId);
                    break;
                case 'reject':
                    await handleReject(interaction, userId);
                    break;
                case 'status':
                    await handleStatus(interaction, userId);
                    break;
                case 'divorce':
                    await handleDivorce(interaction, userId);
                    break;
                case 'proposals':
                    await handleProposals(interaction, userId);
                    break;
            }

        } catch (error) {
            console.error('Marriage command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handlePropose(interaction, userId) {
    const targetUser = interaction.options.getUser('target');
    const message = interaction.options.getString('message') || 'Will you marry me?';
    const type = interaction.options.getString('type') || 'dyad';

    if (targetUser.id === userId) {
        return await interaction.reply({
            content: '❌ You cannot propose to yourself!',
            ephemeral: true
        });
    }

    try {
        const proposalResult = await FamilyManager.createMarriageProposal(userId, targetUser.id, type, message);
        
        const embed = new EmbedBuilder()
            .setTitle('💍 Marriage Proposal Sent!')
            .setDescription(`You have proposed to ${targetUser.username}!`)
            .addFields(
                { name: 'Proposal ID', value: proposalResult.proposalId.toString(), inline: true },
                { name: 'Type', value: type, inline: true },
                { name: 'Expires', value: `<t:${Math.floor(new Date(proposalResult.expiresAt).getTime() / 1000)}:R>`, inline: true },
                { name: 'Message', value: message, inline: false }
            )
            .setColor('#FF69B4')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send DM to target user
        try {
            const targetEmbed = new EmbedBuilder()
                .setTitle('💍 Marriage Proposal!')
                .setDescription(`${interaction.user.username} has proposed to you!`)
                .addFields(
                    { name: 'Proposal ID', value: proposalResult.proposalId.toString(), inline: true },
                    { name: 'Type', value: type, inline: true },
                    { name: 'Message', value: message, inline: false },
                    { name: 'Expires', value: `<t:${Math.floor(new Date(proposalResult.expiresAt).getTime() / 1000)}:R>`, inline: false }
                )
                .setColor('#FF69B4')
                .setTimestamp();

            await targetUser.send({ embeds: [targetEmbed] });
        } catch (dmError) {
            console.log(`Could not send DM to ${targetUser.username}:`, dmError.message);
        }

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleAccept(interaction, userId) {
    const proposalId = interaction.options.getInteger('proposal_id');

    try {
        const marriageResult = await FamilyManager.acceptMarriageProposal(userId, proposalId);
        
        const embed = new EmbedBuilder()
            .setTitle('💒 Marriage Accepted!')
            .setDescription(`Congratulations! You are now married!`)
            .addFields(
                { name: 'Marriage ID', value: marriageResult.marriageId.toString(), inline: true },
                { name: 'Type', value: marriageResult.marriageType, inline: true },
                { name: 'Spouse(s)', value: marriageResult.spouses.map(s => `<@${s.discordId}>`).join(', '), inline: false }
            )
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleReject(interaction, userId) {
    const proposalId = interaction.options.getInteger('proposal_id');

    try {
        await FamilyManager.rejectMarriageProposal(userId, proposalId);
        
        const embed = new EmbedBuilder()
            .setTitle('💔 Proposal Rejected')
            .setDescription('The marriage proposal has been rejected.')
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleStatus(interaction, userId) {
    try {
        const marriageStatus = await FamilyManager.getMarriageStatus(userId);
        
        if (!marriageStatus) {
            return await interaction.reply({
                content: '❌ You are not currently married.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('💒 Marriage Status')
            .setColor('#FF69B4')
            .setTimestamp();

        let description = `**Marriage Type:** ${marriageStatus.marriageType}\n`;
        description += `**Status:** ${marriageStatus.status}\n`;
        description += `**Married Since:** <t:${Math.floor(new Date(marriageStatus.marriedAt).getTime() / 1000)}:F>\n`;
        
        if (marriageStatus.spouses && marriageStatus.spouses.length > 0) {
            description += `**Spouse(s):** ${marriageStatus.spouses.map(s => `<@${s.discordId}>`).join(', ')}\n`;
        }

        embed.setDescription(description);

        // Add affection points if available
        if (marriageStatus.affectionPoints && marriageStatus.affectionPoints.length > 0) {
            const affectionFields = marriageStatus.affectionPoints.map(ap => ({
                name: `💕 ${ap.partnerName}`,
                value: `${ap.affectionPoints} affection points`,
                inline: true
            }));
            embed.addFields(affectionFields);
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleDivorce(interaction, userId) {
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        const divorceResult = await FamilyManager.divorce(userId, reason);
        
        const embed = new EmbedBuilder()
            .setTitle('💔 Divorce Complete')
            .setDescription('Your marriage has been dissolved.')
            .addFields(
                { name: 'Divorce Cost', value: `${divorceResult.divorceCost} currency`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleProposals(interaction, userId) {
    try {
        const proposals = await FamilyManager.getPendingProposals(userId);
        
        if (!proposals || proposals.length === 0) {
            return await interaction.reply({
                content: '❌ You have no pending marriage proposals.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('💍 Pending Marriage Proposals')
            .setColor('#FF69B4')
            .setTimestamp();

        let description = '';
        proposals.forEach((proposal, index) => {
            description += `**${index + 1}. Proposal ID: ${proposal.id}**\n`;
            description += `From: <@${proposal.proposerDiscordId}>\n`;
            description += `Type: ${proposal.proposalType}\n`;
            description += `Message: ${proposal.message}\n`;
            description += `Expires: <t:${Math.floor(new Date(proposal.expiresAt).getTime() / 1000)}:R>\n\n`;
        });

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

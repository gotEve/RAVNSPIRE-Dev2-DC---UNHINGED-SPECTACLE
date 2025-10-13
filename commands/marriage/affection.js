const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../../database/db');
const FamilyManager = require('../../utils/familyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('affection')
        .setDescription('Manage affection points with your spouse(s)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View affection points with your spouse(s)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('interact')
                .setDescription('Interact with your spouse to gain affection points')
                .addUserOption(option =>
                    option
                        .setName('partner')
                        .setDescription('Your spouse to interact with')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('activity')
                        .setDescription('Type of interaction')
                        .setRequired(true)
                        .addChoices(
                            { name: '💬 Conversation', value: 'conversation' },
                            { name: '🎁 Gift', value: 'gift' },
                            { name: '🎮 Play Game', value: 'game' },
                            { name: '🍽️ Date', value: 'date' },
                            { name: '💕 Romantic Gesture', value: 'romantic' },
                            { name: '🤗 Hug', value: 'hug' },
                            { name: '💋 Kiss', value: 'kiss' },
                            { name: '🎵 Share Music', value: 'music' },
                            { name: '📚 Read Together', value: 'reading' },
                            { name: '🌅 Watch Sunset', value: 'sunset' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Personal message for this interaction (optional)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View your interaction history with a spouse')
                .addUserOption(option =>
                    option
                        .setName('partner')
                        .setDescription('Your spouse to view history with')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'view':
                    await handleView(interaction, userId);
                    break;
                case 'interact':
                    await handleInteract(interaction, userId);
                    break;
                case 'history':
                    await handleHistory(interaction, userId);
                    break;
            }

        } catch (error) {
            console.error('Affection command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleView(interaction, userId) {
    try {
        const affectionData = await FamilyManager.getAffectionData(userId);
        
        if (!affectionData || affectionData.length === 0) {
            return await interaction.reply({
                content: '❌ You are not currently married or have no affection data.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('💕 Affection Points')
            .setColor('#FF69B4')
            .setTimestamp();

        let description = '';
        affectionData.forEach(relationship => {
            description += `**💕 ${relationship.partnerName}**\n`;
            description += `Affection Points: ${relationship.affectionPoints}\n`;
            description += `Total Interactions: ${relationship.totalInteractions}\n`;
            description += `Last Interaction: <t:${Math.floor(new Date(relationship.lastInteraction).getTime() / 1000)}:R>\n\n`;
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

async function handleInteract(interaction, userId) {
    const partner = interaction.options.getUser('partner');
    const activity = interaction.options.getString('activity');
    const message = interaction.options.getString('message') || '';

    try {
        const interactionResult = await FamilyManager.addAffectionInteraction(
            userId, 
            partner.id, 
            activity, 
            message
        );
        
        const activityEmojis = {
            'conversation': '💬',
            'gift': '🎁',
            'game': '🎮',
            'date': '🍽️',
            'romantic': '💕',
            'hug': '🤗',
            'kiss': '💋',
            'music': '🎵',
            'reading': '📚',
            'sunset': '🌅'
        };

        const activityNames = {
            'conversation': 'Conversation',
            'gift': 'Gift',
            'game': 'Game',
            'date': 'Date',
            'romantic': 'Romantic Gesture',
            'hug': 'Hug',
            'kiss': 'Kiss',
            'music': 'Share Music',
            'reading': 'Read Together',
            'sunset': 'Watch Sunset'
        };

        const embed = new EmbedBuilder()
            .setTitle(`${activityEmojis[activity]} Interaction Complete!`)
            .setDescription(`You spent quality time with ${partner.username}!`)
            .addFields(
                { name: 'Activity', value: activityNames[activity], inline: true },
                { name: 'Affection Gained', value: `+${interactionResult.affectionGained}`, inline: true },
                { name: 'Total Affection', value: `${interactionResult.totalAffection}`, inline: true }
            )
            .setColor('#FF69B4')
            .setTimestamp();

        if (message) {
            embed.addFields({ name: 'Your Message', value: message, inline: false });
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleHistory(interaction, userId) {
    const partner = interaction.options.getUser('partner');

    try {
        const history = await FamilyManager.getInteractionHistory(userId, partner.id);
        
        if (!history || history.length === 0) {
            return await interaction.reply({
                content: `❌ No interaction history found with ${partner.username}.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`💕 Interaction History with ${partner.username}`)
            .setColor('#FF69B4')
            .setTimestamp();

        let description = '';
        history.slice(0, 10).forEach((interaction, index) => { // Show last 10 interactions
            const activityEmojis = {
                'conversation': '💬',
                'gift': '🎁',
                'game': '🎮',
                'date': '🍽️',
                'romantic': '💕',
                'hug': '🤗',
                'kiss': '💋',
                'music': '🎵',
                'reading': '📚',
                'sunset': '🌅'
            };

            description += `**${index + 1}.** ${activityEmojis[interaction.interactionType] || '💕'} ${interaction.interactionType}\n`;
            description += `   Affection: +${interaction.affectionGained} | <t:${Math.floor(new Date(interaction.occurredAt).getTime() / 1000)}:R>\n`;
            
            if (interaction.message) {
                description += `   Message: "${interaction.message}"\n`;
            }
            description += '\n';
        });

        if (history.length > 10) {
            description += `*... and ${history.length - 10} more interactions*`;
        }

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

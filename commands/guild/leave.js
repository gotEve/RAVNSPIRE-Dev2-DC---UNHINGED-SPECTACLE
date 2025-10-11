const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-leave')
        .setDescription('Leave your current guild'),
    cooldown: 10,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;

            // Check if user is in a guild
            const userGuild = await Database.getUserGuild(userId);
            if (!userGuild) {
                return await interaction.reply({
                    content: 'You are not a member of any guild.',
                    ephemeral: true
                });
            }

            // Check if user is the owner
            if (userGuild.role === 'owner') {
                return await interaction.reply({
                    content: 'You cannot leave a guild you own. Transfer ownership to another member first or disband the guild.',
                    ephemeral: true
                });
            }

            // Create confirmation embed
            const embed = EmbedBuilderUtil.createWarningEmbed(
                'Leave Guild Confirmation',
                `Are you sure you want to leave **${userGuild.name}**?`
            );

            embed.addFields(
                { name: 'Guild', value: userGuild.name, inline: true },
                { name: 'Your Role', value: userGuild.role.charAt(0).toUpperCase() + userGuild.role.slice(1), inline: true }
            );

            embed.addFields({
                name: 'Warning',
                value: 'This action cannot be undone. You will need to be invited again to rejoin.',
                inline: false
            });

            // Create confirmation buttons
            const components = ButtonBuilderUtil.createConfirmation('guild_leave', userId);

            await interaction.reply({
                embeds: [embed],
                components: [components]
            });

        } catch (error) {
            console.error('Error in guild-leave command:', error);
            await interaction.reply({
                content: 'There was an error processing your request.',
                ephemeral: true
            });
        }
    },
};

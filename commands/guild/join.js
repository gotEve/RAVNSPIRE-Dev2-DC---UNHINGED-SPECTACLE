const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-join')
        .setDescription('Join a guild')
        .addStringOption(option =>
            option.setName('guild')
                .setDescription('The name of the guild to join')
                .setRequired(true)),
    cooldown: 10,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const guildName = interaction.options.getString('guild');

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            // Check if user is already in a guild
            const existingGuild = await Database.getUserGuild(userId);
            if (existingGuild) {
                return await interaction.reply({
                    content: `You are already a member of **${existingGuild.name}**. Leave your current guild first to join another one.`,
                    ephemeral: true
                });
            }

            // Find the guild
            const guild = await Database.getGuildByName(guildName);
            if (!guild) {
                return await interaction.reply({
                    content: 'Guild not found. Make sure you spelled the name correctly.',
                    ephemeral: true
                });
            }

            // Check guild member limit
            const members = await Database.getGuildMembers(guild.id);
            const maxMembers = 50; // From config
            if (members.length >= maxMembers) {
                return await interaction.reply({
                    content: `**${guild.name}** has reached the maximum member limit of ${maxMembers}.`,
                    ephemeral: true
                });
            }

            // Add the user to the guild
            await Database.addGuildMember(guild.id, userId, 'member');

            const embed = EmbedBuilderUtil.createSuccessEmbed(
                'Guild Joined!',
                `Successfully joined **${guild.name}**!`
            );

            embed.addFields(
                { name: 'Guild', value: guild.name, inline: true },
                { name: 'Your Role', value: 'Member', inline: true },
                { name: 'Members', value: `${members.length + 1}`, inline: true }
            );

            embed.addFields({
                name: 'Welcome!',
                value: `Welcome to **${guild.name}**! Use \`/guild info\` to learn more about your new guild and start participating in guild activities.`,
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in guild-join command:', error);
            await interaction.reply({
                content: 'There was an error joining the guild.',
                ephemeral: true
            });
        }
    },
};

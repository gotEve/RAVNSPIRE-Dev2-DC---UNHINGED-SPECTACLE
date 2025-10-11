const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-create')
        .setDescription('Create a new guild')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the guild')
                .setRequired(true)
                .setMaxLength(50))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('A description of the guild')
                .setRequired(false)
                .setMaxLength(200)),
    cooldown: 30,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const guildName = interaction.options.getString('name');
            const description = interaction.options.getString('description') || 'No description provided.';

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            // Check if user is already in a guild
            const existingGuild = await Database.getUserGuild(userId);
            if (existingGuild) {
                return await interaction.reply({
                    content: `You are already a member of **${existingGuild.name}**. Leave your current guild first to create a new one.`,
                    ephemeral: true
                });
            }

            // Check if guild name already exists
            const existingGuildName = await Database.getGuildByName(guildName);
            if (existingGuildName) {
                return await interaction.reply({
                    content: 'A guild with that name already exists. Please choose a different name.',
                    ephemeral: true
                });
            }

            // Create the guild
            const guild = await Database.createGuild(guildName, description, userId);

            // Add the creator as the owner
            await Database.addGuildMember(guild.id, userId, 'owner');

            const embed = EmbedBuilderUtil.createSuccessEmbed(
                'Guild Created!',
                `Successfully created the guild **${guildName}**!`
            );

            embed.addFields(
                { name: 'Guild Name', value: guildName, inline: true },
                { name: 'Description', value: description, inline: false },
                { name: 'Owner', value: `<@${userId}>`, inline: true },
                { name: 'Members', value: '1', inline: true },
                { name: 'Level', value: '1', inline: true }
            );

            embed.addFields({
                name: 'Next Steps',
                value: '• Use `/guild invite <user>` to invite members\n• Use `/guild info` to view guild details\n• Use `/guild roles` to manage member permissions',
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in guild-create command:', error);
            await interaction.reply({
                content: 'There was an error creating the guild.',
                ephemeral: true
            });
        }
    },
};

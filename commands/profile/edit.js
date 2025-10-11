const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile-edit')
        .setDescription('Edit your profile')
        .addSubcommand(subcommand =>
            subcommand
                .setName('bio')
                .setDescription('Edit your bio')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Your new bio (max 500 characters)')
                        .setRequired(true)
                        .setMaxLength(500)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('title')
                .setDescription('Set your equipped title')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('The title to equip')
                        .setRequired(true))),
    cooldown: 10,
    async execute(interaction) {
        try {
            const discordId = interaction.user.id;
            const subcommand = interaction.options.getSubcommand();

            // Ensure user exists in database
            await Database.createUser(discordId, interaction.user.username);

            if (subcommand === 'bio') {
                const bio = interaction.options.getString('text');

                // Update or create profile
                const query = `
                    INSERT INTO user_profiles (discord_id, bio, updated_at) 
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    ON CONFLICT (discord_id) 
                    DO UPDATE SET bio = $2, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `;
                const result = await Database.query(query, [discordId, bio]);

                const embed = EmbedBuilderUtil.createSuccessEmbed(
                    'Bio Updated',
                    `Your bio has been updated to:\n\n"${bio}"`
                );

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'title') {
                const title = interaction.options.getString('title');

                // Check if user has this title unlocked
                const titleQuery = `
                    SELECT ua.*, a.name 
                    FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.discord_id = $1 AND a.rewards->>'title' = $2
                `;
                const titleResult = await Database.query(titleQuery, [discordId, title]);

                if (titleResult.rows.length === 0) {
                    return await interaction.reply({
                        content: `You haven't unlocked the title "${title}" yet!`,
                        ephemeral: true
                    });
                }

                // Update equipped title
                const query = `
                    INSERT INTO user_profiles (discord_id, equipped_title, updated_at) 
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    ON CONFLICT (discord_id) 
                    DO UPDATE SET equipped_title = $2, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `;
                const result = await Database.query(query, [discordId, title]);

                const embed = EmbedBuilderUtil.createSuccessEmbed(
                    'Title Equipped',
                    `You have equipped the title: **${title}**`
                );

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in profile-edit command:', error);
            await interaction.reply({
                content: 'There was an error updating your profile.',
                ephemeral: true
            });
        }
    },
};

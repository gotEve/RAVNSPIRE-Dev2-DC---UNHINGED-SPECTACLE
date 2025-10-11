const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View a user\'s profile')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view the profile of')
                .setRequired(false)),
    cooldown: 5,
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const discordId = targetUser.id;

            // Ensure user exists in database
            await Database.createUser(discordId, targetUser.username);

            // Get user data
            const user = await Database.getUser(discordId);
            if (!user) {
                return await interaction.reply({
                    content: 'User not found in database.',
                    ephemeral: true
                });
            }

            // Get user profile
            const profileQuery = 'SELECT * FROM user_profiles WHERE discord_id = $1';
            const profileResult = await Database.query(profileQuery, [discordId]);
            const profile = profileResult.rows[0];

            // Get user achievements
            const achievements = await Database.getUserAchievements(discordId);

            // Get game statistics
            const gameStatsQuery = `
                SELECT 
                    COUNT(*) as games_played,
                    SUM(CASE WHEN gp.xp > 0 THEN 1 ELSE 0 END) as games_won,
                    AVG(gp.xp) as avg_xp,
                    MAX(gp.xp) as best_score
                FROM game_progress gp
                WHERE gp.discord_id = $1
            `;
            const gameStatsResult = await Database.query(gameStatsQuery, [discordId]);
            const gameStats = gameStatsResult.rows[0];

            // Get guild info
            const guildInfo = await Database.getUserGuild(discordId);

            // Prepare stats object
            const stats = {
                global_xp: user.global_xp,
                currency: user.currency,
                games_played: parseInt(gameStats.games_played) || 0,
                games_won: parseInt(gameStats.games_won) || 0,
                avg_xp: parseFloat(gameStats.avg_xp) || 0,
                best_score: parseInt(gameStats.best_score) || 0,
                achievements_count: achievements.length
            };

            // Create profile embed
            const embed = EmbedBuilderUtil.createProfileEmbed(targetUser, profile, stats);

            // Add achievements section
            if (achievements.length > 0) {
                const recentAchievements = achievements.slice(0, 3).map(ach => ach.name).join(', ');
                embed.addFields({
                    name: 'Recent Achievements',
                    value: recentAchievements,
                    inline: false
                });
            }

            // Add guild info if user is in a guild
            if (guildInfo) {
                embed.addFields({
                    name: 'Guild',
                    value: `${guildInfo.name} (${guildInfo.role})`,
                    inline: true
                });
            }

            // Add join date
            embed.addFields({
                name: 'Member Since',
                value: `<t:${Math.floor(new Date(user.join_date).getTime() / 1000)}:R>`,
                inline: true
            });

            // Create action buttons
            const actionRow = ButtonBuilderUtil.createProfileActions();

            await interaction.reply({
                embeds: [embed],
                components: [actionRow]
            });

        } catch (error) {
            console.error('Error in profile command:', error);
            await interaction.reply({
                content: 'There was an error retrieving the profile.',
                ephemeral: true
            });
        }
    },
};

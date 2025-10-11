const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile-stats')
        .setDescription('View detailed statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view stats for')
                .setRequired(false)),
    cooldown: 5,
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const discordId = targetUser.id;

            // Ensure user exists in database
            await Database.createUser(discordId, targetUser.username);

            // Get comprehensive user statistics
            const statsQuery = `
                SELECT 
                    u.global_xp,
                    u.currency,
                    u.join_date,
                    u.last_active,
                    COUNT(DISTINCT gp.game_id) as games_played_count,
                    COUNT(gp.id) as total_game_sessions,
                    SUM(gp.xp) as total_game_xp,
                    AVG(gp.xp) as avg_game_xp,
                    MAX(gp.xp) as best_game_score,
                    COUNT(DISTINCT ua.achievement_id) as achievements_unlocked,
                    COUNT(DISTINCT ld.lore_id) as lore_discovered
                FROM users u
                LEFT JOIN game_progress gp ON u.discord_id = gp.discord_id
                LEFT JOIN user_achievements ua ON u.discord_id = ua.discord_id
                LEFT JOIN lore_discoveries ld ON u.discord_id = ld.discord_id
                WHERE u.discord_id = $1
                GROUP BY u.discord_id, u.global_xp, u.currency, u.join_date, u.last_active
            `;
            const statsResult = await Database.query(statsQuery, [discordId]);
            const stats = statsResult.rows[0];

            // Get game-specific stats
            const gameStatsQuery = `
                SELECT 
                    g.name as game_name,
                    gp.level,
                    gp.xp,
                    gp.stats,
                    gp.last_played
                FROM game_progress gp
                JOIN games g ON gp.game_id = g.id
                WHERE gp.discord_id = $1
                ORDER BY gp.xp DESC
            `;
            const gameStatsResult = await Database.query(gameStatsQuery, [discordId]);
            const gameStats = gameStatsResult.rows;

            // Get achievement breakdown
            const achievementStatsQuery = `
                SELECT 
                    a.category,
                    COUNT(*) as count
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.discord_id = $1
                GROUP BY a.category
                ORDER BY count DESC
            `;
            const achievementStatsResult = await Database.query(achievementStatsQuery, [discordId]);
            const achievementStats = achievementStatsResult.rows;

            // Create main stats embed
            const embed = EmbedBuilderUtil.createBaseEmbed(
                `📊 ${targetUser.username}'s Statistics`,
                `Comprehensive overview of ${targetUser.username}'s progress and achievements`
            );

            // Basic stats
            embed.addFields(
                { name: 'Level', value: EmbedBuilderUtil.calculateLevel(stats.global_xp).toString(), inline: true },
                { name: 'Global XP', value: EmbedBuilderUtil.formatNumber(stats.global_xp), inline: true },
                { name: 'Currency', value: EmbedBuilderUtil.formatNumber(stats.currency), inline: true },
                { name: 'Games Played', value: stats.games_played_count?.toString() || '0', inline: true },
                { name: 'Total Sessions', value: stats.total_game_sessions?.toString() || '0', inline: true },
                { name: 'Best Score', value: stats.best_game_score?.toString() || '0', inline: true }
            );

            // Activity stats
            const joinDate = new Date(stats.join_date);
            const lastActive = new Date(stats.last_active);
            const daysSinceJoin = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
            const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

            embed.addFields(
                { name: 'Member Since', value: `${daysSinceJoin} days ago`, inline: true },
                { name: 'Last Active', value: `${daysSinceActive} days ago`, inline: true },
                { name: 'Achievements', value: stats.achievements_unlocked?.toString() || '0', inline: true }
            );

            // Game-specific stats
            if (gameStats.length > 0) {
                const gameStatsText = gameStats.slice(0, 5).map(game => {
                    const gameStats = game.stats ? JSON.parse(game.stats) : {};
                    return `**${game.game_name}**: Level ${game.level} (${game.xp} XP)`;
                }).join('\n');

                embed.addFields({
                    name: 'Top Games',
                    value: gameStatsText || 'No games played yet',
                    inline: false
                });
            }

            // Achievement breakdown
            if (achievementStats.length > 0) {
                const achievementText = achievementStats.map(stat => 
                    `**${stat.category}**: ${stat.count}`
                ).join(' | ');

                embed.addFields({
                    name: 'Achievement Breakdown',
                    value: achievementText,
                    inline: false
                });
            }

            // Add guild info if applicable
            const guildInfo = await Database.getUserGuild(discordId);
            if (guildInfo) {
                embed.addFields({
                    name: 'Guild',
                    value: `${guildInfo.name} (${guildInfo.role})`,
                    inline: true
                });
            }

            // Add neighborhood info if applicable
            const neighborhoodQuery = `
                SELECT n.name, np.plot_number
                FROM neighborhood_plots np
                JOIN neighborhoods n ON np.neighborhood_id = n.id
                WHERE np.guild_id = (SELECT guild_id FROM guild_members WHERE discord_id = $1)
            `;
            const neighborhoodResult = await Database.query(neighborhoodQuery, [discordId]);
            if (neighborhoodResult.rows.length > 0) {
                const neighborhood = neighborhoodResult.rows[0];
                embed.addFields({
                    name: 'Neighborhood',
                    value: `${neighborhood.name} (Plot ${neighborhood.plot_number})`,
                    inline: true
                });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in profile-stats command:', error);
            await interaction.reply({
                content: 'There was an error retrieving statistics.',
                ephemeral: true
            });
        }
    },
};

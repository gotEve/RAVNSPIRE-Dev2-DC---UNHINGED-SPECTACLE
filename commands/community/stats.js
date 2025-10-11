const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('community-stats')
        .setDescription('View server-wide community statistics'),
    cooldown: 10,
    async execute(interaction) {
        try {
            // Get comprehensive community statistics
            const stats = await this.getCommunityStats();

            const embed = EmbedBuilderUtil.createBaseEmbed(
                '🌟 Community Statistics',
                'Overview of the Ravnspire community activity'
            );

            // User statistics
            embed.addFields(
                { name: 'Total Users', value: stats.totalUsers.toString(), inline: true },
                { name: 'Active Users (7d)', value: stats.activeUsers.toString(), inline: true },
                { name: 'New Users (7d)', value: stats.newUsers.toString(), inline: true }
            );

            // Game statistics
            embed.addFields(
                { name: 'Games Played', value: stats.totalGames.toString(), inline: true },
                { name: 'Total Game XP', value: EmbedBuilderUtil.formatNumber(stats.totalGameXP), inline: true },
                { name: 'Average Score', value: Math.round(stats.averageScore).toString(), inline: true }
            );

            // Guild statistics
            embed.addFields(
                { name: 'Total Guilds', value: stats.totalGuilds.toString(), inline: true },
                { name: 'Guild Members', value: stats.totalGuildMembers.toString(), inline: true },
                { name: 'Average Guild Size', value: Math.round(stats.averageGuildSize).toString(), inline: true }
            );

            // Neighborhood statistics
            embed.addFields(
                { name: 'Neighborhoods', value: stats.totalNeighborhoods.toString(), inline: true },
                { name: 'Occupied Plots', value: stats.occupiedPlots.toString(), inline: true },
                { name: 'Community Buildings', value: stats.totalBuildings.toString(), inline: true }
            );

            // Achievement statistics
            embed.addFields(
                { name: 'Achievements Unlocked', value: stats.totalAchievements.toString(), inline: true },
                { name: 'Lore Discovered', value: stats.totalLoreDiscovered.toString(), inline: true },
                { name: 'Hidden Lore Found', value: stats.hiddenLoreFound.toString(), inline: true }
            );

            // Top performers
            if (stats.topGuild) {
                embed.addFields({
                    name: 'Top Guild',
                    value: `**${stats.topGuild.name}** (Level ${stats.topGuild.level}, ${stats.topGuild.member_count} members)`,
                    inline: false
                });
            }

            if (stats.topPlayer) {
                embed.addFields({
                    name: 'Top Player',
                    value: `**${stats.topPlayer.username}** (${stats.topPlayer.global_xp} XP, Level ${Math.floor(stats.topPlayer.global_xp / 100) + 1})`,
                    inline: false
                });
            }

            // Activity trends
            embed.addFields({
                name: 'Recent Activity',
                value: `• ${stats.gamesToday} games played today\n• ${stats.achievementsToday} achievements unlocked today\n• ${stats.newGuildsToday} new guilds created today`,
                inline: false
            });

            embed.setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in community-stats command:', error);
            await interaction.reply({
                content: 'There was an error retrieving community statistics.',
                ephemeral: true
            });
        }
    },

    async getCommunityStats() {
        const stats = {};

        // User statistics
        const userStatsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN last_active > NOW() - INTERVAL '7 days' THEN 1 END) as active_users,
                COUNT(CASE WHEN join_date > NOW() - INTERVAL '7 days' THEN 1 END) as new_users
            FROM users
        `;
        const userStatsResult = await Database.query(userStatsQuery);
        const userStats = userStatsResult.rows[0];
        stats.totalUsers = parseInt(userStats.total_users);
        stats.activeUsers = parseInt(userStats.active_users);
        stats.newUsers = parseInt(userStats.new_users);

        // Game statistics
        const gameStatsQuery = `
            SELECT 
                COUNT(*) as total_games,
                SUM(xp) as total_xp,
                AVG(xp) as avg_score
            FROM game_progress
        `;
        const gameStatsResult = await Database.query(gameStatsQuery);
        const gameStats = gameStatsResult.rows[0];
        stats.totalGames = parseInt(gameStats.total_games) || 0;
        stats.totalGameXP = parseInt(gameStats.total_xp) || 0;
        stats.averageScore = parseFloat(gameStats.avg_score) || 0;

        // Guild statistics
        const guildStatsQuery = `
            SELECT 
                COUNT(DISTINCT g.id) as total_guilds,
                COUNT(gm.id) as total_members,
                AVG(guild_sizes.size) as avg_size
            FROM guilds g
            LEFT JOIN guild_members gm ON g.id = gm.guild_id
            LEFT JOIN (
                SELECT guild_id, COUNT(*) as size
                FROM guild_members
                GROUP BY guild_id
            ) guild_sizes ON g.id = guild_sizes.guild_id
        `;
        const guildStatsResult = await Database.query(guildStatsQuery);
        const guildStats = guildStatsResult.rows[0];
        stats.totalGuilds = parseInt(guildStats.total_guilds) || 0;
        stats.totalGuildMembers = parseInt(guildStats.total_members) || 0;
        stats.averageGuildSize = parseFloat(guildStats.avg_size) || 0;

        // Neighborhood statistics
        const neighborhoodStatsQuery = `
            SELECT 
                COUNT(DISTINCT n.id) as total_neighborhoods,
                COUNT(CASE WHEN np.guild_id IS NOT NULL THEN 1 END) as occupied_plots,
                COUNT(DISTINCT nb.id) as total_buildings
            FROM neighborhoods n
            LEFT JOIN neighborhood_plots np ON n.id = np.neighborhood_id
            LEFT JOIN neighborhood_buildings nb ON n.id = nb.neighborhood_id
        `;
        const neighborhoodStatsResult = await Database.query(neighborhoodStatsQuery);
        const neighborhoodStats = neighborhoodStatsResult.rows[0];
        stats.totalNeighborhoods = parseInt(neighborhoodStats.total_neighborhoods) || 0;
        stats.occupiedPlots = parseInt(neighborhoodStats.occupied_plots) || 0;
        stats.totalBuildings = parseInt(neighborhoodStats.total_buildings) || 0;

        // Achievement statistics
        const achievementStatsQuery = `
            SELECT 
                COUNT(*) as total_achievements,
                COUNT(DISTINCT ld.lore_id) as lore_discovered,
                COUNT(CASE WHEN le.hidden = true THEN 1 END) as hidden_lore
            FROM user_achievements ua
            LEFT JOIN lore_discoveries ld ON ua.discord_id = ld.discord_id
            LEFT JOIN lore_entries le ON ld.lore_id = le.id
        `;
        const achievementStatsResult = await Database.query(achievementStatsQuery);
        const achievementStats = achievementStatsResult.rows[0];
        stats.totalAchievements = parseInt(achievementStats.total_achievements) || 0;
        stats.totalLoreDiscovered = parseInt(achievementStats.lore_discovered) || 0;
        stats.hiddenLoreFound = parseInt(achievementStats.hidden_lore) || 0;

        // Top performers
        const topGuildQuery = `
            SELECT g.name, g.level, COUNT(gm.id) as member_count
            FROM guilds g
            LEFT JOIN guild_members gm ON g.id = gm.guild_id
            GROUP BY g.id, g.name, g.level
            ORDER BY g.level DESC, g.xp DESC
            LIMIT 1
        `;
        const topGuildResult = await Database.query(topGuildQuery);
        stats.topGuild = topGuildResult.rows[0] || null;

        const topPlayerQuery = `
            SELECT username, global_xp
            FROM users
            ORDER BY global_xp DESC
            LIMIT 1
        `;
        const topPlayerResult = await Database.query(topPlayerQuery);
        stats.topPlayer = topPlayerResult.rows[0] || null;

        // Today's activity
        const todayStatsQuery = `
            SELECT 
                COUNT(CASE WHEN gs.start_time > CURRENT_DATE THEN 1 END) as games_today,
                COUNT(CASE WHEN ua.unlocked_at > CURRENT_DATE THEN 1 END) as achievements_today,
                COUNT(CASE WHEN g.created_at > CURRENT_DATE THEN 1 END) as new_guilds_today
            FROM game_sessions gs
            FULL OUTER JOIN user_achievements ua ON TRUE
            FULL OUTER JOIN guilds g ON TRUE
        `;
        const todayStatsResult = await Database.query(todayStatsQuery);
        const todayStats = todayStatsResult.rows[0];
        stats.gamesToday = parseInt(todayStats.games_today) || 0;
        stats.achievementsToday = parseInt(todayStats.achievements_today) || 0;
        stats.newGuildsToday = parseInt(todayStats.new_guilds_today) || 0;

        return stats;
    }
};

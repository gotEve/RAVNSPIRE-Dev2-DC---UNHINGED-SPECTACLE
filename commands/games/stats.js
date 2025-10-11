const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games-stats')
        .setDescription('View your game statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view stats for')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Specific game to view stats for')
                .setRequired(false)
                .addChoices(
                    { name: 'Trivia', value: 'trivia' },
                    { name: 'All Games', value: 'all' }
                )),
    cooldown: 5,
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const gameType = interaction.options.getString('game') || 'all';
            const discordId = targetUser.id;

            // Ensure user exists in database
            await Database.createUser(discordId, targetUser.username);

            let embed;
            let title;

            if (gameType === 'all') {
                // Overall game statistics
                const statsQuery = `
                    SELECT 
                        u.global_xp,
                        u.currency,
                        COUNT(DISTINCT gp.game_id) as games_played_count,
                        COUNT(gp.id) as total_sessions,
                        SUM(gp.xp) as total_game_xp,
                        AVG(gp.xp) as avg_game_xp,
                        MAX(gp.xp) as best_score,
                        MIN(gp.last_played) as first_game,
                        MAX(gp.last_played) as last_game
                    FROM users u
                    LEFT JOIN game_progress gp ON u.discord_id = gp.discord_id
                    WHERE u.discord_id = $1
                    GROUP BY u.discord_id, u.global_xp, u.currency
                `;
                const statsResult = await Database.query(statsQuery, [discordId]);
                const stats = statsResult.rows[0];

                title = `📊 ${targetUser.username}'s Game Statistics`;
                embed = EmbedBuilderUtil.createBaseEmbed(title, 'Overall gaming performance');

                embed.addFields(
                    { name: 'Global Level', value: EmbedBuilderUtil.calculateLevel(stats.global_xp).toString(), inline: true },
                    { name: 'Global XP', value: EmbedBuilderUtil.formatNumber(stats.global_xp), inline: true },
                    { name: 'Currency', value: EmbedBuilderUtil.formatNumber(stats.currency), inline: true },
                    { name: 'Games Played', value: stats.games_played_count?.toString() || '0', inline: true },
                    { name: 'Total Sessions', value: stats.total_sessions?.toString() || '0', inline: true },
                    { name: 'Best Score', value: stats.best_score?.toString() || '0', inline: true }
                );

                if (stats.total_sessions > 0) {
                    embed.addFields(
                        { name: 'Average Score', value: Math.round(stats.avg_game_xp).toString(), inline: true },
                        { name: 'Total Game XP', value: EmbedBuilderUtil.formatNumber(stats.total_game_xp), inline: true }
                    );
                }

                // Game breakdown
                const gameBreakdownQuery = `
                    SELECT 
                        g.name as game_name,
                        COUNT(gp.id) as sessions,
                        SUM(gp.xp) as total_xp,
                        MAX(gp.xp) as best_score,
                        AVG(gp.xp) as avg_score
                    FROM game_progress gp
                    JOIN games g ON gp.game_id = g.id
                    WHERE gp.discord_id = $1
                    GROUP BY g.id, g.name
                    ORDER BY total_xp DESC
                `;
                const gameBreakdownResult = await Database.query(gameBreakdownQuery, [discordId]);
                const gameBreakdown = gameBreakdownResult.rows;

                if (gameBreakdown.length > 0) {
                    const gameStatsText = gameBreakdown.map(game => 
                        `**${game.game_name}**: ${game.sessions} sessions, ${game.total_xp} XP (Best: ${game.best_score})`
                    ).join('\n');

                    embed.addFields({
                        name: 'Game Breakdown',
                        value: gameStatsText,
                        inline: false
                    });
                }

            } else {
                // Specific game statistics
                const game = await Database.getGame(gameType);
                if (!game) {
                    return await interaction.reply({
                        content: 'Game not found.',
                        ephemeral: true
                    });
                }

                const gameStatsQuery = `
                    SELECT 
                        gp.level,
                        gp.xp,
                        gp.stats,
                        gp.last_played,
                        COUNT(gs.id) as sessions_played,
                        AVG(gs.final_score) as avg_score,
                        MAX(gs.final_score) as best_score,
                        MIN(gs.start_time) as first_played
                    FROM game_progress gp
                    LEFT JOIN game_sessions gs ON gp.discord_id = gs.user_id AND gs.game_name = $2
                    WHERE gp.discord_id = $1 AND gp.game_id = $3
                    GROUP BY gp.level, gp.xp, gp.stats, gp.last_played
                `;
                const gameStatsResult = await Database.query(gameStatsQuery, [discordId, gameType, game.id]);
                const gameStats = gameStatsResult.rows[0];

                if (!gameStats) {
                    const embed = EmbedBuilderUtil.createInfoEmbed(
                        'No Game Data',
                        `${targetUser.username} hasn't played ${game.name} yet.`
                    );
                    return await interaction.reply({ embeds: [embed] });
                }

                title = `📊 ${targetUser.username}'s ${game.name} Statistics`;
                embed = EmbedBuilderUtil.createBaseEmbed(title, `Performance in ${game.name}`);

                const stats = gameStats.stats ? JSON.parse(gameStats.stats) : {};

                embed.addFields(
                    { name: 'Level', value: gameStats.level.toString(), inline: true },
                    { name: 'Total XP', value: gameStats.xp.toString(), inline: true },
                    { name: 'Sessions Played', value: gameStats.sessions_played?.toString() || '0', inline: true },
                    { name: 'Best Score', value: gameStats.best_score?.toString() || '0', inline: true },
                    { name: 'Average Score', value: Math.round(gameStats.avg_score || 0).toString(), inline: true }
                );

                // Add game-specific stats
                if (stats.score) {
                    embed.addFields({ name: 'Current Score', value: stats.score.toString(), inline: true });
                }
                if (stats.accuracy) {
                    embed.addFields({ name: 'Accuracy', value: `${(stats.accuracy * 100).toFixed(1)}%`, inline: true });
                }
                if (stats.streak) {
                    embed.addFields({ name: 'Best Streak', value: stats.streak.toString(), inline: true });
                }
                if (stats.category) {
                    embed.addFields({ name: 'Favorite Category', value: stats.category, inline: true });
                }

                if (gameStats.first_played) {
                    const firstPlayed = new Date(gameStats.first_played);
                    embed.addFields({
                        name: 'First Played',
                        value: `<t:${Math.floor(firstPlayed.getTime() / 1000)}:R>`,
                        inline: true
                    });
                }
            }

            // Add last active info
            const user = await Database.getUser(discordId);
            if (user && user.last_active) {
                const lastActive = new Date(user.last_active);
                embed.addFields({
                    name: 'Last Active',
                    value: `<t:${Math.floor(lastActive.getTime() / 1000)}:R>`,
                    inline: true
                });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in games-stats command:', error);
            await interaction.reply({
                content: 'There was an error retrieving game statistics.',
                ephemeral: true
            });
        }
    },
};

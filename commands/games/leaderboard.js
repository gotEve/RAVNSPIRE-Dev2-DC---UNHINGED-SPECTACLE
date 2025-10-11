const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games-leaderboard')
        .setDescription('View game leaderboards')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('The game to view leaderboard for')
                .setRequired(false)
                .addChoices(
                    { name: 'Trivia', value: 'trivia' },
                    { name: 'All Games', value: 'all' }
                ))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(false)
                .addChoices(
                    { name: 'Global', value: 'global' },
                    { name: 'Guild', value: 'guild' },
                    { name: 'Weekly', value: 'weekly' }
                )),
    cooldown: 5,
    async execute(interaction) {
        try {
            const gameType = interaction.options.getString('game') || 'all';
            const leaderboardType = interaction.options.getString('type') || 'global';

            let query;
            let title;
            let description;

            if (gameType === 'all') {
                // Global leaderboard across all games
                if (leaderboardType === 'guild') {
                    query = `
                        SELECT 
                            g.name as guild_name,
                            COUNT(DISTINCT gp.discord_id) as players,
                            SUM(gp.xp) as total_xp,
                            AVG(gp.xp) as avg_xp,
                            MAX(gp.xp) as best_score
                        FROM guilds g
                        JOIN guild_members gm ON g.id = gm.guild_id
                        JOIN game_progress gp ON gm.discord_id = gp.discord_id
                        GROUP BY g.id, g.name
                        ORDER BY total_xp DESC
                        LIMIT 10
                    `;
                    title = '🏆 Guild Leaderboard (All Games)';
                    description = 'Top guilds by total game performance';
                } else {
                    query = `
                        SELECT 
                            u.username,
                            u.global_xp,
                            COUNT(gp.id) as games_played,
                            SUM(gp.xp) as total_game_xp,
                            MAX(gp.xp) as best_score
                        FROM users u
                        LEFT JOIN game_progress gp ON u.discord_id = gp.discord_id
                        GROUP BY u.discord_id, u.username, u.global_xp
                        ORDER BY u.global_xp DESC
                        LIMIT 10
                    `;
                    title = '🏆 Global Leaderboard (All Games)';
                    description = 'Top players by global XP';
                }
            } else {
                // Game-specific leaderboard
                const game = await Database.getGame(gameType);
                if (!game) {
                    return await interaction.reply({
                        content: 'Game not found.',
                        ephemeral: true
                    });
                }

                if (leaderboardType === 'guild') {
                    query = `
                        SELECT 
                            g.name as guild_name,
                            COUNT(DISTINCT gp.discord_id) as players,
                            SUM(gp.xp) as total_xp,
                            AVG(gp.xp) as avg_xp,
                            MAX(gp.xp) as best_score
                        FROM guilds g
                        JOIN guild_members gm ON g.id = gm.guild_id
                        JOIN game_progress gp ON gm.discord_id = gp.discord_id
                        WHERE gp.game_id = $1
                        GROUP BY g.id, g.name
                        ORDER BY total_xp DESC
                        LIMIT 10
                    `;
                    title = `🏆 Guild Leaderboard - ${game.name}`;
                    description = `Top guilds in ${game.name}`;
                } else {
                    query = `
                        SELECT 
                            u.username,
                            gp.xp,
                            gp.level,
                            gp.stats,
                            gp.last_played
                        FROM game_progress gp
                        JOIN users u ON gp.discord_id = u.discord_id
                        WHERE gp.game_id = $1
                        ORDER BY gp.xp DESC
                        LIMIT 10
                    `;
                    title = `🏆 Leaderboard - ${game.name}`;
                    description = `Top players in ${game.name}`;
                }
            }

            const result = await Database.query(query, gameType !== 'all' ? [game.id] : []);
            const entries = result.rows;

            if (entries.length === 0) {
                const embed = EmbedBuilderUtil.createInfoEmbed(
                    'No Data Available',
                    'No leaderboard data available yet. Be the first to play!'
                );
                return await interaction.reply({ embeds: [embed] });
            }

            // Format leaderboard entries
            const leaderboardEntries = entries.map((entry, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                
                if (leaderboardType === 'guild') {
                    return `${medal} **${entry.guild_name}** - ${entry.total_xp} XP (${entry.players} players)`;
                } else if (gameType === 'all') {
                    return `${medal} **${entry.username}** - ${entry.global_xp} XP (${entry.games_played} games)`;
                } else {
                    const stats = entry.stats ? JSON.parse(entry.stats) : {};
                    const score = stats.score || entry.xp;
                    return `${medal} **${entry.username}** - ${score} points (Level ${entry.level})`;
                }
            });

            const embed = EmbedBuilderUtil.createBaseEmbed(title, description);
            embed.setDescription(leaderboardEntries.join('\n'));

            // Add footer with update info
            embed.setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in games-leaderboard command:', error);
            await interaction.reply({
                content: 'There was an error retrieving the leaderboard.',
                ephemeral: true
            });
        }
    },
};

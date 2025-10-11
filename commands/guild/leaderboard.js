const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-leaderboard')
        .setDescription('View guild leaderboards')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(false)
                .addChoices(
                    { name: 'Level', value: 'level' },
                    { name: 'XP', value: 'xp' },
                    { name: 'Members', value: 'members' },
                    { name: 'Activity', value: 'activity' }
                )),
    cooldown: 5,
    async execute(interaction) {
        try {
            const type = interaction.options.getString('type') || 'level';

            let query;
            let title;
            let description;

            switch (type) {
                case 'level':
                    query = `
                        SELECT 
                            g.name,
                            g.level,
                            g.xp,
                            COUNT(gm.discord_id) as member_count
                        FROM guilds g
                        LEFT JOIN guild_members gm ON g.id = gm.guild_id
                        GROUP BY g.id, g.name, g.level, g.xp
                        ORDER BY g.level DESC, g.xp DESC
                        LIMIT 10
                    `;
                    title = '🏆 Guild Level Leaderboard';
                    description = 'Top guilds by level and XP';
                    break;

                case 'xp':
                    query = `
                        SELECT 
                            g.name,
                            g.xp,
                            g.level,
                            COUNT(gm.discord_id) as member_count
                        FROM guilds g
                        LEFT JOIN guild_members gm ON g.id = gm.guild_id
                        GROUP BY g.id, g.name, g.xp, g.level
                        ORDER BY g.xp DESC
                        LIMIT 10
                    `;
                    title = '🏆 Guild XP Leaderboard';
                    description = 'Top guilds by total XP';
                    break;

                case 'members':
                    query = `
                        SELECT 
                            g.name,
                            COUNT(gm.discord_id) as member_count,
                            g.level,
                            g.xp
                        FROM guilds g
                        LEFT JOIN guild_members gm ON g.id = gm.guild_id
                        GROUP BY g.id, g.name, g.level, g.xp
                        ORDER BY member_count DESC, g.level DESC
                        LIMIT 10
                    `;
                    title = '🏆 Guild Member Leaderboard';
                    description = 'Top guilds by member count';
                    break;

                case 'activity':
                    query = `
                        SELECT 
                            g.name,
                            COUNT(DISTINCT gp.discord_id) as active_players,
                            SUM(gp.xp) as total_game_xp,
                            g.level
                        FROM guilds g
                        LEFT JOIN guild_members gm ON g.id = gm.guild_id
                        LEFT JOIN game_progress gp ON gm.discord_id = gp.discord_id
                        GROUP BY g.id, g.name, g.level
                        ORDER BY active_players DESC, total_game_xp DESC
                        LIMIT 10
                    `;
                    title = '🏆 Guild Activity Leaderboard';
                    description = 'Top guilds by active players and game XP';
                    break;
            }

            const result = await Database.query(query);
            const guilds = result.rows;

            if (guilds.length === 0) {
                const embed = EmbedBuilderUtil.createInfoEmbed(
                    'No Guilds Found',
                    'There are no guilds to display in the leaderboard yet.'
                );
                return await interaction.reply({ embeds: [embed] });
            }

            const embed = EmbedBuilderUtil.createBaseEmbed(title, description);

            const leaderboardEntries = guilds.map((guild, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                
                switch (type) {
                    case 'level':
                        return `${medal} **${guild.name}** - Level ${guild.level} (${guild.xp} XP) - ${guild.member_count} members`;
                    case 'xp':
                        return `${medal} **${guild.name}** - ${guild.xp} XP (Level ${guild.level}) - ${guild.member_count} members`;
                    case 'members':
                        return `${medal} **${guild.name}** - ${guild.member_count} members (Level ${guild.level})`;
                    case 'activity':
                        return `${medal} **${guild.name}** - ${guild.active_players} active players (${guild.total_game_xp || 0} game XP)`;
                    default:
                        return `${medal} **${guild.name}** - Level ${guild.level}`;
                }
            });

            embed.setDescription(leaderboardEntries.join('\n'));

            // Add footer with update info
            embed.setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in guild-leaderboard command:', error);
            await interaction.reply({
                content: 'There was an error retrieving the guild leaderboard.',
                ephemeral: true
            });
        }
    },
};

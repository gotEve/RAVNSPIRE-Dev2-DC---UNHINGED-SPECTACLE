const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const globalStatsManager = require('../utils/globalStatsManager');
const factionManager = require('../utils/factionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your global statistics and progression')
        .addSubcommand(subcommand =>
            subcommand
                .setName('global')
                .setDescription('View your comprehensive global statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('variety')
                .setDescription('View your variety bonus breakdown and recommendations'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View global leaderboards')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Leaderboard category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Variety', value: 'variety' },
                            { name: 'Activity', value: 'activity' },
                            { name: 'Games', value: 'games' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('compare')
                .setDescription('Compare your stats with another user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to compare with')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get user's active character
            const activeCharacter = await factionManager.getCurrentCharacter(userId);
            if (!activeCharacter) {
                return await interaction.reply({
                    content: '❌ You need to create a character first! Use `/faction create` to get started.',
                    ephemeral: true
                });
            }

            switch (subcommand) {
                case 'global':
                    await handleGlobalStats(interaction, activeCharacter);
                    break;
                case 'variety':
                    await handleVarietyStats(interaction, activeCharacter);
                    break;
                case 'leaderboard':
                    await handleLeaderboard(interaction);
                    break;
                case 'compare':
                    await handleCompareStats(interaction, activeCharacter);
                    break;
            }

        } catch (error) {
            console.error('Error in stats command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleGlobalStats(interaction, activeCharacter) {
    try {
        const userId = interaction.user.id;
        
        // Get user's global stats
        const userStats = await globalStatsManager.getUserGlobalStats(userId);
        const varietyBonus = await globalStatsManager.calculateVarietyBonus(userId);
        const activityLevel = await globalStatsManager.calculateActivityLevel(userId);

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${interaction.user.username}'s Global Statistics`)
            .setDescription(`Faction: **${activeCharacter.current_faction}** | Character: **${activeCharacter.character_name}**`)
            .setColor(0x0099ff)
            .setTimestamp();

        // Add variety bonus information
        embed.addFields({
            name: '🎯 Variety Bonus',
            value: `**Multiplier:** ${varietyBonus.multiplier}x\n**Category:** ${varietyBonus.category}\n**Games Played:** ${varietyBonus.uniqueGames}/${varietyBonus.totalGames}`,
            inline: true
        });

        // Add activity level information
        embed.addFields({
            name: '⚡ Activity Level',
            value: `**Level:** ${activityLevel.level}\n**Daily Average:** ${activityLevel.avgDailyActivity.toFixed(1)}\n**Recent Activity:** ${activityLevel.recentActivity}`,
            inline: true
        });

        // Add detailed stats if available
        if (userStats && userStats.stats_data) {
            const statsData = userStats.stats_data;
            
            // Game statistics
            if (statsData.games_played && Object.keys(statsData.games_played).length > 0) {
                const gameStats = Object.entries(statsData.games_played)
                    .map(([game, data]) => `${game}: ${data.times_played} plays`)
                    .join('\n');
                
                embed.addFields({
                    name: '🎮 Game Statistics',
                    value: gameStats,
                    inline: true
                });
            }

            // Social statistics
            if (statsData.social_activity && Object.keys(statsData.social_activity).length > 0) {
                const socialStats = Object.entries(statsData.social_activity)
                    .map(([type, data]) => `${type}: ${data.count}`)
                    .join('\n');
                
                embed.addFields({
                    name: '👥 Social Activity',
                    value: socialStats,
                    inline: true
                });
            }

            // Faction statistics
            if (statsData.faction_activity && Object.keys(statsData.faction_activity).length > 0) {
                const factionStats = Object.entries(statsData.faction_activity)
                    .map(([faction, data]) => `${faction}: ${data.activities}`)
                    .join('\n');
                
                embed.addFields({
                    name: '🏛️ Faction Activity',
                    value: factionStats,
                    inline: true
                });
            }
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleVarietyStats(interaction, activeCharacter) {
    try {
        const userId = interaction.user.id;
        
        const varietyBreakdown = await globalStatsManager.getVarietyBreakdown(userId);

        if (!varietyBreakdown) {
            return await interaction.reply({
                content: '❌ Unable to retrieve variety statistics.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎯 Variety Bonus Breakdown`)
            .setDescription(`Detailed analysis of your game variety and bonus calculations`)
            .setColor(0x00ff00)
            .setTimestamp();

        // Current variety bonus
        embed.addFields({
            name: '📈 Current Bonus',
            value: `**Multiplier:** ${varietyBreakdown.current.multiplier}x\n**Variety Score:** ${(varietyBreakdown.current.variety * 100).toFixed(1)}%\n**Category:** ${varietyBreakdown.current.category}`,
            inline: false
        });

        // Games played breakdown
        if (varietyBreakdown.games.length > 0) {
            const gamesBreakdown = varietyBreakdown.games
                .map(game => `${game.game_type}: ${game.times_played} plays`)
                .join('\n');
            
            embed.addFields({
                name: '🎮 Games Played',
                value: gamesBreakdown,
                inline: true
            });
        }

        // Available games
        if (varietyBreakdown.available.length > 0) {
            const availableGames = varietyBreakdown.available.join(', ');
            embed.addFields({
                name: '🎲 Available Games',
                value: availableGames,
                inline: true
            });
        }

        // Recommendations
        if (varietyBreakdown.recommendations.length > 0) {
            embed.addFields({
                name: '💡 Recommendations',
                value: varietyBreakdown.recommendations.join('\n'),
                inline: false
            });
        }

        // Variety bonus explanation
        embed.addFields({
            name: '📚 How Variety Bonus Works',
            value: `• **Low (0-20%)**: 1.0x multiplier\n• **Medium (20-50%)**: 1.1x multiplier\n• **High (50-80%)**: 1.25x multiplier\n• **Max (80-100%)**: 1.5x multiplier`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleLeaderboard(interaction) {
    const category = interaction.options.getString('category') || 'variety';
    
    try {
        const leaderboard = await globalStatsManager.getGlobalLeaderboards(category, 10);

        const embed = new EmbedBuilder()
            .setTitle(`🏆 Global Leaderboard - ${category.charAt(0).toUpperCase() + category.slice(1)}`)
            .setDescription(`Top players in the ${category} category`)
            .setColor(0xffd700)
            .setTimestamp();

        if (leaderboard.length === 0) {
            embed.setDescription('No leaderboard data available yet.');
        } else {
            leaderboard.forEach((entry, index) => {
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                
                let value = '';
                switch (category) {
                    case 'variety':
                        value = `Variety: ${(entry.variety_score * 100).toFixed(1)}% | Level: ${entry.activity_level}`;
                        break;
                    case 'activity':
                        value = `Level: ${entry.activity_level} | Last Active: <t:${Math.floor(new Date(entry.last_calculated).getTime() / 1000)}:R>`;
                        break;
                    case 'games':
                        const statsData = JSON.parse(entry.stats_data || '{}');
                        const totalGames = Object.values(statsData.games_played || {}).reduce((sum, game) => sum + game.times_played, 0);
                        value = `Total Games: ${totalGames}`;
                        break;
                }
                
                embed.addFields({
                    name: `${medal} <@${entry.discord_id}>`,
                    value: value,
                    inline: false
                });
            });
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleCompareStats(interaction, activeCharacter) {
    const targetUser = interaction.options.getUser('user');
    
    try {
        const userId = interaction.user.id;
        const targetUserId = targetUser.id;

        // Get stats for both users
        const userStats = await globalStatsManager.getUserGlobalStats(userId);
        const targetStats = await globalStatsManager.getUserGlobalStats(targetUserId);
        const userVariety = await globalStatsManager.calculateVarietyBonus(userId);
        const targetVariety = await globalStatsManager.calculateVarietyBonus(targetUserId);
        const userActivity = await globalStatsManager.calculateActivityLevel(userId);
        const targetActivity = await globalStatsManager.calculateActivityLevel(targetUserId);

        const embed = new EmbedBuilder()
            .setTitle(`⚖️ Statistics Comparison`)
            .setDescription(`Comparing ${interaction.user.username} vs ${targetUser.username}`)
            .setColor(0x0099ff)
            .setTimestamp();

        // Variety comparison
        embed.addFields({
            name: '🎯 Variety Bonus',
            value: `**${interaction.user.username}:** ${userVariety.multiplier}x (${userVariety.category})\n**${targetUser.username}:** ${targetVariety.multiplier}x (${targetVariety.category})`,
            inline: false
        });

        // Activity comparison
        embed.addFields({
            name: '⚡ Activity Level',
            value: `**${interaction.user.username}:** ${userActivity.level} (${userActivity.avgDailyActivity.toFixed(1)}/day)\n**${targetUser.username}:** ${targetActivity.level} (${targetActivity.avgDailyActivity.toFixed(1)}/day)`,
            inline: false
        });

        // Games comparison
        const userGames = userVariety.uniqueGames;
        const targetGames = targetVariety.uniqueGames;
        embed.addFields({
            name: '🎮 Games Played',
            value: `**${interaction.user.username}:** ${userGames} unique games\n**${targetUser.username}:** ${targetGames} unique games`,
            inline: false
        });

        // Overall comparison
        const userScore = userVariety.multiplier + (userActivity.level === 'hardcore' ? 0.5 : userActivity.level === 'active' ? 0.25 : 0);
        const targetScore = targetVariety.multiplier + (targetActivity.level === 'hardcore' ? 0.5 : targetActivity.level === 'active' ? 0.25 : 0);
        
        let winner = 'Tie';
        if (userScore > targetScore) {
            winner = interaction.user.username;
        } else if (targetScore > userScore) {
            winner = targetUser.username;
        }

        embed.addFields({
            name: '🏆 Overall Score',
            value: `**Winner:** ${winner}\n**${interaction.user.username}:** ${userScore.toFixed(2)}\n**${targetUser.username}:** ${targetScore.toFixed(2)}`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const achievementConfig = require('../../config/achievementConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievements-progress')
        .setDescription('Track progress toward locked achievements')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Filter by achievement category')
                .setRequired(false)
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: 'Global', value: 'global' },
                    { name: 'Games', value: 'game' },
                    { name: 'Guild', value: 'guild' },
                    { name: 'Lore', value: 'lore' },
                    { name: 'Social', value: 'social' },
                    { name: 'Neighborhood', value: 'neighborhood' }
                )),
    cooldown: 5,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const category = interaction.options.getString('category') || 'all';

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            // Get all achievements
            let query = 'SELECT * FROM achievements WHERE hidden = false';
            const params = [];

            if (category !== 'all') {
                query += ' AND category = $1';
                params.push(category);
            }

            query += ' ORDER BY category, name';

            const allAchievementsResult = await Database.query(query, params);
            const allAchievements = allAchievementsResult.rows;

            // Get user's unlocked achievements
            const unlockedQuery = 'SELECT achievement_id FROM user_achievements WHERE discord_id = $1';
            const unlockedResult = await Database.query(unlockedQuery, [userId]);
            const unlockedIds = new Set(unlockedResult.rows.map(row => row.achievement_id));

            // Filter to locked achievements
            const lockedAchievements = allAchievements.filter(achievement => 
                !unlockedIds.has(achievement.id)
            );

            if (lockedAchievements.length === 0) {
                const embed = EmbedBuilderUtil.createSuccessEmbed(
                    'All Achievements Unlocked!',
                    category === 'all' 
                        ? 'Congratulations! You have unlocked all available achievements!'
                        : `Congratulations! You have unlocked all ${category} achievements!`
                );
                return await interaction.reply({ embeds: [embed] });
            }

            // Calculate progress for each locked achievement
            const achievementsWithProgress = [];
            
            for (const achievement of lockedAchievements) {
                const progress = await this.calculateAchievementProgress(userId, achievement);
                achievementsWithProgress.push({
                    ...achievement,
                    progress
                });
            }

            // Sort by progress (highest first)
            achievementsWithProgress.sort((a, b) => b.progress.percentage - a.progress.percentage);

            const embed = EmbedBuilderUtil.createBaseEmbed(
                `📈 Achievement Progress`,
                `Tracking progress toward ${achievementsWithProgress.length} locked achievement${achievementsWithProgress.length === 1 ? '' : 's'}`
            );

            // Group by category
            const achievementsByCategory = {};
            achievementsWithProgress.forEach(achievement => {
                if (!achievementsByCategory[achievement.category]) {
                    achievementsByCategory[achievement.category] = [];
                }
                achievementsByCategory[achievement.category].push(achievement);
            });

            // Add progress for each category
            Object.entries(achievementsByCategory).forEach(([cat, catAchievements]) => {
                const categoryConfig = achievementConfig.categories[cat];
                const categoryName = categoryConfig ? categoryConfig.name : cat.charAt(0).toUpperCase() + cat.slice(1);
                
                const progressList = catAchievements.map(achievement => {
                    const rarity = achievement.rarity || 'common';
                    const rarityEmoji = this.getRarityEmoji(rarity);
                    const progressBar = this.createProgressBar(achievement.progress.percentage);
                    
                    return `${rarityEmoji} **${achievement.name}**\n${progressBar} ${achievement.progress.percentage}%\n${achievement.progress.description}`;
                }).join('\n\n');

                embed.addFields({
                    name: `${categoryName} (${catAchievements.length})`,
                    value: progressList,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in achievements progress command:', error);
            await interaction.reply({
                content: 'There was an error retrieving achievement progress.',
                ephemeral: true
            });
        }
    },

    async calculateAchievementProgress(userId, achievement) {
        const requirements = achievement.requirements;
        let totalProgress = 0;
        let maxProgress = 0;
        const progressDetails = [];

        for (const [requirement, targetValue] of Object.entries(requirements)) {
            let currentValue = 0;
            let description = '';

            switch (requirement) {
                case 'games_played':
                    const gamesPlayedResult = await Database.query(
                        'SELECT COUNT(*) as count FROM game_progress WHERE discord_id = $1',
                        [userId]
                    );
                    currentValue = parseInt(gamesPlayedResult.rows[0].count);
                    description = `Games played: ${currentValue}/${targetValue}`;
                    break;

                case 'level':
                    const user = await Database.getUser(userId);
                    currentValue = Math.floor(user.global_xp / 100) + 1;
                    description = `Level: ${currentValue}/${targetValue}`;
                    break;

                case 'perfect_score':
                    // This would need to be tracked in game sessions
                    currentValue = 0; // Placeholder
                    description = `Perfect scores: ${currentValue}/${targetValue}`;
                    break;

                case 'streak':
                    // This would need to be tracked in game sessions
                    currentValue = 0; // Placeholder
                    description = `Best streak: ${currentValue}/${targetValue}`;
                    break;

                case 'guild_created':
                    const guildCreatedResult = await Database.query(
                        'SELECT COUNT(*) as count FROM guilds WHERE owner_id = $1',
                        [userId]
                    );
                    currentValue = parseInt(guildCreatedResult.rows[0].count);
                    description = `Guilds created: ${currentValue}/${targetValue}`;
                    break;

                case 'guild_level':
                    const guildInfo = await Database.getUserGuild(userId);
                    currentValue = guildInfo ? guildInfo.level : 0;
                    description = `Guild level: ${currentValue}/${targetValue}`;
                    break;

                case 'lore_discovered':
                    const loreDiscoveredResult = await Database.query(
                        'SELECT COUNT(*) as count FROM lore_discoveries WHERE discord_id = $1',
                        [userId]
                    );
                    currentValue = parseInt(loreDiscoveredResult.rows[0].count);
                    description = `Lore discovered: ${currentValue}/${targetValue}`;
                    break;

                case 'hidden_lore_discovered':
                    const hiddenLoreResult = await Database.query(
                        'SELECT COUNT(*) as count FROM lore_discoveries ld JOIN lore_entries le ON ld.lore_id = le.id WHERE ld.discord_id = $1 AND le.hidden = true',
                        [userId]
                    );
                    currentValue = parseInt(hiddenLoreResult.rows[0].count);
                    description = `Hidden lore discovered: ${currentValue}/${targetValue}`;
                    break;

                case 'neighborhood_joined':
                    const neighborhoodJoinedResult = await Database.query(
                        'SELECT COUNT(*) as count FROM neighborhood_plots np JOIN guild_members gm ON np.guild_id = gm.guild_id WHERE gm.discord_id = $1',
                        [userId]
                    );
                    currentValue = parseInt(neighborhoodJoinedResult.rows[0].count);
                    description = `Neighborhoods joined: ${currentValue}/${targetValue}`;
                    break;

                case 'neighborhood_contributions':
                    const contributionsResult = await Database.query(
                        'SELECT SUM(amount) as total FROM neighborhood_contributions nc JOIN guild_members gm ON nc.guild_id = gm.guild_id WHERE gm.discord_id = $1',
                        [userId]
                    );
                    currentValue = parseInt(contributionsResult.rows[0].total) || 0;
                    description = `Contributions: ${currentValue}/${targetValue}`;
                    break;

                default:
                    currentValue = 0;
                    description = `${requirement}: ${currentValue}/${targetValue}`;
            }

            const requirementProgress = Math.min(currentValue / targetValue, 1);
            totalProgress += requirementProgress;
            maxProgress += 1;
            progressDetails.push(description);
        }

        const percentage = maxProgress > 0 ? Math.round((totalProgress / maxProgress) * 100) : 0;
        const description = progressDetails.join('\n');

        return {
            percentage,
            description,
            details: progressDetails
        };
    },

    createProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    },

    getRarityEmoji(rarity) {
        const rarityEmojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟠'
        };
        return rarityEmojis[rarity] || '⚪';
    }
};

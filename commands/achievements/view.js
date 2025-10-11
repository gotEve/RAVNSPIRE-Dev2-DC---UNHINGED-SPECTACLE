const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const achievementConfig = require('../../config/achievementConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('View achievements')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view achievements for')
                .setRequired(false))
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
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const category = interaction.options.getString('category') || 'all';
            const discordId = targetUser.id;

            // Ensure user exists in database
            await Database.createUser(discordId, targetUser.username);

            // Get user's achievements
            let query = `
                SELECT ua.*, a.name, a.description, a.category, a.type, a.rarity, a.rewards
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.discord_id = $1
            `;
            const params = [discordId];

            if (category !== 'all') {
                query += ' AND a.category = $2';
                params.push(category);
            }

            query += ' ORDER BY ua.unlocked_at DESC';

            const result = await Database.query(query, params);
            const achievements = result.rows;

            if (achievements.length === 0) {
                const embed = EmbedBuilderUtil.createInfoEmbed(
                    'No Achievements Yet',
                    category === 'all' 
                        ? `${targetUser.username} hasn't unlocked any achievements yet.`
                        : `${targetUser.username} hasn't unlocked any ${category} achievements yet.`
                );
                return await interaction.reply({ embeds: [embed] });
            }

            // Group achievements by category
            const achievementsByCategory = {};
            achievements.forEach(achievement => {
                if (!achievementsByCategory[achievement.category]) {
                    achievementsByCategory[achievement.category] = [];
                }
                achievementsByCategory[achievement.category].push(achievement);
            });

            const embed = EmbedBuilderUtil.createBaseEmbed(
                `🏆 ${targetUser.username}'s Achievements`,
                `Unlocked ${achievements.length} achievement${achievements.length === 1 ? '' : 's'}!`
            );

            // Add achievements by category
            Object.entries(achievementsByCategory).forEach(([cat, catAchievements]) => {
                const categoryConfig = achievementConfig.categories[cat];
                const categoryName = categoryConfig ? categoryConfig.name : cat.charAt(0).toUpperCase() + cat.slice(1);
                
                const achievementList = catAchievements.map(achievement => {
                    const rarity = achievement.rarity || 'common';
                    const rarityConfig = achievementConfig.achievements.rarities[rarity];
                    const rarityEmoji = this.getRarityEmoji(rarity);
                    
                    return `${rarityEmoji} **${achievement.name}** - ${achievement.description}`;
                }).join('\n');

                embed.addFields({
                    name: `${categoryName} (${catAchievements.length})`,
                    value: achievementList,
                    inline: false
                });
            });

            // Add rarity breakdown
            const rarityCounts = {};
            achievements.forEach(achievement => {
                const rarity = achievement.rarity || 'common';
                rarityCounts[rarity] = (rarityCounts[rarity] || 0) + 1;
            });

            const rarityText = Object.entries(rarityCounts)
                .map(([rarity, count]) => `${this.getRarityEmoji(rarity)} ${rarity}: ${count}`)
                .join(' | ');

            embed.addFields({
                name: 'Rarity Breakdown',
                value: rarityText,
                inline: false
            });

            // Add footer with total count
            embed.setFooter({ text: `Total: ${achievements.length} achievements unlocked` });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in achievements view command:', error);
            await interaction.reply({
                content: 'There was an error retrieving achievements.',
                ephemeral: true
            });
        }
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

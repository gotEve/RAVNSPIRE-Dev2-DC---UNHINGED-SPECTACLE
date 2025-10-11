const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievements-recent')
        .setDescription('View recently unlocked achievements')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of achievements to show (1-20)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20))
        .addStringOption(option =>
            option.setName('scope')
                .setDescription('Show achievements for')
                .setRequired(false)
                .addChoices(
                    { name: 'You', value: 'user' },
                    { name: 'Server', value: 'server' }
                )),
    cooldown: 5,
    async execute(interaction) {
        try {
            const limit = interaction.options.getInteger('limit') || 10;
            const scope = interaction.options.getString('scope') || 'user';

            let query;
            let title;
            let description;

            if (scope === 'user') {
                const userId = interaction.user.id;
                
                // Ensure user exists in database
                await Database.createUser(userId, interaction.user.username);

                query = `
                    SELECT ua.*, a.name, a.description, a.category, a.type, a.rarity, a.rewards
                    FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.discord_id = $1
                    ORDER BY ua.unlocked_at DESC
                    LIMIT $2
                `;
                const result = await Database.query(query, [userId, limit]);
                const achievements = result.rows;

                if (achievements.length === 0) {
                    const embed = EmbedBuilderUtil.createInfoEmbed(
                        'No Recent Achievements',
                        'You haven\'t unlocked any achievements yet. Start playing games to earn your first achievement!'
                    );
                    return await interaction.reply({ embeds: [embed] });
                }

                title = `🏆 Your Recent Achievements`;
                description = `Your last ${achievements.length} unlocked achievement${achievements.length === 1 ? '' : 's'}`;

                const embed = EmbedBuilderUtil.createBaseEmbed(title, description);

                achievements.forEach((achievement, index) => {
                    const rarity = achievement.rarity || 'common';
                    const rarityEmoji = this.getRarityEmoji(rarity);
                    const unlockedAt = new Date(achievement.unlocked_at);
                    
                    embed.addFields({
                        name: `${rarityEmoji} ${achievement.name}`,
                        value: `${achievement.description}\n*Unlocked <t:${Math.floor(unlockedAt.getTime() / 1000)}:R>*`,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed] });

            } else {
                // Server-wide recent achievements
                query = `
                    SELECT ua.*, a.name, a.description, a.category, a.type, a.rarity, a.rewards, u.username
                    FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    JOIN users u ON ua.discord_id = u.discord_id
                    WHERE ua.unlocked_at > NOW() - INTERVAL '7 days'
                    ORDER BY ua.unlocked_at DESC
                    LIMIT $1
                `;
                const result = await Database.query(query, [limit]);
                const achievements = result.rows;

                if (achievements.length === 0) {
                    const embed = EmbedBuilderUtil.createInfoEmbed(
                        'No Recent Achievements',
                        'No achievements have been unlocked in the past 7 days.'
                    );
                    return await interaction.reply({ embeds: [embed] });
                }

                title = `🏆 Recent Server Achievements`;
                description = `Achievements unlocked in the past 7 days`;

                const embed = EmbedBuilderUtil.createBaseEmbed(title, description);

                achievements.forEach((achievement, index) => {
                    const rarity = achievement.rarity || 'common';
                    const rarityEmoji = this.getRarityEmoji(rarity);
                    const unlockedAt = new Date(achievement.unlocked_at);
                    
                    embed.addFields({
                        name: `${rarityEmoji} ${achievement.name}`,
                        value: `**${achievement.username}** - ${achievement.description}\n*Unlocked <t:${Math.floor(unlockedAt.getTime() / 1000)}:R>*`,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in achievements recent command:', error);
            await interaction.reply({
                content: 'There was an error retrieving recent achievements.',
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

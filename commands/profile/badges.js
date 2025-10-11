const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile-badges')
        .setDescription('View and manage your badges')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View all your badges'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('equip')
                .setDescription('Equip a badge')
                .addStringOption(option =>
                    option.setName('badge')
                        .setDescription('The badge to equip')
                        .setRequired(true))),
    cooldown: 5,
    async execute(interaction) {
        try {
            const discordId = interaction.user.id;
            const subcommand = interaction.options.getSubcommand();

            // Ensure user exists in database
            await Database.createUser(discordId, interaction.user.username);

            if (subcommand === 'view') {
                // Get user's achievements that have badges
                const badgeQuery = `
                    SELECT ua.*, a.name, a.description, a.rewards
                    FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.discord_id = $1 AND a.rewards ? 'badge'
                    ORDER BY ua.unlocked_at DESC
                `;
                const badgeResult = await Database.query(badgeQuery, [discordId]);
                const badges = badgeResult.rows;

                // Get equipped badges
                const profileQuery = 'SELECT equipped_badges FROM user_profiles WHERE discord_id = $1';
                const profileResult = await Database.query(profileQuery, [discordId]);
                const equippedBadges = profileResult.rows[0]?.equipped_badges || [];

                if (badges.length === 0) {
                    const embed = EmbedBuilderUtil.createInfoEmbed(
                        'No Badges Yet',
                        'You haven\'t earned any badges yet. Play games and complete achievements to unlock badges!'
                    );
                    return await interaction.reply({ embeds: [embed] });
                }

                const embed = EmbedBuilderUtil.createBaseEmbed(
                    '🏆 Your Badges',
                    `You have earned ${badges.length} badge${badges.length === 1 ? '' : 's'}!`
                );

                // Group badges by category
                const badgeCategories = {};
                badges.forEach(badge => {
                    const badgeName = badge.rewards.badge;
                    if (!badgeCategories[badge.category]) {
                        badgeCategories[badge.category] = [];
                    }
                    badgeCategories[badge.category].push({
                        name: badgeName,
                        description: badge.description,
                        equipped: equippedBadges.includes(badgeName),
                        unlocked: badge.unlocked_at
                    });
                });

                // Add badge fields
                Object.entries(badgeCategories).forEach(([category, categoryBadges]) => {
                    const badgeList = categoryBadges.map(badge => {
                        const status = badge.equipped ? '✅' : '⚪';
                        return `${status} **${badge.name}** - ${badge.description}`;
                    }).join('\n');

                    embed.addFields({
                        name: category.charAt(0).toUpperCase() + category.slice(1),
                        value: badgeList,
                        inline: false
                    });
                });

                embed.setFooter({ text: '✅ = Equipped | ⚪ = Available' });

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'equip') {
                const badgeName = interaction.options.getString('badge');

                // Check if user has this badge
                const badgeQuery = `
                    SELECT ua.*, a.name, a.rewards
                    FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.discord_id = $1 AND a.rewards->>'badge' = $2
                `;
                const badgeResult = await Database.query(badgeQuery, [discordId, badgeName]);

                if (badgeResult.rows.length === 0) {
                    return await interaction.reply({
                        content: `You haven't unlocked the badge "${badgeName}" yet!`,
                        ephemeral: true
                    });
                }

                // Get current equipped badges
                const profileQuery = 'SELECT equipped_badges FROM user_profiles WHERE discord_id = $1';
                const profileResult = await Database.query(profileQuery, [discordId]);
                let equippedBadges = profileResult.rows[0]?.equipped_badges || [];

                // Check if badge is already equipped
                if (equippedBadges.includes(badgeName)) {
                    return await interaction.reply({
                        content: `The badge "${badgeName}" is already equipped!`,
                        ephemeral: true
                    });
                }

                // Add badge to equipped list (max 3 badges)
                if (equippedBadges.length >= 3) {
                    return await interaction.reply({
                        content: 'You can only equip up to 3 badges at a time!',
                        ephemeral: true
                    });
                }

                equippedBadges.push(badgeName);

                // Update equipped badges
                const updateQuery = `
                    INSERT INTO user_profiles (discord_id, equipped_badges, updated_at) 
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    ON CONFLICT (discord_id) 
                    DO UPDATE SET equipped_badges = $2, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `;
                await Database.query(updateQuery, [discordId, JSON.stringify(equippedBadges)]);

                const embed = EmbedBuilderUtil.createSuccessEmbed(
                    'Badge Equipped',
                    `You have equipped the badge: **${badgeName}**`
                );

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in profile-badges command:', error);
            await interaction.reply({
                content: 'There was an error managing your badges.',
                ephemeral: true
            });
        }
    },
};

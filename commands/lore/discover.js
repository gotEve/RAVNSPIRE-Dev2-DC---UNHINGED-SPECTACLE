const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lore-discover')
        .setDescription('Check your lore discovery progress')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Filter by category')
                .setRequired(false)
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: 'Characters', value: 'characters' },
                    { name: 'Locations', value: 'locations' },
                    { name: 'Events', value: 'events' },
                    { name: 'Timeline', value: 'timeline' },
                    { name: 'Items', value: 'items' },
                    { name: 'Factions', value: 'factions' }
                )),
    cooldown: 5,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const category = interaction.options.getString('category') || 'all';

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            // Get user's discovered lore
            let discoveryQuery = `
                SELECT ld.*, le.title, le.category, le.hidden
                FROM lore_discoveries ld
                JOIN lore_entries le ON ld.lore_id = le.id
                WHERE ld.discord_id = $1
            `;
            const params = [userId];

            if (category !== 'all') {
                discoveryQuery += ' AND le.category = $2';
                params.push(category);
            }

            discoveryQuery += ' ORDER BY ld.discovered_at DESC';

            const discoveryResult = await Database.query(discoveryQuery, params);
            const discoveredLore = discoveryResult.rows;

            // Get total lore entries for comparison
            let totalQuery = 'SELECT COUNT(*) as total FROM lore_entries WHERE hidden = false';
            if (category !== 'all') {
                totalQuery += ' AND category = $1';
                const totalResult = await Database.query(totalQuery, [category]);
                var totalLore = parseInt(totalResult.rows[0].total);
            } else {
                const totalResult = await Database.query(totalQuery);
                var totalLore = parseInt(totalResult.rows[0].total);
            }

            // Get hidden lore count
            let hiddenQuery = 'SELECT COUNT(*) as total FROM lore_entries WHERE hidden = true';
            if (category !== 'all') {
                hiddenQuery += ' AND category = $1';
                const hiddenResult = await Database.query(hiddenQuery, [category]);
                var hiddenLore = parseInt(hiddenResult.rows[0].total);
            } else {
                const hiddenResult = await Database.query(hiddenQuery);
                var hiddenLore = parseInt(hiddenResult.rows[0].total);
            }

            const totalDiscoverable = totalLore + hiddenLore;
            const discoveredCount = discoveredLore.length;
            const discoveryPercentage = totalDiscoverable > 0 ? Math.round((discoveredCount / totalDiscoverable) * 100) : 0;

            const categoryName = category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1);

            const embed = EmbedBuilderUtil.createBaseEmbed(
                `📚 Lore Discovery Progress - ${categoryName}`,
                `Your progress in discovering the secrets of Ravnspire`
            );

            // Add progress summary
            embed.addFields(
                { name: 'Discovered', value: discoveredCount.toString(), inline: true },
                { name: 'Total Available', value: totalDiscoverable.toString(), inline: true },
                { name: 'Progress', value: `${discoveryPercentage}%`, inline: true },
                { name: 'Public Lore', value: totalLore.toString(), inline: true },
                { name: 'Hidden Lore', value: hiddenLore.toString(), inline: true }
            );

            // Add progress bar
            const progressBar = this.createProgressBar(discoveryPercentage);
            embed.addFields({
                name: 'Discovery Progress',
                value: `${progressBar} ${discoveryPercentage}%`,
                inline: false
            });

            // Add recent discoveries
            if (discoveredLore.length > 0) {
                const recentDiscoveries = discoveredLore.slice(0, 5).map(entry => {
                    const discoveredAt = new Date(entry.discovered_at);
                    const hiddenIndicator = entry.hidden ? ' 🔒' : '';
                    return `• **${entry.title}**${hiddenIndicator} - <t:${Math.floor(discoveredAt.getTime() / 1000)}:R>`;
                }).join('\n');

                embed.addFields({
                    name: 'Recent Discoveries',
                    value: recentDiscoveries,
                    inline: false
                });
            }

            // Add category breakdown if viewing all
            if (category === 'all') {
                const categoryBreakdown = await this.getCategoryBreakdown(userId);
                if (categoryBreakdown.length > 0) {
                    const breakdownText = categoryBreakdown.map(cat => 
                        `**${cat.category}**: ${cat.discovered}/${cat.total} (${cat.percentage}%)`
                    ).join('\n');

                    embed.addFields({
                        name: 'Category Breakdown',
                        value: breakdownText,
                        inline: false
                    });
                }
            }

            // Add tips for discovery
            embed.addFields({
                name: 'How to Discover More Lore',
                value: '• Complete achievements to unlock hidden lore\n• Play games and reach milestones\n• Participate in guild and neighborhood activities\n• Explore different categories with `/lore-category`',
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in lore-discover command:', error);
            await interaction.reply({
                content: 'There was an error retrieving your lore discovery progress.',
                ephemeral: true
            });
        }
    },

    async getCategoryBreakdown(userId) {
        const categories = ['characters', 'locations', 'events', 'timeline', 'items', 'factions'];
        const breakdown = [];

        for (const category of categories) {
            // Get discovered count
            const discoveredQuery = `
                SELECT COUNT(*) as count
                FROM lore_discoveries ld
                JOIN lore_entries le ON ld.lore_id = le.id
                WHERE ld.discord_id = $1 AND le.category = $2
            `;
            const discoveredResult = await Database.query(discoveredQuery, [userId, category]);
            const discovered = parseInt(discoveredResult.rows[0].count);

            // Get total count
            const totalQuery = 'SELECT COUNT(*) as count FROM lore_entries WHERE category = $1';
            const totalResult = await Database.query(totalQuery, [category]);
            const total = parseInt(totalResult.rows[0].count);

            if (total > 0) {
                const percentage = Math.round((discovered / total) * 100);
                breakdown.push({
                    category: category.charAt(0).toUpperCase() + category.slice(1),
                    discovered,
                    total,
                    percentage
                });
            }
        }

        return breakdown;
    },

    createProgressBar(percentage, length = 20) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
};

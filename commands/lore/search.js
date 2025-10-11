const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lore-search')
        .setDescription('Search for lore entries')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('What to search for')
                .setRequired(true))
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
            const query = interaction.options.getString('query');
            const category = interaction.options.getString('category') || 'all';

            // Ensure user exists in database
            await Database.createUser(interaction.user.id, interaction.user.username);

            // Search for lore entries
            const loreEntries = await Database.searchLore(query, category === 'all' ? null : category);

            if (loreEntries.length === 0) {
                const embed = EmbedBuilderUtil.createInfoEmbed(
                    'No Results Found',
                    `No lore entries found for "${query}"${category !== 'all' ? ` in the ${category} category` : ''}.`
                );
                return await interaction.reply({ embeds: [embed] });
            }

            // Limit results to prevent embed overflow
            const maxResults = 10;
            const limitedResults = loreEntries.slice(0, maxResults);

            const embed = EmbedBuilderUtil.createBaseEmbed(
                `📚 Lore Search Results`,
                `Found ${loreEntries.length} result${loreEntries.length === 1 ? '' : 's'} for "${query}"`
            );

            // Add search results
            const resultList = limitedResults.map((entry, index) => {
                const categoryEmoji = this.getCategoryEmoji(entry.category);
                const hiddenIndicator = entry.hidden ? ' 🔒' : '';
                return `${index + 1}. ${categoryEmoji} **${entry.title}**${hiddenIndicator}\n   *${entry.category}* - ${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}`;
            }).join('\n\n');

            embed.addFields({
                name: 'Results',
                value: resultList,
                inline: false
            });

            if (loreEntries.length > maxResults) {
                embed.addFields({
                    name: 'Note',
                    value: `Showing first ${maxResults} results. Use more specific search terms to narrow down results.`,
                    inline: false
                });
            }

            // Create select menu for viewing specific entries
            if (limitedResults.length > 0) {
                const selectMenu = new (require('discord.js')).StringSelectMenuBuilder()
                    .setCustomId('lore_view_select')
                    .setPlaceholder('Select a lore entry to view...')
                    .addOptions(
                        limitedResults.map(entry => ({
                            label: entry.title,
                            description: entry.content.substring(0, 100),
                            value: entry.id.toString(),
                            emoji: this.getCategoryEmoji(entry.category)
                        }))
                    );

                const actionRow = new (require('discord.js')).ActionRowBuilder()
                    .addComponents(selectMenu);

                await interaction.reply({
                    embeds: [embed],
                    components: [actionRow]
                });
            } else {
                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in lore-search command:', error);
            await interaction.reply({
                content: 'There was an error searching for lore entries.',
                ephemeral: true
            });
        }
    },

    getCategoryEmoji(category) {
        const categoryEmojis = {
            characters: '👤',
            locations: '🏰',
            events: '📅',
            timeline: '⏰',
            items: '⚔️',
            factions: '🏴'
        };
        return categoryEmojis[category] || '📖';
    }
};

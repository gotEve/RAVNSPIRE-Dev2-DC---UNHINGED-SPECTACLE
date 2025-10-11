const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lore-category')
        .setDescription('Browse lore by category')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category to browse')
                .setRequired(true)
                .addChoices(
                    { name: 'Characters', value: 'characters' },
                    { name: 'Locations', value: 'locations' },
                    { name: 'Events', value: 'events' },
                    { name: 'Timeline', value: 'timeline' },
                    { name: 'Items', value: 'items' },
                    { name: 'Factions', value: 'factions' }
                ))
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number (1-10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)),
    cooldown: 5,
    async execute(interaction) {
        try {
            const category = interaction.options.getString('category');
            const page = interaction.options.getInteger('page') || 1;
            const itemsPerPage = 10;

            // Ensure user exists in database
            await Database.createUser(interaction.user.id, interaction.user.username);

            // Get lore entries for the category
            const loreEntries = await Database.getLoreByCategory(category);

            if (loreEntries.length === 0) {
                const embed = EmbedBuilderUtil.createInfoEmbed(
                    'No Lore Entries',
                    `No lore entries found in the ${category} category yet.`
                );
                return await interaction.reply({ embeds: [embed] });
            }

            // Calculate pagination
            const totalPages = Math.ceil(loreEntries.length / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageEntries = loreEntries.slice(startIndex, endIndex);

            const categoryEmoji = this.getCategoryEmoji(category);
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

            const embed = EmbedBuilderUtil.createBaseEmbed(
                `${categoryEmoji} ${categoryName} Lore`,
                `Browse ${categoryName.toLowerCase()} in the Ravnspire universe`
            );

            // Add lore entries for this page
            const entryList = pageEntries.map((entry, index) => {
                const globalIndex = startIndex + index + 1;
                const hiddenIndicator = entry.hidden ? ' 🔒' : '';
                return `${globalIndex}. **${entry.title}**${hiddenIndicator}\n   ${entry.content.substring(0, 150)}${entry.content.length > 150 ? '...' : ''}`;
            }).join('\n\n');

            embed.addFields({
                name: `Entries (${startIndex + 1}-${Math.min(endIndex, loreEntries.length)} of ${loreEntries.length})`,
                value: entryList,
                inline: false
            });

            // Add pagination info
            embed.setFooter({ text: `Page ${page} of ${totalPages} | Use /lore-category ${category} page:<number> to navigate` });

            // Create select menu for viewing specific entries
            const selectMenu = new (require('discord.js')).StringSelectMenuBuilder()
                .setCustomId('lore_view_select')
                .setPlaceholder('Select a lore entry to view...')
                .addOptions(
                    pageEntries.map(entry => ({
                        label: entry.title,
                        description: entry.content.substring(0, 100),
                        value: entry.id.toString(),
                        emoji: categoryEmoji
                    }))
                );

            const actionRow = new (require('discord.js')).ActionRowBuilder()
                .addComponents(selectMenu);

            // Create pagination buttons
            const paginationRow = ButtonBuilderUtil.createPagination(page, totalPages, 'lore_category');

            const components = [actionRow];
            if (totalPages > 1) {
                components.push(paginationRow);
            }

            await interaction.reply({
                embeds: [embed],
                components: components
            });

        } catch (error) {
            console.error('Error in lore-category command:', error);
            await interaction.reply({
                content: 'There was an error browsing lore entries.',
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

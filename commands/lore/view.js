const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lore-view')
        .setDescription('View a specific lore entry')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('The ID of the lore entry to view')
                .setRequired(true)),
    cooldown: 5,
    async execute(interaction) {
        try {
            const loreId = interaction.options.getInteger('id');
            const userId = interaction.user.id;

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            // Get the lore entry
            const lore = await Database.getLoreEntry(loreId);
            if (!lore) {
                return await interaction.reply({
                    content: 'Lore entry not found.',
                    ephemeral: true
                });
            }

            // Check if lore is hidden and user hasn't discovered it
            if (lore.hidden) {
                const discoveryQuery = 'SELECT * FROM lore_discoveries WHERE discord_id = $1 AND lore_id = $2';
                const discoveryResult = await Database.query(discoveryQuery, [userId, loreId]);
                
                if (discoveryResult.rows.length === 0) {
                    return await interaction.reply({
                        content: 'This lore entry is hidden and has not been discovered yet.',
                        ephemeral: true
                    });
                }
            }

            // Create lore embed
            const embed = EmbedBuilderUtil.createLoreEmbed(lore);

            // Add discovery info if it's a hidden entry
            if (lore.hidden) {
                const discoveryQuery = 'SELECT discovered_at FROM lore_discoveries WHERE discord_id = $1 AND lore_id = $2';
                const discoveryResult = await Database.query(discoveryQuery, [userId, loreId]);
                
                if (discoveryResult.rows.length > 0) {
                    const discoveredAt = new Date(discoveryResult.rows[0].discovered_at);
                    embed.addFields({
                        name: 'Discovered',
                        value: `<t:${Math.floor(discoveredAt.getTime() / 1000)}:R>`,
                        inline: true
                    });
                }
            }

            // Add related lore suggestions
            const relatedQuery = `
                SELECT id, title, category 
                FROM lore_entries 
                WHERE category = $1 AND id != $2 AND hidden = false
                ORDER BY title
                LIMIT 3
            `;
            const relatedResult = await Database.query(relatedQuery, [lore.category, loreId]);
            const relatedEntries = relatedResult.rows;

            if (relatedEntries.length > 0) {
                const relatedList = relatedEntries.map(entry => 
                    `• **${entry.title}** (ID: ${entry.id})`
                ).join('\n');

                embed.addFields({
                    name: 'Related Entries',
                    value: relatedList,
                    inline: false
                });
            }

            // Create navigation buttons
            const navigationRow = ButtonBuilderUtil.createLoreNavigation(lore, false, false);

            await interaction.reply({
                embeds: [embed],
                components: [navigationRow]
            });

        } catch (error) {
            console.error('Error in lore-view command:', error);
            await interaction.reply({
                content: 'There was an error retrieving the lore entry.',
                ephemeral: true
            });
        }
    },
};

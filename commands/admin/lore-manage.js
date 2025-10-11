const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lore-manage')
        .setDescription('Manage lore entries (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new lore entry')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title of the lore entry')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('Content of the lore entry')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Category of the lore entry')
                        .setRequired(true)
                        .addChoices(
                            { name: 'History', value: 'history' },
                            { name: 'Locations', value: 'locations' },
                            { name: 'Characters', value: 'characters' },
                            { name: 'Events', value: 'events' },
                            { name: 'Organizations', value: 'organizations' },
                            { name: 'Mysteries', value: 'mysteries' }
                        ))
                .addBooleanOption(option =>
                    option.setName('hidden')
                        .setDescription('Whether this lore entry is hidden')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all lore entries')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Filter by category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'History', value: 'history' },
                            { name: 'Locations', value: 'locations' },
                            { name: 'Characters', value: 'characters' },
                            { name: 'Events', value: 'events' },
                            { name: 'Organizations', value: 'organizations' },
                            { name: 'Mysteries', value: 'mysteries' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a lore entry')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID of the lore entry to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a lore entry')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID of the lore entry to edit')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('field')
                        .setDescription('Field to edit')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Title', value: 'title' },
                            { name: 'Content', value: 'content' },
                            { name: 'Category', value: 'category' },
                            { name: 'Hidden Status', value: 'hidden' }
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('New value for the field')
                        .setRequired(true))),
    cooldown: 5,
    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '❌ This command requires administrator permissions.',
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'add':
                    await this.addLoreEntry(interaction);
                    break;
                case 'list':
                    await this.listLoreEntries(interaction);
                    break;
                case 'delete':
                    await this.deleteLoreEntry(interaction);
                    break;
                case 'edit':
                    await this.editLoreEntry(interaction);
                    break;
            }

        } catch (error) {
            console.error('Error in lore-manage command:', error);
            await interaction.reply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },

    async addLoreEntry(interaction) {
        const title = interaction.options.getString('title');
        const content = interaction.options.getString('content');
        const category = interaction.options.getString('category');
        const hidden = interaction.options.getBoolean('hidden') || false;

        // Validate content length
        if (content.length > 2000) {
            return await interaction.reply({
                content: '❌ Lore content cannot exceed 2000 characters.',
                ephemeral: true
            });
        }

        try {
            const result = await Database.query(`
                INSERT INTO lore_entries (title, content, category, hidden)
                VALUES ($1, $2, $3, $4)
                RETURNING id, title, category, hidden
            `, [title, content, category, hidden]);

            const lore = result.rows[0];

            const embed = EmbedBuilderUtil.createSuccessEmbed(
                '📚 Lore Entry Added',
                `Successfully added a new lore entry to the database.`
            );

            embed.addFields(
                { name: 'ID', value: lore.id.toString(), inline: true },
                { name: 'Title', value: lore.title, inline: true },
                { name: 'Category', value: lore.category, inline: true },
                { name: 'Status', value: lore.hidden ? 'Hidden' : 'Visible', inline: true },
                { name: 'Content Preview', value: content.substring(0, 200) + (content.length > 200 ? '...' : ''), inline: false }
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error adding lore entry:', error);
            await interaction.reply({
                content: '❌ Failed to add lore entry. Please try again.',
                ephemeral: true
            });
        }
    },

    async listLoreEntries(interaction) {
        const category = interaction.options.getString('category');

        try {
            let query = 'SELECT id, title, category, hidden, created_at FROM lore_entries';
            let params = [];

            if (category) {
                query += ' WHERE category = $1';
                params.push(category);
            }

            query += ' ORDER BY created_at DESC LIMIT 20';

            const result = await Database.query(query, params);
            const loreEntries = result.rows;

            if (loreEntries.length === 0) {
                return await interaction.reply({
                    content: category ? `No lore entries found in the ${category} category.` : 'No lore entries found.',
                    ephemeral: true
                });
            }

            const embed = EmbedBuilderUtil.createBaseEmbed(
                '📚 Lore Entries',
                category ? `Lore entries in the ${category} category:` : 'All lore entries:'
            );

            loreEntries.forEach(lore => {
                embed.addFields({
                    name: `#${lore.id} - ${lore.title}`,
                    value: `**Category:** ${lore.category}\n**Status:** ${lore.hidden ? 'Hidden' : 'Visible'}\n**Created:** <t:${Math.floor(new Date(lore.created_at).getTime() / 1000)}:R>`,
                    inline: true
                });
            });

            if (loreEntries.length === 20) {
                embed.setFooter({ text: 'Showing first 20 entries. Use category filter to narrow results.' });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error listing lore entries:', error);
            await interaction.reply({
                content: '❌ Failed to retrieve lore entries.',
                ephemeral: true
            });
        }
    },

    async deleteLoreEntry(interaction) {
        const id = interaction.options.getInteger('id');

        try {
            // Check if lore entry exists
            const checkResult = await Database.query('SELECT title FROM lore_entries WHERE id = $1', [id]);
            if (checkResult.rows.length === 0) {
                return await interaction.reply({
                    content: `❌ No lore entry found with ID ${id}.`,
                    ephemeral: true
                });
            }

            // Delete the lore entry
            await Database.query('DELETE FROM lore_entries WHERE id = $1', [id]);

            const embed = EmbedBuilderUtil.createSuccessEmbed(
                '🗑️ Lore Entry Deleted',
                `Successfully deleted lore entry #${id}: "${checkResult.rows[0].title}"`
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error deleting lore entry:', error);
            await interaction.reply({
                content: '❌ Failed to delete lore entry.',
                ephemeral: true
            });
        }
    },

    async editLoreEntry(interaction) {
        const id = interaction.options.getInteger('id');
        const field = interaction.options.getString('field');
        const value = interaction.options.getString('value');

        try {
            // Check if lore entry exists
            const checkResult = await Database.query('SELECT title FROM lore_entries WHERE id = $1', [id]);
            if (checkResult.rows.length === 0) {
                return await interaction.reply({
                    content: `❌ No lore entry found with ID ${id}.`,
                    ephemeral: true
                });
            }

            // Validate field-specific requirements
            if (field === 'content' && value.length > 2000) {
                return await interaction.reply({
                    content: '❌ Lore content cannot exceed 2000 characters.',
                    ephemeral: true
                });
            }

            if (field === 'hidden' && !['true', 'false'].includes(value.toLowerCase())) {
                return await interaction.reply({
                    content: '❌ Hidden status must be "true" or "false".',
                    ephemeral: true
                });
            }

            // Update the lore entry
            let updateQuery;
            let updateValue = value;

            if (field === 'hidden') {
                updateQuery = 'UPDATE lore_entries SET hidden = $1 WHERE id = $2';
                updateValue = value.toLowerCase() === 'true';
            } else {
                updateQuery = `UPDATE lore_entries SET ${field} = $1 WHERE id = $2`;
            }

            await Database.query(updateQuery, [updateValue, id]);

            const embed = EmbedBuilderUtil.createSuccessEmbed(
                '✏️ Lore Entry Updated',
                `Successfully updated lore entry #${id}: "${checkResult.rows[0].title}"`
            );

            embed.addFields({
                name: 'Updated Field',
                value: `**${field.charAt(0).toUpperCase() + field.slice(1)}:** ${value}`,
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error editing lore entry:', error);
            await interaction.reply({
                content: '❌ Failed to edit lore entry.',
                ephemeral: true
            });
        }
    }
};

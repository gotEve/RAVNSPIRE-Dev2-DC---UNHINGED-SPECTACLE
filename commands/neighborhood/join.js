const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('neighborhood-join')
        .setDescription('Join a neighborhood with your guild')
        .addStringOption(option =>
            option.setName('neighborhood')
                .setDescription('The name of the neighborhood to join')
                .setRequired(true)),
    cooldown: 10,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const neighborhoodName = interaction.options.getString('neighborhood');

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            // Check if user is in a guild
            const userGuild = await Database.getUserGuild(userId);
            if (!userGuild) {
                return await interaction.reply({
                    content: 'You must be a member of a guild to join a neighborhood. Create or join a guild first.',
                    ephemeral: true
                });
            }

            // Check if user has permission (owner or officer)
            if (userGuild.role !== 'owner' && userGuild.role !== 'officer') {
                return await interaction.reply({
                    content: 'Only guild owners and officers can join neighborhoods.',
                    ephemeral: true
                });
            }

            // Check if guild is already in a neighborhood
            const existingPlotQuery = `
                SELECT np.*, n.name as neighborhood_name
                FROM neighborhood_plots np
                JOIN neighborhoods n ON np.neighborhood_id = n.id
                WHERE np.guild_id = $1
            `;
            const existingPlotResult = await Database.query(existingPlotQuery, [userGuild.id]);
            if (existingPlotResult.rows.length > 0) {
                const existingPlot = existingPlotResult.rows[0];
                return await interaction.reply({
                    content: `Your guild is already in the **${existingPlot.neighborhood_name}** neighborhood (Plot ${existingPlot.plot_number}).`,
                    ephemeral: true
                });
            }

            // Find the neighborhood
            const neighborhoodQuery = 'SELECT * FROM neighborhoods WHERE name = $1';
            const neighborhoodResult = await Database.query(neighborhoodQuery, [neighborhoodName]);
            const neighborhood = neighborhoodResult.rows[0];

            if (!neighborhood) {
                return await interaction.reply({
                    content: 'Neighborhood not found. Make sure you spelled the name correctly.',
                    ephemeral: true
                });
            }

            // Check for available plots
            const availablePlotQuery = `
                SELECT * FROM neighborhood_plots
                WHERE neighborhood_id = $1 AND guild_id IS NULL
                ORDER BY plot_number
                LIMIT 1
            `;
            const availablePlotResult = await Database.query(availablePlotQuery, [neighborhood.id]);
            const availablePlot = availablePlotResult.rows[0];

            if (!availablePlot) {
                return await interaction.reply({
                    content: `**${neighborhood.name}** has no available plots. All plots are currently occupied.`,
                    ephemeral: true
                });
            }

            // Assign the plot to the guild
            const assignPlotQuery = `
                UPDATE neighborhood_plots
                SET guild_id = $1, purchase_price = 0, created_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
            const assignPlotResult = await Database.query(assignPlotQuery, [userGuild.id, availablePlot.id]);
            const assignedPlot = assignPlotResult.rows[0];

            const embed = EmbedBuilderUtil.createSuccessEmbed(
                'Neighborhood Joined!',
                `Your guild has successfully joined **${neighborhood.name}**!`
            );

            embed.addFields(
                { name: 'Guild', value: userGuild.name, inline: true },
                { name: 'Neighborhood', value: neighborhood.name, inline: true },
                { name: 'Plot Number', value: assignedPlot.plot_number.toString(), inline: true }
            );

            embed.addFields({
                name: 'Welcome to the Neighborhood!',
                value: `Your guild now has a plot in **${neighborhood.name}**. Use \`/neighborhood info\` to learn more about your new neighborhood and start contributing to community buildings!`,
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in neighborhood-join command:', error);
            await interaction.reply({
                content: 'There was an error joining the neighborhood.',
                ephemeral: true
            });
        }
    },
};

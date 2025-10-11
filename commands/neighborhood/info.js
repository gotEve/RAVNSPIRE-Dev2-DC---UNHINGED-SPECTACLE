const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('neighborhood-info')
        .setDescription('View neighborhood information')
        .addStringOption(option =>
            option.setName('neighborhood')
                .setDescription('The neighborhood to view (leave empty for your neighborhood)')
                .setRequired(false)),
    cooldown: 5,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const neighborhoodName = interaction.options.getString('neighborhood');

            let neighborhood;
            let isMember = false;

            if (neighborhoodName) {
                // View specific neighborhood
                const query = 'SELECT * FROM neighborhoods WHERE name = $1';
                const result = await Database.query(query, [neighborhoodName]);
                neighborhood = result.rows[0];

                if (!neighborhood) {
                    return await interaction.reply({
                        content: 'Neighborhood not found.',
                        ephemeral: true
                    });
                }

                // Check if user is a member
                const memberQuery = `
                    SELECT n.* FROM neighborhoods n
                    JOIN neighborhood_plots np ON n.id = np.neighborhood_id
                    JOIN guild_members gm ON np.guild_id = gm.guild_id
                    WHERE n.id = $1 AND gm.discord_id = $2
                `;
                const memberResult = await Database.query(memberQuery, [neighborhood.id, userId]);
                isMember = memberResult.rows.length > 0;
            } else {
                // View user's neighborhood
                const query = `
                    SELECT n.* FROM neighborhoods n
                    JOIN neighborhood_plots np ON n.id = np.neighborhood_id
                    JOIN guild_members gm ON np.guild_id = gm.guild_id
                    WHERE gm.discord_id = $1
                `;
                const result = await Database.query(query, [userId]);
                neighborhood = result.rows[0];

                if (!neighborhood) {
                    return await interaction.reply({
                        content: 'You are not a member of any neighborhood. Use `/neighborhood join` to join one or create a guild first.',
                        ephemeral: true
                    });
                }
                isMember = true;
            }

            // Get neighborhood plots
            const plotsQuery = `
                SELECT np.*, g.name as guild_name, gm.discord_id as guild_owner
                FROM neighborhood_plots np
                LEFT JOIN guilds g ON np.guild_id = g.id
                LEFT JOIN guild_members gm ON g.id = gm.guild_id AND gm.role = 'owner'
                WHERE np.neighborhood_id = $1
                ORDER BY np.plot_number
            `;
            const plotsResult = await Database.query(plotsQuery, [neighborhood.id]);
            const plots = plotsResult.rows;

            // Get neighborhood buildings
            const buildingsQuery = `
                SELECT * FROM neighborhood_buildings
                WHERE neighborhood_id = $1
                ORDER BY building_type
            `;
            const buildingsResult = await Database.query(buildingsQuery, [neighborhood.id]);
            const buildings = buildingsResult.rows;

            // Create neighborhood embed
            const embed = EmbedBuilderUtil.createNeighborhoodEmbed(neighborhood, plots, buildings);

            // Add plot information
            const occupiedPlots = plots.filter(plot => plot.guild_id);
            const availablePlots = plots.filter(plot => !plot.guild_id);
            const forSalePlots = plots.filter(plot => plot.for_sale);

            embed.addFields(
                { name: 'Occupied Plots', value: occupiedPlots.length.toString(), inline: true },
                { name: 'Available Plots', value: availablePlots.length.toString(), inline: true },
                { name: 'Plots for Sale', value: forSalePlots.length.toString(), inline: true }
            );

            // Add plot details
            if (occupiedPlots.length > 0) {
                const plotList = occupiedPlots.slice(0, 5).map(plot => {
                    const saleIndicator = plot.for_sale ? ' (For Sale)' : '';
                    return `• Plot ${plot.plot_number}: **${plot.guild_name}**${saleIndicator}`;
                }).join('\n');

                const morePlots = occupiedPlots.length > 5 ? `\n... and ${occupiedPlots.length - 5} more` : '';
                embed.addFields({
                    name: 'Guild Plots',
                    value: plotList + morePlots,
                    inline: false
                });
            }

            // Add building information
            if (buildings.length > 0) {
                const buildingList = buildings.map(building => {
                    const progress = building.current_resources > 0 ? 
                        ` (${building.current_resources}/${building.required_resources} resources)` : '';
                    return `• **${building.building_type.replace('_', ' ')}** - Level ${building.level}${progress}`;
                }).join('\n');

                embed.addFields({
                    name: 'Community Buildings',
                    value: buildingList,
                    inline: false
                });
            }

            // Add creation date
            const createdDate = new Date(neighborhood.created_at);
            embed.addFields({
                name: 'Established',
                value: `<t:${Math.floor(createdDate.getTime() / 1000)}:R>`,
                inline: true
            });

            // Create action buttons
            let components = [];
            if (isMember) {
                components = [ButtonBuilderUtil.createNeighborhoodActions()];
            } else if (availablePlots.length > 0) {
                // Show join button for non-members with available plots
                const joinButton = new (require('discord.js')).ActionRowBuilder()
                    .addComponents(
                        new (require('discord.js')).ButtonBuilder()
                            .setCustomId(`neighborhood_join_${neighborhood.id}`)
                            .setLabel('Request to Join')
                            .setStyle(require('discord.js').ButtonStyle.Success)
                            .setEmoji('🏘️')
                    );
                components = [joinButton];
            }

            await interaction.reply({
                embeds: [embed],
                components: components
            });

        } catch (error) {
            console.error('Error in neighborhood-info command:', error);
            await interaction.reply({
                content: 'There was an error retrieving neighborhood information.',
                ephemeral: true
            });
        }
    },
};

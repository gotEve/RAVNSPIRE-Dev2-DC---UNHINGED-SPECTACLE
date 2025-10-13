const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const residentialManager = require('../utils/residentialManager');
const factionManager = require('../utils/factionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plot')
        .setDescription('Manage residential plots and housing')
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Purchase a residential plot')
                .addIntegerOption(option =>
                    option.setName('neighborhood_id')
                        .setDescription('Neighborhood ID to buy plot in')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('plot_number')
                        .setDescription('Plot number to purchase')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('size')
                        .setDescription('Plot size')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Small (2 occupants, 1,000 currency)', value: 'small' },
                            { name: 'Medium (4 occupants, 2,500 currency)', value: 'medium' },
                            { name: 'Large (6 occupants, 5,000 currency)', value: 'large' },
                            { name: 'Estate (10 occupants, 10,000 currency)', value: 'estate' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('List your plot for sale')
                .addIntegerOption(option =>
                    option.setName('plot_id')
                        .setDescription('Plot ID to sell')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Sale price')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy-sale')
                .setDescription('Buy a plot that\'s for sale')
                .addIntegerOption(option =>
                    option.setName('plot_id')
                        .setDescription('Plot ID to buy')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade')
                .setDescription('Upgrade your plot tier')
                .addIntegerOption(option =>
                    option.setName('plot_id')
                        .setDescription('Plot ID to upgrade')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invite')
                .setDescription('Invite someone to live in your plot')
                .addIntegerOption(option =>
                    option.setName('plot_id')
                        .setDescription('Plot ID')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to invite')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('rent')
                        .setDescription('Monthly rent amount (0 for free)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View plot information')
                .addIntegerOption(option =>
                    option.setName('plot_id')
                        .setDescription('Plot ID to view')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('my-plots')
                .setDescription('View your owned plots'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('available')
                .setDescription('View available plots in a neighborhood')
                .addIntegerOption(option =>
                    option.setName('neighborhood_id')
                        .setDescription('Neighborhood ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('neighborhoods')
                .setDescription('View all neighborhoods with plots')),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get user's active character
            const activeCharacter = await factionManager.getActiveCharacter(userId);
            if (!activeCharacter) {
                return await interaction.reply({
                    content: '❌ You need to create a character first! Use `/faction create` to get started.',
                    ephemeral: true
                });
            }

            switch (subcommand) {
                case 'buy':
                    await handleBuyPlot(interaction, activeCharacter);
                    break;
                case 'sell':
                    await handleSellPlot(interaction, activeCharacter);
                    break;
                case 'buy-sale':
                    await handleBuySalePlot(interaction, activeCharacter);
                    break;
                case 'upgrade':
                    await handleUpgradePlot(interaction, activeCharacter);
                    break;
                case 'invite':
                    await handleInviteOccupant(interaction, activeCharacter);
                    break;
                case 'info':
                    await handlePlotInfo(interaction);
                    break;
                case 'my-plots':
                    await handleMyPlots(interaction, activeCharacter);
                    break;
                case 'available':
                    await handleAvailablePlots(interaction);
                    break;
                case 'neighborhoods':
                    await handleNeighborhoods(interaction);
                    break;
            }

        } catch (error) {
            console.error('Error in plot command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleBuyPlot(interaction, activeCharacter) {
    const neighborhoodId = interaction.options.getInteger('neighborhood_id');
    const plotNumber = interaction.options.getInteger('plot_number');
    const size = interaction.options.getString('size');

    try {
        const result = await residentialManager.purchasePlot(
            activeCharacter.id, 
            neighborhoodId, 
            plotNumber, 
            size
        );

        const embed = new EmbedBuilder()
            .setTitle('🏠 Plot Purchased Successfully!')
            .setDescription(`You have successfully purchased plot #${result.plotNumber} in the neighborhood.`)
            .addFields(
                { name: 'Plot Size', value: result.plotSize, inline: true },
                { name: 'Purchase Price', value: `${result.price} currency`, inline: true },
                { name: 'Monthly Maintenance', value: `${result.maintenanceCost} currency`, inline: true },
                { name: 'Max Occupants', value: `${residentialManager.plotSizes[size].maxOccupants}`, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleSellPlot(interaction, activeCharacter) {
    const plotId = interaction.options.getInteger('plot_id');
    const price = interaction.options.getInteger('price');

    try {
        const result = await residentialManager.listPlotForSale(
            activeCharacter.id, 
            plotId, 
            price
        );

        const embed = new EmbedBuilder()
            .setTitle('🏠 Plot Listed for Sale!')
            .setDescription(`Your plot has been listed for sale at ${result.salePrice} currency.`)
            .setColor(0xffaa00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleBuySalePlot(interaction, activeCharacter) {
    const plotId = interaction.options.getInteger('plot_id');

    try {
        const result = await residentialManager.buyPlotForSale(
            activeCharacter.id, 
            plotId
        );

        const embed = new EmbedBuilder()
            .setTitle('🏠 Plot Purchased!')
            .setDescription(`You have successfully purchased the plot for ${result.salePrice} currency.`)
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleUpgradePlot(interaction, activeCharacter) {
    const plotId = interaction.options.getInteger('plot_id');

    try {
        const result = await residentialManager.upgradePlot(
            activeCharacter.id, 
            plotId
        );

        const embed = new EmbedBuilder()
            .setTitle('🏠 Plot Upgraded!')
            .setDescription(`Your plot has been upgraded to tier ${result.newTier}.`)
            .addFields(
                { name: 'Upgrade Cost', value: `${result.upgradeCost} currency`, inline: true },
                { name: 'New Max Occupants', value: `${result.newMaxOccupants}`, inline: true },
                { name: 'New Maintenance Cost', value: `${result.newMaintenanceCost} currency`, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleInviteOccupant(interaction, activeCharacter) {
    const plotId = interaction.options.getInteger('plot_id');
    const user = interaction.options.getUser('user');
    const rent = interaction.options.getInteger('rent') || 0;

    try {
        // Get the invited user's active character
        const inviteeCharacter = await factionManager.getActiveCharacter(user.id);
        if (!inviteeCharacter) {
            return await interaction.reply({
                content: `❌ ${user.username} doesn't have an active character.`,
                ephemeral: true
            });
        }

        const result = await residentialManager.inviteOccupant(
            activeCharacter.id, 
            plotId, 
            inviteeCharacter.id, 
            rent
        );

        const embed = new EmbedBuilder()
            .setTitle('🏠 Occupant Invited!')
            .setDescription(`${user.username} has been invited to live in your plot.`)
            .addFields(
                { name: 'Monthly Rent', value: `${rent} currency`, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handlePlotInfo(interaction) {
    const plotId = interaction.options.getInteger('plot_id');

    try {
        const plot = await residentialManager.getPlotDetails(plotId);

        const embed = new EmbedBuilder()
            .setTitle(`🏠 Plot #${plot.plot_number} - ${plot.neighborhood_name}`)
            .setDescription(`Plot information and current occupants`)
            .addFields(
                { name: 'Plot Size', value: plot.plot_size || 'Not set', inline: true },
                { name: 'Plot Tier', value: `${plot.plot_tier}`, inline: true },
                { name: 'Max Occupants', value: `${plot.max_occupants}`, inline: true },
                { name: 'Current Value', value: `${plot.current_value || 0} currency`, inline: true },
                { name: 'Monthly Maintenance', value: `${plot.monthly_maintenance_cost || 0} currency`, inline: true },
                { name: 'For Sale', value: plot.is_for_sale ? `Yes - ${plot.sale_price} currency` : 'No', inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        if (plot.owner_name) {
            embed.addFields({ name: 'Owner', value: `${plot.owner_name} (${plot.owner_faction})`, inline: true });
        }

        if (plot.occupants && plot.occupants.length > 0) {
            const occupantsList = plot.occupants.map(occ => 
                `${occ.character_name} (${occ.current_faction}) - ${occ.occupancy_type}`
            ).join('\n');
            embed.addFields({ name: 'Current Occupants', value: occupantsList, inline: false });
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleMyPlots(interaction, activeCharacter) {
    try {
        const plots = await residentialManager.getCharacterPlots(activeCharacter.id);

        if (plots.length === 0) {
            return await interaction.reply({
                content: '🏠 You don\'t own any residential plots yet. Use `/plot buy` to purchase one!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏠 Your Residential Plots')
            .setDescription(`You own ${plots.length} plot(s)`)
            .setColor(0x0099ff)
            .setTimestamp();

        plots.forEach((plot, index) => {
            embed.addFields({
                name: `Plot #${plot.plot_number} - ${plot.neighborhood_name}`,
                value: `**Size:** ${plot.plot_size}\n**Tier:** ${plot.plot_tier}\n**Value:** ${plot.current_value} currency\n**Occupants:** ${plot.current_occupants}/${plot.max_occupants}\n**For Sale:** ${plot.is_for_sale ? `Yes - ${plot.sale_price} currency` : 'No'}`,
                inline: true
            });
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleAvailablePlots(interaction) {
    const neighborhoodId = interaction.options.getInteger('neighborhood_id');

    try {
        const plots = await residentialManager.getAvailablePlots(neighborhoodId);

        if (plots.length === 0) {
            return await interaction.reply({
                content: '🏠 No available plots in this neighborhood.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏠 Available Plots - ${plots[0].neighborhood_name}`)
            .setDescription(`Found ${plots.length} available plot(s)`)
            .setColor(0x0099ff)
            .setTimestamp();

        plots.forEach((plot, index) => {
            embed.addFields({
                name: `Plot #${plot.plot_number}`,
                value: `**Plot ID:** ${plot.id}\n**Size:** ${plot.plot_size || 'Not set'}\n**Tier:** ${plot.plot_tier}`,
                inline: true
            });
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleNeighborhoods(interaction) {
    try {
        const neighborhoods = await residentialManager.getNeighborhoodsWithPlots();

        if (neighborhoods.length === 0) {
            return await interaction.reply({
                content: '🏠 No neighborhoods with plots found.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏠 Neighborhoods with Residential Plots')
            .setDescription('Available neighborhoods for plot purchase')
            .setColor(0x0099ff)
            .setTimestamp();

        neighborhoods.forEach((neighborhood, index) => {
            embed.addFields({
                name: `${neighborhood.name}`,
                value: `**ID:** ${neighborhood.id}\n**Available Plots:** ${neighborhood.available_plots}\n**Total Plots:** ${neighborhood.total_plots}\n**Defense Level:** ${neighborhood.defense_level}`,
                inline: true
            });
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

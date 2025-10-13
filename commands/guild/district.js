const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../../database/db');
const { embedBuilder } = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-district')
        .setDescription('Manage your guild\'s commercial plots in the Guild District')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View your guild\'s Guild District holdings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy-plot')
                .setDescription('Purchase a plot in the Guild District')
                .addStringOption(option =>
                    option
                        .setName('size')
                        .setDescription('Plot size to purchase')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Small (1,000 currency)', value: 'small' },
                            { name: 'Medium (2,500 currency)', value: 'medium' },
                            { name: 'Large (5,000 currency)', value: 'large' },
                            { name: 'Commercial Estate (10,000 currency)', value: 'commercial_estate' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade-plot')
                .setDescription('Upgrade a plot to the next tier')
                .addIntegerOption(option =>
                    option
                        .setName('plot_id')
                        .setDescription('ID of the plot to upgrade')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('build')
                .setDescription('Build a structure on a plot')
                .addIntegerOption(option =>
                    option
                        .setName('plot_id')
                        .setDescription('ID of the plot to build on')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('building_type')
                        .setDescription('Type of building to construct')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Resource Mine', value: 'resource_mine' },
                            { name: 'Training Grounds', value: 'training_grounds' },
                            { name: 'Guild Vault', value: 'vault' },
                            { name: 'Command Center', value: 'command_center' },
                            { name: 'Guild Workshop', value: 'workshop' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('collect')
                .setDescription('Collect generated resources from your plots')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell-plot')
                .setDescription('Sell a plot back to the district')
                .addIntegerOption(option =>
                    option
                        .setName('plot_id')
                        .setDescription('ID of the plot to sell')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            // Check if user is in a guild
            const userGuild = await Database.query(
                'SELECT g.* FROM guilds g JOIN guild_members gm ON g.id = gm.guild_id WHERE gm.discord_id = $1',
                [userId]
            );

            if (userGuild.rows.length === 0) {
                return await interaction.reply({
                    content: '❌ You must be a member of a guild to use Guild District commands.',
                    ephemeral: true
                });
            }

            const guild = userGuild.rows[0];

            // Check if user has permission (officer or owner)
            const memberRole = await Database.query(
                'SELECT role FROM guild_members WHERE guild_id = $1 AND discord_id = $2',
                [guild.id, userId]
            );

            if (memberRole.rows.length === 0 || !['owner', 'officer'].includes(memberRole.rows[0].role)) {
                return await interaction.reply({
                    content: '❌ You must be a guild officer or owner to manage Guild District plots.',
                    ephemeral: true
                });
            }

            switch (subcommand) {
                case 'info':
                    await handleInfo(interaction, guild);
                    break;
                case 'buy-plot':
                    await handleBuyPlot(interaction, guild);
                    break;
                case 'upgrade-plot':
                    await handleUpgradePlot(interaction, guild);
                    break;
                case 'build':
                    await handleBuild(interaction, guild);
                    break;
                case 'collect':
                    await handleCollect(interaction, guild);
                    break;
                case 'sell-plot':
                    await handleSellPlot(interaction, guild);
                    break;
            }

        } catch (error) {
            console.error('Guild District command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleInfo(interaction, guild) {
    // Get guild's plots
    const plots = await Database.query(
        'SELECT * FROM guild_district_plots WHERE guild_id = $1 ORDER BY plot_number',
        [guild.id]
    );

    // Get guild's upgrades
    const upgrades = await Database.query(
        'SELECT * FROM guild_upgrades WHERE guild_id = $1 AND active = true',
        [guild.id]
    );

    // Get available plots for purchase
    const availablePlots = await Database.query(
        'SELECT plot_number FROM guild_district_plots WHERE guild_id IS NULL ORDER BY plot_number LIMIT 10'
    );

    const embed = new EmbedBuilder()
        .setTitle(`🏢 ${guild.name} - Guild District Holdings`)
        .setColor('#2B2D31')
        .setTimestamp();

    if (plots.rows.length === 0) {
        embed.setDescription('Your guild doesn\'t own any plots in the Guild District yet.');
    } else {
        let plotInfo = '';
        for (const plot of plots.rows) {
            const buildingInfo = plot.building_type ? 
                `\n🏗️ **${plot.building_type.replace('_', ' ').toUpperCase()}** (Level ${plot.building_level})` : 
                '\n📦 **Empty Plot**';
            
            plotInfo += `**Plot #${plot.plot_number}** (${plot.plot_size})\n` +
                       `💰 Value: ${plot.current_value.toLocaleString()} currency\n` +
                       `📊 Tier: ${plot.plot_tier}/5${buildingInfo}\n\n`;
        }
        embed.setDescription(plotInfo);
    }

    // Add upgrades info
    if (upgrades.rows.length > 0) {
        let upgradeInfo = '**Guild Upgrades:**\n';
        for (const upgrade of upgrades.rows) {
            upgradeInfo += `• ${upgrade.upgrade_type.replace('_', ' ').toUpperCase()} (Level ${upgrade.upgrade_level})\n`;
        }
        embed.addFields({ name: '🔧 Active Upgrades', value: upgradeInfo, inline: false });
    }

    // Add available plots info
    if (availablePlots.rows.length > 0) {
        const plotNumbers = availablePlots.rows.map(p => p.plot_number).join(', ');
        embed.addFields({ 
            name: '🏪 Available Plots', 
            value: `Plots available for purchase: ${plotNumbers}`, 
            inline: false 
        });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleBuyPlot(interaction, guild) {
    const size = interaction.options.getString('size');
    
    // Calculate plot cost based on size
    const plotCosts = {
        small: 1000,
        medium: 2500,
        large: 5000,
        commercial_estate: 10000
    };

    const cost = plotCosts[size];

    // Check guild currency (assuming guilds have currency stored somewhere)
    // For now, we'll use a simple check - in a real implementation, guilds would have their own currency
    const guildCurrency = await Database.query(
        'SELECT COALESCE(SUM(current_value), 0) as total_value FROM guild_district_plots WHERE guild_id = $1',
        [guild.id]
    );

    // Simple currency check - in reality, guilds would have their own currency system
    const hasEnoughCurrency = true; // Placeholder - implement guild currency system

    if (!hasEnoughCurrency) {
        return await interaction.reply({
            content: `❌ Your guild doesn't have enough currency (${cost.toLocaleString()} required).`,
            ephemeral: true
        });
    }

    // Find an available plot
    const availablePlot = await Database.query(
        'SELECT plot_number FROM guild_district_plots WHERE guild_id IS NULL AND plot_size = $1 ORDER BY plot_number LIMIT 1',
        [size]
    );

    if (availablePlot.rows.length === 0) {
        return await interaction.reply({
            content: `❌ No ${size} plots are currently available for purchase.`,
            ephemeral: true
        });
    }

    const plotNumber = availablePlot.rows[0].plot_number;

    // Purchase the plot
    await Database.query(
        'UPDATE guild_district_plots SET guild_id = $1, purchased_at = CURRENT_TIMESTAMP WHERE plot_number = $2',
        [guild.id, plotNumber]
    );

    // Log the transaction
    await Database.query(
        'INSERT INTO guild_district_transactions (guild_id, transaction_type, amount, description, processed_by) VALUES ($1, $2, $3, $4, $5)',
        [guild.id, 'plot_purchase', cost, `Purchased ${size} plot #${plotNumber}`, interaction.user.id]
    );

    const embed = new EmbedBuilder()
        .setTitle('🏪 Plot Purchased Successfully!')
        .setDescription(`Your guild has purchased **Plot #${plotNumber}** (${size}) for ${cost.toLocaleString()} currency.`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleUpgradePlot(interaction, guild) {
    const plotId = interaction.options.getInteger('plot_id');

    // Get the plot
    const plot = await Database.query(
        'SELECT * FROM guild_district_plots WHERE id = $1 AND guild_id = $2',
        [plotId, guild.id]
    );

    if (plot.rows.length === 0) {
        return await interaction.reply({
            content: '❌ Plot not found or not owned by your guild.',
            ephemeral: true
        });
    }

    const plotData = plot.rows[0];

    if (plotData.plot_tier >= 5) {
        return await interaction.reply({
            content: '❌ This plot is already at maximum tier.',
            ephemeral: true
        });
    }

    // Calculate upgrade cost
    const upgradeCost = plotData.current_value * 0.5; // 50% of current value

    // Check if guild has enough currency (placeholder)
    const hasEnoughCurrency = true; // Implement guild currency system

    if (!hasEnoughCurrency) {
        return await interaction.reply({
            content: `❌ Your guild doesn't have enough currency (${upgradeCost.toLocaleString()} required).`,
            ephemeral: true
        });
    }

    // Upgrade the plot
    const newTier = plotData.plot_tier + 1;
    const newValue = Math.floor(plotData.current_value * 1.5);

    await Database.query(
        'UPDATE guild_district_plots SET plot_tier = $1, current_value = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newTier, newValue, plotId]
    );

    // Log the transaction
    await Database.query(
        'INSERT INTO guild_district_transactions (guild_id, transaction_type, plot_id, amount, description, processed_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [guild.id, 'plot_upgrade', plotId, upgradeCost, `Upgraded plot #${plotData.plot_number} to tier ${newTier}`, interaction.user.id]
    );

    const embed = new EmbedBuilder()
        .setTitle('⬆️ Plot Upgraded Successfully!')
        .setDescription(`**Plot #${plotData.plot_number}** has been upgraded to tier ${newTier}.\nNew value: ${newValue.toLocaleString()} currency`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleBuild(interaction, guild) {
    const plotId = interaction.options.getInteger('plot_id');
    const buildingType = interaction.options.getString('building_type');

    // Get the plot
    const plot = await Database.query(
        'SELECT * FROM guild_district_plots WHERE id = $1 AND guild_id = $2',
        [plotId, guild.id]
    );

    if (plot.rows.length === 0) {
        return await interaction.reply({
            content: '❌ Plot not found or not owned by your guild.',
            ephemeral: true
        });
    }

    const plotData = plot.rows[0];

    if (plotData.building_type) {
        return await interaction.reply({
            content: '❌ This plot already has a building. You must demolish it first.',
            ephemeral: true
        });
    }

    // Get building type info
    const buildingInfo = await Database.query(
        'SELECT * FROM guild_building_types WHERE building_type = $1',
        [buildingType]
    );

    if (buildingInfo.rows.length === 0) {
        return await interaction.reply({
            content: '❌ Invalid building type.',
            ephemeral: true
        });
    }

    const building = buildingInfo.rows[0];
    const cost = building.base_cost;

    // Check if guild has enough currency (placeholder)
    const hasEnoughCurrency = true; // Implement guild currency system

    if (!hasEnoughCurrency) {
        return await interaction.reply({
            content: `❌ Your guild doesn't have enough currency (${cost.toLocaleString()} required).`,
            ephemeral: true
        });
    }

    // Build the structure
    await Database.query(
        'UPDATE guild_district_plots SET building_type = $1, building_level = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [buildingType, plotId]
    );

    // Log the transaction
    await Database.query(
        'INSERT INTO guild_district_transactions (guild_id, transaction_type, plot_id, amount, description, processed_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [guild.id, 'building_construction', plotId, cost, `Built ${building.building_name} on plot #${plotData.plot_number}`, interaction.user.id]
    );

    const embed = new EmbedBuilder()
        .setTitle('🏗️ Building Constructed Successfully!')
        .setDescription(`**${building.building_name}** has been built on Plot #${plotData.plot_number}.\n\n${building.description}`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCollect(interaction, guild) {
    // Get all plots with buildings
    const plots = await Database.query(
        'SELECT * FROM guild_district_plots WHERE guild_id = $1 AND building_type IS NOT NULL',
        [guild.id]
    );

    if (plots.rows.length === 0) {
        return await interaction.reply({
            content: '❌ Your guild has no buildings to collect resources from.',
            ephemeral: true
        });
    }

    let totalResources = {};
    let collectedCount = 0;

    for (const plot of plots.rows) {
        // Check if resources were already collected today
        const today = new Date().toISOString().split('T')[0];
        const alreadyCollected = await Database.query(
            'SELECT id FROM guild_resource_generation WHERE guild_id = $1 AND plot_id = $2 AND generation_date = $3',
            [guild.id, plot.id, today]
        );

        if (alreadyCollected.rows.length > 0) {
            continue; // Skip if already collected today
        }

        // Get building type info
        const buildingInfo = await Database.query(
            'SELECT * FROM guild_building_types WHERE building_type = $1',
            [plot.building_type]
        );

        if (buildingInfo.rows.length === 0) {
            continue;
        }

        const building = buildingInfo.rows[0];
        const resourceOutput = JSON.parse(building.resource_output);

        // Calculate resources based on building level
        const multiplier = 1 + (plot.building_level - 1) * 0.2; // 20% increase per level

        for (const [resource, amount] of Object.entries(resourceOutput)) {
            const finalAmount = Math.floor(amount * multiplier);
            totalResources[resource] = (totalResources[resource] || 0) + finalAmount;
        }

        // Log the resource generation
        await Database.query(
            'INSERT INTO guild_resource_generation (guild_id, plot_id, resources_generated, collected_by) VALUES ($1, $2, $3, $4)',
            [guild.id, plot.id, JSON.stringify(resourceOutput), interaction.user.id]
        );

        collectedCount++;
    }

    if (collectedCount === 0) {
        return await interaction.reply({
            content: '❌ All resources have already been collected today.',
            ephemeral: true
        });
    }

    // Display collected resources
    let resourceText = '';
    for (const [resource, amount] of Object.entries(totalResources)) {
        resourceText += `• **${resource.replace('_', ' ').toUpperCase()}**: ${amount.toLocaleString()}\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle('💰 Resources Collected!')
        .setDescription(`Collected resources from ${collectedCount} building(s):\n\n${resourceText}`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSellPlot(interaction, guild) {
    const plotId = interaction.options.getInteger('plot_id');

    // Get the plot
    const plot = await Database.query(
        'SELECT * FROM guild_district_plots WHERE id = $1 AND guild_id = $2',
        [plotId, guild.id]
    );

    if (plot.rows.length === 0) {
        return await interaction.reply({
            content: '❌ Plot not found or not owned by your guild.',
            ephemeral: true
        });
    }

    const plotData = plot.rows[0];

    // Calculate sell value (70% of current value)
    const sellValue = Math.floor(plotData.current_value * 0.7);

    // Create confirmation button
    const confirmButton = new ButtonBuilder()
        .setCustomId(`sell_plot_confirm_${plotId}`)
        .setLabel('Confirm Sale')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`sell_plot_cancel_${plotId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const embed = new EmbedBuilder()
        .setTitle('🏪 Confirm Plot Sale')
        .setDescription(`Are you sure you want to sell **Plot #${plotData.plot_number}**?\n\n` +
                       `**Plot Details:**\n` +
                       `• Size: ${plotData.plot_size}\n` +
                       `• Tier: ${plotData.plot_tier}\n` +
                       `• Building: ${plotData.building_type || 'None'}\n` +
                       `• Current Value: ${plotData.current_value.toLocaleString()} currency\n\n` +
                       `**Sell Value: ${sellValue.toLocaleString()} currency**`)
        .setColor('#FFA500')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
}

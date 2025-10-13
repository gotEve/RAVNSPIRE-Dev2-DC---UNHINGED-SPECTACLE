const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const resourceManager = require('../utils/resourceManager');
const factionManager = require('../utils/factionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resources')
        .setDescription('Manage your faction-specific resources and economy')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current resources and daily costs')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view resources for (defaults to yourself)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Process daily resource consumption for your character'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View your resource consumption history')
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Number of days to show (default: 7)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('faction')
                .setDescription('View faction-specific resource information')
                .addStringOption(option =>
                    option.setName('faction')
                        .setDescription('Faction to view information for')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Human', value: 'Human' },
                            { name: 'AI', value: 'AI' },
                            { name: 'Nature', value: 'Nature' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('admin')
                .setDescription('Admin: Process daily consumption for all characters')
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm you want to process all daily consumption')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get user's active character
            const activeCharacter = await factionManager.getCurrentCharacter(userId);
            if (!activeCharacter) {
                return await interaction.reply({
                    content: '❌ You need to create a character first! Use `/faction create` to get started.',
                    ephemeral: true
                });
            }

            switch (subcommand) {
                case 'view':
                    await handleViewResources(interaction, activeCharacter);
                    break;
                case 'daily':
                    await handleDailyConsumption(interaction, activeCharacter);
                    break;
                case 'history':
                    await handleConsumptionHistory(interaction, activeCharacter);
                    break;
                case 'faction':
                    await handleFactionInfo(interaction);
                    break;
                case 'admin':
                    await handleAdminDailyConsumption(interaction);
                    break;
            }

        } catch (error) {
            console.error('Error in resources command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleViewResources(interaction, activeCharacter) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    try {
        // Get target user's active character
        const targetCharacter = await factionManager.getCurrentCharacter(targetUser.id);
        if (!targetCharacter) {
            return await interaction.reply({
                content: `❌ ${targetUser.username} doesn't have an active character.`,
                ephemeral: true
            });
        }

        const stats = await resourceManager.getResourceStats(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`💰 ${targetUser.username}'s Resources`)
            .setDescription(`Faction: **${stats.faction}** | Total Value: **${stats.totalValue}**`)
            .setColor(0x00ff00)
            .setTimestamp();

        // Add faction-specific resources
        const factionResources = resourceManager.getFactionResourceTypes(stats.faction);
        const resourceFields = [];
        
        for (const resourceType of factionResources) {
            const amount = stats.resources[resourceType] || 0;
            const dailyCost = stats.dailyCosts[resourceType] || 0;
            const daysRemaining = dailyCost > 0 ? Math.floor(amount / dailyCost) : '∞';
            
            resourceFields.push({
                name: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`,
                value: `**${amount}** (${daysRemaining} days)`,
                inline: true
            });
        }

        embed.addFields(resourceFields);

        // Add daily costs summary
        if (Object.keys(stats.dailyCosts).length > 0) {
            const dailyCostsText = Object.entries(stats.dailyCosts)
                .map(([resource, cost]) => `${resource}: ${cost}`)
                .join('\n');
            
            embed.addFields({
                name: '📅 Daily Costs',
                value: dailyCostsText,
                inline: false
            });
        }

        // Add status
        const status = stats.canAffordDaily ? '✅ Can afford daily costs' : '⚠️ Insufficient resources for daily costs';
        embed.addFields({
            name: 'Status',
            value: status,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleDailyConsumption(interaction, activeCharacter) {
    try {
        const result = await resourceManager.processDailyConsumption(activeCharacter.id);

        const embed = new EmbedBuilder()
            .setTitle('📅 Daily Resource Consumption')
            .setColor(result.success ? 0x00ff00 : 0xff6b35)
            .setTimestamp();

        if (result.success) {
            embed.setDescription('✅ Daily consumption processed successfully!');
            
            if (result.consumed) {
                const consumedText = Object.entries(result.consumed)
                    .map(([resource, amount]) => `${resource}: -${amount}`)
                    .join('\n');
                
                embed.addFields({
                    name: 'Resources Consumed',
                    value: consumedText,
                    inline: false
                });
            }
        } else {
            embed.setDescription('⚠️ Failed to process daily consumption');
            
            if (result.required) {
                const requiredText = Object.entries(result.required)
                    .map(([resource, amount]) => `${resource}: ${amount}`)
                    .join('\n');
                
                embed.addFields({
                    name: 'Required Resources',
                    value: requiredText,
                    inline: false
                });
            }
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleConsumptionHistory(interaction, activeCharacter) {
    const days = interaction.options.getInteger('days') || 7;
    
    try {
        const history = await resourceManager.getConsumptionHistory(activeCharacter.id, days);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Resource Consumption History`)
            .setDescription(`Last ${days} days for ${activeCharacter.character_name}`)
            .setColor(0x0099ff)
            .setTimestamp();

        if (history.length === 0) {
            embed.setDescription('No consumption history found.');
        } else {
            history.forEach((entry, index) => {
                const date = new Date(entry.consumption_date).toLocaleDateString();
                const status = entry.auto_deducted ? '✅' : '❌';
                const resources = JSON.parse(entry.resources_consumed || '{}');
                
                const resourcesText = Object.entries(resources)
                    .map(([resource, amount]) => `${resource}: ${amount}`)
                    .join(', ');

                embed.addFields({
                    name: `${status} ${date}`,
                    value: `**Faction:** ${entry.faction}\n**Resources:** ${resourcesText}`,
                    inline: true
                });
            });
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleFactionInfo(interaction) {
    const faction = interaction.options.getString('faction');
    
    try {
        let targetFaction = faction;
        
        if (!targetFaction) {
            const activeCharacter = await factionManager.getCurrentCharacter(interaction.user.id);
            if (!activeCharacter) {
                return await interaction.reply({
                    content: '❌ You need to create a character first! Use `/faction create` to get started.',
                    ephemeral: true
                });
            }
            targetFaction = activeCharacter.current_faction;
        }

        const dailyCosts = resourceManager.getFactionRequirements(targetFaction);
        const resourceTypes = resourceManager.getFactionResourceTypes(targetFaction);

        const embed = new EmbedBuilder()
            .setTitle(`🏛️ ${targetFaction} Faction Information`)
            .setDescription(`Resource system for the ${targetFaction} faction`)
            .setColor(0x0099ff)
            .setTimestamp();

        // Add available resources
        embed.addFields({
            name: '📦 Available Resources',
            value: resourceTypes.map(r => `• ${r.charAt(0).toUpperCase() + r.slice(1)}`).join('\n'),
            inline: true
        });

        // Add daily costs
        if (Object.keys(dailyCosts).length > 0) {
            const costsText = Object.entries(dailyCosts)
                .map(([resource, cost]) => `• ${resource}: ${cost}/day`)
                .join('\n');
            
            embed.addFields({
                name: '💸 Daily Costs',
                value: costsText,
                inline: true
            });
        }

        // Add faction description
        const factionDescriptions = {
            Human: 'Humans require food and water to survive. They are adaptable and can use most resources.',
            AI: 'AI entities need energy and data fragments to function. They excel at processing and automation.',
            Nature: 'Nature beings consume biomass and organic matter. They are in harmony with natural resources.'
        };

        embed.addFields({
            name: '📖 Faction Description',
            value: factionDescriptions[targetFaction] || 'Unknown faction.',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleAdminDailyConsumption(interaction) {
    const confirm = interaction.options.getBoolean('confirm');
    
    try {
        // Check if user is admin (you can add proper admin check here)
        if (!confirm) {
            return await interaction.reply({
                content: '❌ You must confirm to process daily consumption for all characters.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const results = await resourceManager.processAllDailyConsumption();

        const embed = new EmbedBuilder()
            .setTitle('📅 Daily Consumption Processing Complete')
            .setDescription(`Processed ${results.length} active characters`)
            .setColor(0x00ff00)
            .setTimestamp();

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        embed.addFields(
            { name: '✅ Successful', value: `${successful}`, inline: true },
            { name: '❌ Failed', value: `${failed}`, inline: true },
            { name: '📊 Total', value: `${results.length}`, inline: true }
        );

        if (failed > 0) {
            const failedCharacters = results.filter(r => !r.success).slice(0, 5);
            const failedText = failedCharacters.map(r => `${r.characterName} (${r.faction})`).join('\n');
            
            embed.addFields({
                name: 'Failed Characters (first 5)',
                value: failedText,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        await interaction.editReply({
            content: `❌ ${error.message}`
        });
    }
}

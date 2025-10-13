const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const { gameRewardCalculator } = require('../../config/gameRewards');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-balance')
        .setDescription('Admin commands for game balance and reward management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current balance configuration')
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('Specific game to view (optional)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-global')
                .setDescription('Set global reward values')
                .addStringOption(option =>
                    option.setName('reward_type')
                        .setDescription('Type of reward to modify')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Currency', value: 'currency' },
                            { name: 'XP', value: 'xp' }
                        )
                )
                .addIntegerOption(option =>
                    option.setName('value')
                        .setDescription('New value for the reward')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-game')
                .setDescription('Set game-specific reward values')
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('Game to modify')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reward_type')
                        .setDescription('Type of reward to modify')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Currency', value: 'currency' },
                            { name: 'XP', value: 'xp' },
                            { name: 'Speed Multiplier', value: 'speed_multiplier' },
                            { name: 'Accuracy Multiplier', value: 'accuracy_multiplier' }
                        )
                )
                .addNumberOption(option =>
                    option.setName('value')
                        .setDescription('New value for the reward')
                        .setRequired(true)
                        .setMinValue(0)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-multiplier')
                .setDescription('Set global multiplier values')
                .addStringOption(option =>
                    option.setName('multiplier_type')
                        .setDescription('Type of multiplier to modify')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Speed Bonus', value: 'speed_bonus' },
                            { name: 'Accuracy Bonus', value: 'accuracy_bonus' },
                            { name: 'Streak Bonus', value: 'streak_bonus' },
                            { name: 'Variety Bonus', value: 'variety_bonus' },
                            { name: 'Guild Bonus', value: 'guild_bonus' },
                            { name: 'Plot Bonus', value: 'plot_bonus' }
                        )
                )
                .addNumberOption(option =>
                    option.setName('value')
                        .setDescription('New multiplier value (0.0 to 1.0)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('event')
                .setDescription('Manage special events')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Event action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Start Double Rewards', value: 'double_rewards' },
                            { name: 'Start Triple XP', value: 'triple_xp' },
                            { name: 'Start Faction Bonus', value: 'faction_bonus' },
                            { name: 'End All Events', value: 'end_all' }
                        )
                )
                .addIntegerOption(option =>
                    option.setName('duration_hours')
                        .setDescription('Duration in hours (default: 24)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(168) // 1 week max
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset balance to defaults')
                .addStringOption(option =>
                    option.setName('scope')
                        .setDescription('What to reset')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Global Rewards', value: 'global' },
                            { name: 'All Multipliers', value: 'multipliers' },
                            { name: 'Specific Game', value: 'game' },
                            { name: 'Everything', value: 'all' }
                        )
                )
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('Game to reset (if scope is game)')
                        .setRequired(false)
                )
        ),

    cooldown: 5,
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'view':
                    await this.handleView(interaction);
                    break;
                case 'set-global':
                    await this.handleSetGlobal(interaction);
                    break;
                case 'set-game':
                    await this.handleSetGame(interaction);
                    break;
                case 'set-multiplier':
                    await this.handleSetMultiplier(interaction);
                    break;
                case 'event':
                    await this.handleEvent(interaction);
                    break;
                case 'reset':
                    await this.handleReset(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: 'Unknown subcommand',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in admin-balance command:', error);
            await interaction.reply({
                content: 'An error occurred while processing the balance command.',
                ephemeral: true
            });
        }
    },

    async handleView(interaction) {
        const gameType = interaction.options.getString('game');
        
        try {
            let configs;
            if (gameType) {
                // Get specific game config
                configs = await Database.query(
                    'SELECT * FROM game_balance_config WHERE game_type = $1 AND active = true',
                    [gameType]
                );
            } else {
                // Get all active configs
                configs = await Database.query(
                    'SELECT * FROM game_balance_config WHERE active = true ORDER BY scope, game_type'
                );
            }

            const embed = EmbedBuilderUtil.createBaseEmbed(
                '⚖️ Game Balance Configuration',
                gameType ? `Configuration for ${gameType}` : 'Current balance settings'
            );

            if (configs.rows.length === 0) {
                embed.setDescription('No custom configurations found. Using default values.');
                
                // Show default values
                const defaults = gameRewardCalculator.getBaseRewards();
                const multipliers = gameRewardCalculator.getMultipliers();
                
                embed.addFields(
                    { name: 'Default Base Rewards', value: `Currency: ${defaults.currency}\nXP: ${defaults.xp}`, inline: true },
                    { name: 'Default Multipliers', value: `Speed: ${multipliers.speed_bonus}\nAccuracy: ${multipliers.accuracy_bonus}\nStreak: ${multipliers.streak_bonus}`, inline: true }
                );
            } else {
                for (const config of configs.rows) {
                    const scope = config.scope === 'global' ? '🌍 Global' : `🎮 ${config.game_type}`;
                    const data = config.config_data;
                    
                    let configText = '';
                    for (const [key, value] of Object.entries(data)) {
                        configText += `${key}: ${value}\n`;
                    }
                    
                    embed.addFields({
                        name: scope,
                        value: configText || 'No configuration data',
                        inline: true
                    });
                }
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error viewing balance config:', error);
            await interaction.reply({
                content: 'Error retrieving balance configuration.',
                ephemeral: true
            });
        }
    },

    async handleSetGlobal(interaction) {
        const rewardType = interaction.options.getString('reward_type');
        const value = interaction.options.getInteger('value');

        try {
            // Get or create global config
            let config = await Database.query(
                'SELECT * FROM game_balance_config WHERE scope = $1 AND game_type IS NULL',
                ['global']
            );

            const configData = config.rows[0]?.config_data || {};
            configData[rewardType] = value;

            if (config.rows[0]) {
                // Update existing
                await Database.query(
                    'UPDATE game_balance_config SET config_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [JSON.stringify(configData), config.rows[0].id]
                );
            } else {
                // Create new
                await Database.query(
                    'INSERT INTO game_balance_config (scope, config_data, updated_by) VALUES ($1, $2, $3)',
                    ['global', JSON.stringify(configData), interaction.user.id]
                );
            }

            await interaction.reply({
                content: `✅ Set global ${rewardType} reward to ${value}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting global reward:', error);
            await interaction.reply({
                content: 'Error updating global reward configuration.',
                ephemeral: true
            });
        }
    },

    async handleSetGame(interaction) {
        const game = interaction.options.getString('game');
        const rewardType = interaction.options.getString('reward_type');
        const value = interaction.options.getNumber('value');

        try {
            // Get or create game config
            let config = await Database.query(
                'SELECT * FROM game_balance_config WHERE scope = $1 AND game_type = $2',
                ['local', game]
            );

            const configData = config.rows[0]?.config_data || {};
            configData[rewardType] = value;

            if (config.rows[0]) {
                // Update existing
                await Database.query(
                    'UPDATE game_balance_config SET config_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [JSON.stringify(configData), config.rows[0].id]
                );
            } else {
                // Create new
                await Database.query(
                    'INSERT INTO game_balance_config (scope, game_type, config_data, updated_by) VALUES ($1, $2, $3, $4)',
                    ['local', game, JSON.stringify(configData), interaction.user.id]
                );
            }

            await interaction.reply({
                content: `✅ Set ${game} ${rewardType} to ${value}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting game reward:', error);
            await interaction.reply({
                content: 'Error updating game reward configuration.',
                ephemeral: true
            });
        }
    },

    async handleSetMultiplier(interaction) {
        const multiplierType = interaction.options.getString('multiplier_type');
        const value = interaction.options.getNumber('value');

        try {
            // Get or create global config
            let config = await Database.query(
                'SELECT * FROM game_balance_config WHERE scope = $1 AND game_type IS NULL',
                ['global']
            );

            const configData = config.rows[0]?.config_data || {};
            configData[multiplierType] = value;

            if (config.rows[0]) {
                // Update existing
                await Database.query(
                    'UPDATE game_balance_config SET config_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [JSON.stringify(configData), config.rows[0].id]
                );
            } else {
                // Create new
                await Database.query(
                    'INSERT INTO game_balance_config (scope, config_data, updated_by) VALUES ($1, $2, $3)',
                    ['global', JSON.stringify(configData), interaction.user.id]
                );
            }

            await interaction.reply({
                content: `✅ Set global ${multiplierType} multiplier to ${value}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting multiplier:', error);
            await interaction.reply({
                content: 'Error updating multiplier configuration.',
                ephemeral: true
            });
        }
    },

    async handleEvent(interaction) {
        const action = interaction.options.getString('action');
        const durationHours = interaction.options.getInteger('duration_hours') || 24;

        try {
            const endTime = new Date();
            endTime.setHours(endTime.getHours() + durationHours);

            let eventData = {};
            let eventName = '';

            switch (action) {
                case 'double_rewards':
                    eventData = { currency_multiplier: 2, xp_multiplier: 2 };
                    eventName = 'Double Rewards Event';
                    break;
                case 'triple_xp':
                    eventData = { xp_multiplier: 3 };
                    eventName = 'Triple XP Event';
                    break;
                case 'faction_bonus':
                    eventData = { faction_resource_multiplier: 2 };
                    eventName = 'Faction Resource Bonus Event';
                    break;
                case 'end_all':
                    // Deactivate all events
                    await Database.query(
                        'UPDATE game_balance_config SET active = false WHERE config_data::text LIKE \'%"event"%\''
                    );
                    await interaction.reply({
                        content: '✅ All special events ended',
                        ephemeral: true
                    });
                    return;
            }

            // Create event config
            await Database.query(
                'INSERT INTO game_balance_config (scope, config_data, updated_by) VALUES ($1, $2, $3)',
                ['event', JSON.stringify({
                    ...eventData,
                    event_name: eventName,
                    end_time: endTime.toISOString()
                }), interaction.user.id]
            );

            await interaction.reply({
                content: `✅ Started ${eventName} for ${durationHours} hours`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error managing event:', error);
            await interaction.reply({
                content: 'Error managing special event.',
                ephemeral: true
            });
        }
    },

    async handleReset(interaction) {
        const scope = interaction.options.getString('scope');
        const game = interaction.options.getString('game');

        try {
            switch (scope) {
                case 'global':
                    await Database.query(
                        'DELETE FROM game_balance_config WHERE scope = $1',
                        ['global']
                    );
                    await interaction.reply({
                        content: '✅ Reset global rewards to defaults',
                        ephemeral: true
                    });
                    break;

                case 'multipliers':
                    await Database.query(
                        'UPDATE game_balance_config SET config_data = config_data - \'speed_bonus\' - \'accuracy_bonus\' - \'streak_bonus\' - \'variety_bonus\' - \'guild_bonus\' - \'plot_bonus\' WHERE scope = $1',
                        ['global']
                    );
                    await interaction.reply({
                        content: '✅ Reset all multipliers to defaults',
                        ephemeral: true
                    });
                    break;

                case 'game':
                    if (!game) {
                        await interaction.reply({
                            content: 'Please specify a game to reset.',
                            ephemeral: true
                        });
                        return;
                    }
                    await Database.query(
                        'DELETE FROM game_balance_config WHERE scope = $1 AND game_type = $2',
                        ['local', game]
                    );
                    await interaction.reply({
                        content: `✅ Reset ${game} configuration to defaults`,
                        ephemeral: true
                    });
                    break;

                case 'all':
                    await Database.query('DELETE FROM game_balance_config');
                    await interaction.reply({
                        content: '✅ Reset all balance configurations to defaults',
                        ephemeral: true
                    });
                    break;
            }
        } catch (error) {
            console.error('Error resetting balance:', error);
            await interaction.reply({
                content: 'Error resetting balance configuration.',
                ephemeral: true
            });
        }
    }
};

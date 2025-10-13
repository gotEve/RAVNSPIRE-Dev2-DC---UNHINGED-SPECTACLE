const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const enhancedAntiCheat = require('../../utils/enhancedAntiCheat');
const Database = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anti-cheat')
        .setDescription('Admin: Anti-cheat monitoring and management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View anti-cheat statistics')
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Number of days to show (default: 7)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('validate-user')
                .setDescription('Manually validate a user for suspicious activity')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to validate')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Validation type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Game Completion', value: 'game_completion' },
                            { name: 'Multi-Account', value: 'multi_account' },
                            { name: 'Care Actions', value: 'care_action' },
                            { name: 'Resource Transfer', value: 'resource_transfer' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('View anti-cheat logs for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view logs for')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of logs to show (default: 10)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('thresholds')
                .setDescription('View current anti-cheat thresholds'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('flag-review')
                .setDescription('View users requiring manual review')
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Number of days to check (default: 7)')
                        .setRequired(false))),

    async execute(interaction) {
        try {
            // Check if user is admin (you can add proper admin check here)
            if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                return await interaction.reply({
                    content: '❌ You must be an administrator to use this command.',
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'stats':
                    await handleStats(interaction);
                    break;
                case 'validate-user':
                    await handleValidateUser(interaction);
                    break;
                case 'logs':
                    await handleLogs(interaction);
                    break;
                case 'thresholds':
                    await handleThresholds(interaction);
                    break;
                case 'flag-review':
                    await handleFlagReview(interaction);
                    break;
            }

        } catch (error) {
            console.error('Error in anti-cheat command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleStats(interaction) {
    const days = interaction.options.getInteger('days') || 7;
    
    try {
        const stats = await enhancedAntiCheat.getAntiCheatStats(days);

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ Anti-Cheat Statistics (Last ${days} days)`)
            .setDescription('Anti-cheat system monitoring overview')
            .setColor(0x0099ff)
            .setTimestamp();

        if (stats.length === 0) {
            embed.setDescription('No anti-cheat data found for the specified period.');
        } else {
            let totalValidations = 0;
            let totalFlagged = 0;
            let totalHighSeverity = 0;

            stats.forEach(stat => {
                totalValidations += stat.total_validations;
                totalFlagged += stat.flagged_validations;
                totalHighSeverity += stat.high_severity_flags;

                embed.addFields({
                    name: `${stat.validation_type.replace('_', ' ').toUpperCase()}`,
                    value: `**Total:** ${stat.total_validations}\n**Flagged:** ${stat.flagged_validations}\n**High Severity:** ${stat.high_severity_flags}`,
                    inline: true
                });
            });

            embed.addFields({
                name: '📊 Summary',
                value: `**Total Validations:** ${totalValidations}\n**Total Flagged:** ${totalFlagged}\n**High Severity:** ${totalHighSeverity}\n**Flag Rate:** ${totalValidations > 0 ? ((totalFlagged / totalValidations) * 100).toFixed(1) : 0}%`,
                inline: false
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

async function handleValidateUser(interaction) {
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    
    try {
        await interaction.deferReply();

        let result;
        switch (type) {
            case 'game_completion':
                result = await enhancedAntiCheat.validateGameCompletion(user.id, {});
                break;
            case 'multi_account':
                result = await enhancedAntiCheat.detectMultiAccount(user.id);
                break;
            case 'care_action':
                result = await enhancedAntiCheat.validateCareAction(user.id, null, {});
                break;
            case 'resource_transfer':
                result = await enhancedAntiCheat.validateResourceTransfer(user.id, null, 0, 'manual');
                break;
            default:
                throw new Error('Invalid validation type');
        }

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Validation Results for ${user.username}`)
            .setDescription(`Validation Type: **${type.replace('_', ' ').toUpperCase()}**`)
            .setColor(result.valid || !result.suspicious ? 0x00ff00 : 0xff6b35)
            .setTimestamp();

        if (result.flags && result.flags.length > 0) {
            embed.addFields({
                name: '⚠️ Flags Detected',
                value: result.flags.map(flag => 
                    `**${flag.type}** (${flag.severity})\n${flag.message}`
                ).join('\n\n'),
                inline: false
            });
        } else {
            embed.addFields({
                name: '✅ Status',
                value: 'No suspicious activity detected',
                inline: false
            });
        }

        if (result.requiresReview) {
            embed.addFields({
                name: '🔍 Manual Review Required',
                value: 'This user requires manual review due to high-severity flags.',
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

async function handleLogs(interaction) {
    const user = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 10;
    
    try {
        const logs = await Database.query(`
            SELECT * FROM anti_cheat_logs 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `, [user.id, limit]);

        const embed = new EmbedBuilder()
            .setTitle(`📋 Anti-Cheat Logs for ${user.username}`)
            .setDescription(`Showing last ${limit} logs`)
            .setColor(0x0099ff)
            .setTimestamp();

        if (logs.rows.length === 0) {
            embed.setDescription('No anti-cheat logs found for this user.');
        } else {
            logs.rows.forEach((log, index) => {
                const flags = JSON.parse(log.flags || '[]');
                const flagCount = flags.length;
                const hasHighSeverity = flags.some(f => f.severity === 'high');
                
                embed.addFields({
                    name: `${index + 1}. ${log.validation_type.replace('_', ' ').toUpperCase()}`,
                    value: `**Date:** <t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>\n**Flags:** ${flagCount}\n**High Severity:** ${hasHighSeverity ? 'Yes' : 'No'}`,
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

async function handleThresholds(interaction) {
    try {
        const thresholds = enhancedAntiCheat.thresholds;

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Anti-Cheat Thresholds')
            .setDescription('Current thresholds for detecting suspicious activity')
            .setColor(0x0099ff)
            .setTimestamp();

        embed.addFields(
            {
                name: '🎮 Game Completion',
                value: `**Perfect Score Threshold:** ${(thresholds.perfectScoreThreshold * 100).toFixed(1)}%\n**Speed Threshold:** ${(thresholds.speedThreshold * 100).toFixed(1)}%\n**Timing Consistency:** ${(thresholds.timingConsistency * 100).toFixed(1)}%`,
                inline: true
            },
            {
                name: '💰 Resource Patterns',
                value: `**Accumulation Rate:** ${thresholds.resourceAccumulationRate}x\n**Transfer Frequency:** ${thresholds.transferFrequency}/day`,
                inline: true
            },
            {
                name: '👶 Care Actions',
                value: `**Timing Variation:** ${(thresholds.careTimingVariation * 100).toFixed(1)}%\n**Consistency:** ${(thresholds.careConsistency * 100).toFixed(1)}%`,
                inline: true
            },
            {
                name: '👥 Multi-Account Detection',
                value: `**Device Similarity:** ${(thresholds.deviceFingerprintSimilarity * 100).toFixed(1)}%\n**Behavioral Similarity:** ${(thresholds.behavioralSimilarity * 100).toFixed(1)}%`,
                inline: true
            }
        );

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleFlagReview(interaction) {
    const days = interaction.options.getInteger('days') || 7;
    
    try {
        const flaggedUsers = await Database.query(`
            SELECT 
                user_id,
                COUNT(*) as flag_count,
                COUNT(CASE WHEN JSON_EXTRACT(flags, '$[0].severity') = 'high' THEN 1 END) as high_severity_count,
                MAX(created_at) as last_flag
            FROM anti_cheat_logs 
            WHERE created_at > datetime('now', '-${days} days')
            AND JSON_LENGTH(flags) > 0
            GROUP BY user_id
            HAVING high_severity_count > 0
            ORDER BY high_severity_count DESC, flag_count DESC
            LIMIT 20
        `);

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Users Requiring Review (Last ${days} days)`)
            .setDescription('Users with high-severity flags requiring manual review')
            .setColor(0xff6b35)
            .setTimestamp();

        if (flaggedUsers.rows.length === 0) {
            embed.setDescription('No users requiring manual review found.');
        } else {
            flaggedUsers.rows.forEach((user, index) => {
                embed.addFields({
                    name: `${index + 1}. User ID: ${user.user_id}`,
                    value: `**Total Flags:** ${user.flag_count}\n**High Severity:** ${user.high_severity_count}\n**Last Flag:** <t:${Math.floor(new Date(user.last_flag).getTime() / 1000)}:R>`,
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

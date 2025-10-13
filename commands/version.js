const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const versionTracker = require('../utils/versionTracker');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('version')
        .setDescription('Display bot version information'),

    async execute(interaction) {
        try {
            // Get basic version information
            const buildInfo = versionTracker.getAllBuildInfo();
            const uptimeInfo = versionTracker.getUptimeInfo();
            const featureStatus = versionTracker.getFeatureStatus();

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle('🤖 Ravnspire Bot Version')
                .setColor(0x0099ff)
                .setTimestamp()
                .setFooter({ text: 'Ravnspire Multi-Game Community Bot' });

            // Basic version information
            embed.addFields({
                name: '📦 Version Information',
                value: `**Name:** ${buildInfo.package.name || 'ravnspire-bot'}\n**Version:** ${buildInfo.package.version || 'Unknown'}\n**Build Date:** ${buildInfo.buildDate} ${buildInfo.buildTime}`,
                inline: false
            });

            // Git information (basic)
            if (buildInfo.git.commit) {
                embed.addFields({
                    name: '🔧 Code Information',
                    value: `**Branch:** ${buildInfo.git.branch}\n**Commit:** \`${buildInfo.git.shortCommit}\`\n**Last Commit:** ${buildInfo.git.lastCommitMessage}`,
                    inline: false
                });
            }

            // System information
            embed.addFields({
                name: '🚀 System Information',
                value: `**Environment:** ${buildInfo.system.environment}\n**Uptime:** ${uptimeInfo.formatted}\n**Features:** ${featureStatus.activeFeatures}/${featureStatus.totalFeatures} active`,
                inline: false
            });

            // Feature status
            const features = [
                '✅ Faction System',
                '✅ Marriage & Family',
                '✅ Residential Plots',
                '✅ Guild District',
                '✅ Arena/Crucible',
                '✅ Resource Economy',
                '✅ Global Stats',
                '✅ Enhanced Anti-Cheat',
                '✅ Lore System',
                '✅ Achievement System'
            ];

            embed.addFields({
                name: '🎮 Active Features',
                value: features.join('\n'),
                inline: false
            });

            // Troubleshooting information
            embed.addFields({
                name: '🔍 Troubleshooting',
                value: `**Current Time:** ${new Date().toISOString()}\n**Version String:** \`${versionTracker.getVersionString()}\`\n\n*For detailed information, use \`/admin-version\` (Admin only)*`,
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in version command:', error);
            await interaction.reply({
                content: '❌ An error occurred while retrieving version information.',
                ephemeral: true
            });
        }
    }
};

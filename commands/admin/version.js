const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const versionTracker = require('../../utils/versionTracker');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('version')
        .setDescription('Display bot version information and deployment details')
        .addBooleanOption(option =>
            option.setName('detailed')
                .setDescription('Show detailed system information')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Check if user has admin permissions
            if (!interaction.member.permissions.has('Administrator')) {
                return await interaction.reply({
                    content: '❌ This command requires Administrator permissions.',
                    ephemeral: true
                });
            }

            const detailed = interaction.options.getBoolean('detailed') || false;

            // Get version information from version tracker
            const buildInfo = versionTracker.getAllBuildInfo();
            const uptimeInfo = versionTracker.getUptimeInfo();
            const memoryInfo = versionTracker.getMemoryInfo();
            const featureStatus = versionTracker.getFeatureStatus();

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle('🤖 Ravnspire Bot Version Information')
                .setColor(0x0099ff)
                .setTimestamp()
                .setFooter({ text: 'Ravnspire Multi-Game Community Bot' });

            // Basic version information
            embed.addFields({
                name: '📦 Package Information',
                value: `**Name:** ${buildInfo.package.name || 'ravnspire-bot'}\n**Version:** ${buildInfo.package.version || 'Unknown'}\n**Description:** ${buildInfo.package.description || 'Multi-Game Community Bot'}`,
                inline: false
            });

            // Git information
            if (buildInfo.git.commit) {
                embed.addFields({
                    name: '🔧 Code Information',
                    value: `**Branch:** ${buildInfo.git.branch}\n**Commit:** \`${buildInfo.git.shortCommit}\`\n**Last Commit:** ${buildInfo.git.lastCommit}\n**Message:** ${buildInfo.git.lastCommitMessage}\n**Author:** ${buildInfo.git.lastCommitAuthor}`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '🔧 Code Information',
                    value: 'Git information unavailable',
                    inline: false
                });
            }

            // Deployment information
            embed.addFields({
                name: '🚀 Deployment Information',
                value: `**Environment:** ${buildInfo.system.environment}\n**Node Version:** ${buildInfo.system.nodeVersion}\n**Platform:** ${buildInfo.system.platform} (${buildInfo.system.arch})\n**Uptime:** ${uptimeInfo.formatted}\n**Build Date:** ${buildInfo.buildDate} ${buildInfo.buildTime}`,
                inline: false
            });

            // Detailed information if requested
            if (detailed) {
                embed.addFields({
                    name: '💾 Memory Information',
                    value: `**Heap Used:** ${memoryInfo.heapUsed}MB\n**Heap Total:** ${memoryInfo.heapTotal}MB\n**RSS:** ${memoryInfo.rss}MB\n**External:** ${memoryInfo.external}MB\n**Array Buffers:** ${memoryInfo.arrayBuffers}MB`,
                    inline: false
                });

                // Get database information
                try {
                    const Database = require('../../database/db');
                    const dbInfo = await Database.query('SELECT 1');
                    embed.addFields({
                        name: '🗄️ Database Status',
                        value: '✅ Connected and responsive',
                        inline: false
                    });
                } catch (error) {
                    embed.addFields({
                        name: '🗄️ Database Status',
                        value: '❌ Connection error',
                        inline: false
                    });
                }

                // Get system load information
                const os = require('os');
                embed.addFields({
                    name: '🖥️ Server Information',
                    value: `**CPU Cores:** ${os.cpus().length}\n**Load Average:** ${os.loadavg().map(load => load.toFixed(2)).join(', ')}\n**Free Memory:** ${Math.round(os.freemem() / 1024 / 1024)}MB\n**Total Memory:** ${Math.round(os.totalmem() / 1024 / 1024)}MB\n**Process ID:** ${buildInfo.system.pid}`,
                    inline: false
                });

                // Add deployment details
                embed.addFields({
                    name: '🚀 Deployment Details',
                    value: `**Deployed At:** ${buildInfo.deployment.deployedAt}\n**Deployed By:** ${buildInfo.deployment.deployedBy}\n**Method:** ${buildInfo.deployment.deploymentMethod}\n**Server Host:** ${buildInfo.deployment.serverHost}\n**Database:** ${buildInfo.deployment.databaseUrl}`,
                    inline: false
                });
            }

            // Add feature status
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
                name: '🎮 Feature Status',
                value: `${features.join('\n')}\n\n**Total Features:** ${featureStatus.totalFeatures}\n**Active Features:** ${featureStatus.activeFeatures}`,
                inline: false
            });

            // Add troubleshooting information
            embed.addFields({
                name: '🔍 Troubleshooting Information',
                value: `**Current Time:** ${new Date().toISOString()}\n**Server Time:** ${new Date().toLocaleString()}\n**Timezone:** ${buildInfo.timezone}\n**Started At:** ${uptimeInfo.startedAt}\n**Version String:** \`${versionTracker.getVersionString()}\``,
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

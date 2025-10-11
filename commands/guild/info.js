const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-info')
        .setDescription('View guild information')
        .addStringOption(option =>
            option.setName('guild')
                .setDescription('The guild to view (leave empty for your guild)')
                .setRequired(false)),
    cooldown: 5,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const guildName = interaction.options.getString('guild');

            let guild;
            let isMember = false;
            let userRole = null;

            if (guildName) {
                // View specific guild
                guild = await Database.getGuildByName(guildName);
                if (!guild) {
                    return await interaction.reply({
                        content: 'Guild not found.',
                        ephemeral: true
                    });
                }

                // Check if user is a member
                const userGuild = await Database.getUserGuild(userId);
                if (userGuild && userGuild.id === guild.id) {
                    isMember = true;
                    userRole = userGuild.role;
                }
            } else {
                // View user's guild
                guild = await Database.getUserGuild(userId);
                if (!guild) {
                    return await interaction.reply({
                        content: 'You are not a member of any guild. Use `/guild create` to create one or `/guild join` to join an existing guild.',
                        ephemeral: true
                    });
                }
                isMember = true;
                userRole = guild.role;
            }

            // Get guild members
            const members = await Database.getGuildMembers(guild.id);

            // Get guild owner info
            const owner = members.find(member => member.role === 'owner');
            const officers = members.filter(member => member.role === 'officer');
            const regularMembers = members.filter(member => member.role === 'member');

            const embed = EmbedBuilderUtil.createGuildEmbed(guild, members);

            // Add member breakdown
            embed.addFields(
                { name: 'Owner', value: owner ? `<@${owner.discord_id}>` : 'Unknown', inline: true },
                { name: 'Officers', value: officers.length.toString(), inline: true },
                { name: 'Members', value: regularMembers.length.toString(), inline: true }
            );

            // Add creation date
            const createdDate = new Date(guild.created_at);
            embed.addFields({
                name: 'Created',
                value: `<t:${Math.floor(createdDate.getTime() / 1000)}:R>`,
                inline: true
            });

            // Add user's role if they're a member
            if (isMember) {
                embed.addFields({
                    name: 'Your Role',
                    value: userRole.charAt(0).toUpperCase() + userRole.slice(1),
                    inline: true
                });
            }

            // Add member list (first 10 members)
            if (members.length > 0) {
                const memberList = members.slice(0, 10).map(member => {
                    const roleEmoji = member.role === 'owner' ? '👑' : member.role === 'officer' ? '⭐' : '👤';
                    return `${roleEmoji} ${member.username}`;
                }).join('\n');

                const moreMembers = members.length > 10 ? `\n... and ${members.length - 10} more` : '';
                embed.addFields({
                    name: 'Members',
                    value: memberList + moreMembers,
                    inline: false
                });
            }

            // Add guild statistics
            const guildStatsQuery = `
                SELECT 
                    COUNT(DISTINCT gp.discord_id) as active_players,
                    SUM(gp.xp) as total_game_xp,
                    AVG(gp.xp) as avg_game_xp
                FROM guild_members gm
                LEFT JOIN game_progress gp ON gm.discord_id = gp.discord_id
                WHERE gm.guild_id = $1
            `;
            const statsResult = await Database.query(guildStatsQuery, [guild.id]);
            const stats = statsResult.rows[0];

            if (stats.active_players > 0) {
                embed.addFields(
                    { name: 'Active Players', value: stats.active_players.toString(), inline: true },
                    { name: 'Total Game XP', value: stats.total_game_xp?.toString() || '0', inline: true },
                    { name: 'Average XP', value: Math.round(stats.avg_game_xp || 0).toString(), inline: true }
                );
            }

            // Create action buttons based on user's role
            let components = [];
            if (isMember) {
                if (userRole === 'owner' || userRole === 'officer') {
                    components = [ButtonBuilderUtil.createGuildManagement()];
                }
            } else {
                // Show join button for non-members
                const joinButton = new (require('discord.js')).ActionRowBuilder()
                    .addComponents(
                        new (require('discord.js')).ButtonBuilder()
                            .setCustomId(`guild_join_${guild.id}`)
                            .setLabel('Request to Join')
                            .setStyle(require('discord.js').ButtonStyle.Success)
                            .setEmoji('🤝')
                    );
                components = [joinButton];
            }

            await interaction.reply({
                embeds: [embed],
                components: components
            });

        } catch (error) {
            console.error('Error in guild-info command:', error);
            await interaction.reply({
                content: 'There was an error retrieving guild information.',
                ephemeral: true
            });
        }
    },
};

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const residentialManager = require('../utils/residentialManager');
const guildDistrictManager = require('../utils/guildDistrictManager');
const factionManager = require('../utils/factionManager');
const Database = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plots')
        .setDescription('View and manage plots across all systems')
        .addSubcommand(subcommand =>
            subcommand
                .setName('player')
                .setDescription('View player\'s residential plots')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view plots for (defaults to yourself)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('guild')
                .setDescription('View guild\'s commercial plots in Guild District')
                .addStringOption(option =>
                    option.setName('guild_name')
                        .setDescription('Guild name to view plots for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('neighborhood')
                .setDescription('View all residential plots in a neighborhood')
                .addIntegerOption(option =>
                    option.setName('neighborhood_id')
                        .setDescription('Neighborhood ID to view')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('arena')
                .setDescription('View arena/competition information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('overview')
                .setDescription('View your overall plot holdings across all systems')),

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
                case 'player':
                    await handlePlayerPlots(interaction, activeCharacter);
                    break;
                case 'guild':
                    await handleGuildPlots(interaction, activeCharacter);
                    break;
                case 'neighborhood':
                    await handleNeighborhoodPlots(interaction);
                    break;
                case 'arena':
                    await handleArenaInfo(interaction);
                    break;
                case 'overview':
                    await handleOverview(interaction, activeCharacter);
                    break;
            }

        } catch (error) {
            console.error('Error in plots command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handlePlayerPlots(interaction, activeCharacter) {
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

        const plots = await residentialManager.getCharacterPlots(targetCharacter.id);

        const embed = new EmbedBuilder()
            .setTitle(`🏠 ${targetUser.username}'s Residential Plots`)
            .setDescription(`Residential property holdings`)
            .setColor(0x0099ff)
            .setTimestamp();

        if (plots.length === 0) {
            embed.setDescription('No residential plots owned.');
        } else {
            plots.forEach((plot, index) => {
                embed.addFields({
                    name: `Plot #${plot.plot_number} - ${plot.neighborhood_name}`,
                    value: `**Size:** ${plot.plot_size}\n**Tier:** ${plot.plot_tier}\n**Value:** ${plot.current_value} currency\n**Occupants:** ${plot.current_occupants}/${plot.max_occupants}\n**For Sale:** ${plot.is_for_sale ? `Yes - ${plot.sale_price} currency` : 'No'}`,
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

async function handleGuildPlots(interaction, activeCharacter) {
    const guildName = interaction.options.getString('guild_name');
    
    try {
        let guild;
        
        if (guildName) {
            // Get specified guild
            const guildResult = await Database.query('SELECT * FROM guilds WHERE name = ?', [guildName]);
            if (guildResult.rows.length === 0) {
                return await interaction.reply({
                    content: `❌ Guild "${guildName}" not found.`,
                    ephemeral: true
                });
            }
            guild = guildResult.rows[0];
        } else {
            // Get user's guild
            const guildResult = await Database.query(`
                SELECT g.* FROM guilds g
                JOIN guild_members gm ON g.id = gm.guild_id
                WHERE gm.discord_id = ?
            `, [interaction.user.id]);
            
            if (guildResult.rows.length === 0) {
                return await interaction.reply({
                    content: '❌ You are not a member of any guild.',
                    ephemeral: true
                });
            }
            guild = guildResult.rows[0];
        }

        // Get guild's commercial plots
        const plots = await guildDistrictManager.getGuildPlots(guild.id);

        const embed = new EmbedBuilder()
            .setTitle(`🏢 ${guild.name}'s Guild District Plots`)
            .setDescription(`Commercial property holdings in Guild District`)
            .setColor(0x0099ff)
            .setTimestamp();

        if (plots.length === 0) {
            embed.setDescription('No commercial plots owned in Guild District.');
        } else {
            plots.forEach((plot, index) => {
                embed.addFields({
                    name: `Plot #${plot.plot_number}`,
                    value: `**Size:** ${plot.plot_size}\n**Tier:** ${plot.plot_tier}\n**Building:** ${plot.building_type || 'None'}\n**Level:** ${plot.building_level}\n**Value:** ${plot.current_value} currency`,
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

async function handleNeighborhoodPlots(interaction) {
    const neighborhoodId = interaction.options.getInteger('neighborhood_id');
    
    try {
        // Get neighborhood info
        const neighborhood = await Database.query('SELECT * FROM neighborhoods WHERE id = ?', [neighborhoodId]);
        if (neighborhood.rows.length === 0) {
            return await interaction.reply({
                content: `❌ Neighborhood with ID ${neighborhoodId} not found.`,
                ephemeral: true
            });
        }

        // Get all plots in neighborhood
        const plots = await Database.query(`
            SELECT rp.*, pc.character_name as owner_name, pc.current_faction as owner_faction,
                   COUNT(po.id) as current_occupants
            FROM residential_plots rp
            LEFT JOIN player_characters pc ON rp.owner_character_id = pc.id
            LEFT JOIN plot_occupants po ON rp.id = po.plot_id AND po.moved_out_at IS NULL
            WHERE rp.neighborhood_id = ?
            GROUP BY rp.id
            ORDER BY rp.plot_number
        `, [neighborhoodId]);

        const embed = new EmbedBuilder()
            .setTitle(`🏘️ ${neighborhood.rows[0].name} - All Plots`)
            .setDescription(`Residential plots in ${neighborhood.rows[0].name}`)
            .setColor(0x0099ff)
            .setTimestamp();

        if (plots.rows.length === 0) {
            embed.setDescription('No plots found in this neighborhood.');
        } else {
            const ownedPlots = plots.rows.filter(p => p.owner_name);
            const availablePlots = plots.rows.filter(p => !p.owner_name);
            
            embed.addFields(
                { name: 'Summary', value: `**Total Plots:** ${plots.rows.length}\n**Owned:** ${ownedPlots.length}\n**Available:** ${availablePlots.length}`, inline: false }
            );

            // Show first 10 plots
            plots.rows.slice(0, 10).forEach((plot, index) => {
                const status = plot.owner_name ? `**Owner:** ${plot.owner_name} (${plot.owner_faction})` : '**Status:** Available';
                embed.addFields({
                    name: `Plot #${plot.plot_number}`,
                    value: `**Size:** ${plot.plot_size || 'Not set'}\n**Tier:** ${plot.plot_tier}\n**Occupants:** ${plot.current_occupants}/${plot.max_occupants}\n${status}`,
                    inline: true
                });
            });

            if (plots.rows.length > 10) {
                embed.setFooter({ text: `Showing 10 of ${plots.rows.length} plots` });
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

async function handleArenaInfo(interaction) {
    try {
        // Get arena statistics
        const stats = await Database.query(`
            SELECT 
                COUNT(*) as total_competitions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_competitions,
                COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming_competitions
            FROM arena_competitions
        `);

        const practiceStats = await Database.query(`
            SELECT 
                COUNT(DISTINCT user_id) as active_practitioners,
                SUM(sessions_completed) as total_sessions_today
            FROM arena_practice_log 
            WHERE practice_date = date('now')
        `);

        const embed = new EmbedBuilder()
            .setTitle('⚔️ The Crucible - Arena Information')
            .setDescription('Arena and competition hub information')
            .addFields(
                { name: 'Competitions', value: `**Total:** ${stats.rows[0].total_competitions}\n**Active:** ${stats.rows[0].active_competitions}\n**Upcoming:** ${stats.rows[0].upcoming_competitions}`, inline: true },
                { name: 'Practice Grounds', value: `**Active Today:** ${practiceStats.rows[0].active_practitioners}\n**Sessions Today:** ${practiceStats.rows[0].total_sessions_today || 0}`, inline: true },
                { name: 'Available Activities', value: '• Daily Practice Sessions\n• Individual PvP Tournaments\n• Guild vs Guild Battles\n• Boss Raids\n• Seasonal Events', inline: false }
            )
            .setColor(0xff6b35)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleOverview(interaction, activeCharacter) {
    try {
        // Get user's residential plots
        const residentialPlots = await residentialManager.getCharacterPlots(activeCharacter.id);
        
        // Get user's guild and guild plots
        const guildResult = await Database.query(`
            SELECT g.* FROM guilds g
            JOIN guild_members gm ON g.id = gm.guild_id
            WHERE gm.discord_id = ?
        `, [interaction.user.id]);

        let guildPlots = [];
        if (guildResult.rows.length > 0) {
            guildPlots = await guildDistrictManager.getGuildPlots(guildResult.rows[0].id);
        }

        // Get user's arena participation
        const arenaStats = await Database.query(`
            SELECT 
                COUNT(*) as competitions_joined,
                SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins
            FROM arena_matches 
            WHERE JSON_EXTRACT(participants, '$.users') LIKE ?
        `, [interaction.user.id, `%${interaction.user.id}%`]);

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${interaction.user.username}'s Plot Overview`)
            .setDescription('Your holdings across all systems')
            .setColor(0x0099ff)
            .setTimestamp();

        // Residential plots summary
        const totalResidentialValue = residentialPlots.reduce((sum, plot) => sum + (plot.current_value || 0), 0);
        embed.addFields({
            name: '🏠 Residential Plots',
            value: `**Owned:** ${residentialPlots.length}\n**Total Value:** ${totalResidentialValue} currency\n**Neighborhoods:** ${new Set(residentialPlots.map(p => p.neighborhood_name)).size}`,
            inline: true
        });

        // Guild plots summary
        const totalGuildValue = guildPlots.reduce((sum, plot) => sum + (plot.current_value || 0), 0);
        embed.addFields({
            name: '🏢 Guild District Plots',
            value: `**Guild:** ${guildResult.rows.length > 0 ? guildResult.rows[0].name : 'None'}\n**Plots:** ${guildPlots.length}\n**Total Value:** ${totalGuildValue} currency`,
            inline: true
        });

        // Arena participation
        embed.addFields({
            name: '⚔️ Arena Participation',
            value: `**Competitions:** ${arenaStats.rows[0].competitions_joined || 0}\n**Wins:** ${arenaStats.rows[0].wins || 0}`,
            inline: true
        });

        // Quick actions
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('plots_residential')
                    .setLabel('View Residential')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('plots_guild')
                    .setLabel('View Guild')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('plots_arena')
                    .setLabel('View Arena')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

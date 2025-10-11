const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-wars')
        .setDescription('Manage guild wars and conflicts')
        .addSubcommand(subcommand =>
            subcommand
                .setName('declare')
                .setDescription('Declare war on another guild')
                .addStringOption(option =>
                    option.setName('target')
                        .setDescription('Target guild name')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('War type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Skirmish', value: 'skirmish' },
                            { name: 'Siege', value: 'siege' },
                            { name: 'Tournament', value: 'tournament' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List active wars')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Filter by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Active', value: 'active' },
                            { name: 'Pending', value: 'pending' },
                            { name: 'Completed', value: 'completed' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('accept')
                .setDescription('Accept a war declaration')
                .addIntegerOption(option =>
                    option.setName('war_id')
                        .setDescription('ID of the war to accept')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reject')
                .setDescription('Reject a war declaration')
                .addIntegerOption(option =>
                    option.setName('war_id')
                        .setDescription('ID of the war to reject')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View war status')
                .addIntegerOption(option =>
                    option.setName('war_id')
                        .setDescription('ID of the war to view')
                        .setRequired(true))),
    cooldown: 10,
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            if (subcommand === 'declare') {
                await this.declareWar(interaction);
            } else if (subcommand === 'list') {
                await this.listWars(interaction);
            } else if (subcommand === 'accept') {
                await this.acceptWar(interaction);
            } else if (subcommand === 'reject') {
                await this.rejectWar(interaction);
            } else if (subcommand === 'status') {
                await this.viewWarStatus(interaction);
            }

        } catch (error) {
            console.error('Error in guild-wars command:', error);
            await interaction.reply({
                content: 'There was an error processing your request.',
                ephemeral: true
            });
        }
    },

    async declareWar(interaction) {
        const userId = interaction.user.id;
        const targetGuildName = interaction.options.getString('target');
        const warType = interaction.options.getString('type');

        // Check if user is in a guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to declare war.',
                ephemeral: true
            });
        }

        // Check if user has permission (owner only)
        if (userGuild.role !== 'owner') {
            return await interaction.reply({
                content: 'Only guild owners can declare war.',
                ephemeral: true
            });
        }

        // Get target guild
        const targetGuild = await Database.getGuildByName(targetGuildName);
        if (!targetGuild) {
            return await interaction.reply({
                content: 'Target guild not found.',
                ephemeral: true
            });
        }

        if (targetGuild.id === userGuild.id) {
            return await interaction.reply({
                content: 'You cannot declare war on your own guild.',
                ephemeral: true
            });
        }

        // Check if there's already an active war between these guilds
        const existingWarQuery = `
            SELECT * FROM guild_wars
            WHERE ((guild1_id = $1 AND guild2_id = $2) OR (guild1_id = $2 AND guild2_id = $1))
            AND status IN ('pending', 'active')
        `;
        const existingWarResult = await Database.query(existingWarQuery, [userGuild.id, targetGuild.id]);
        
        if (existingWarResult.rows.length > 0) {
            return await interaction.reply({
                content: 'There is already an active or pending war between these guilds.',
                ephemeral: true
            });
        }

        // Create war declaration
        const warQuery = `
            INSERT INTO guild_wars (guild1_id, guild2_id, war_type, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING *
        `;
        const warResult = await Database.query(warQuery, [userGuild.id, targetGuild.id, warType]);
        const war = warResult.rows[0];

        const embed = EmbedBuilderUtil.createBaseEmbed(
            '⚔️ War Declaration!',
            `**${userGuild.name}** has declared war on **${targetGuild.name}**!`
        );

        embed.addFields(
            { name: 'Declaring Guild', value: userGuild.name, inline: true },
            { name: 'Target Guild', value: targetGuild.name, inline: true },
            { name: 'War Type', value: warType.charAt(0).toUpperCase() + warType.slice(1), inline: true },
            { name: 'War ID', value: war.id.toString(), inline: true },
            { name: 'Status', value: 'Pending Acceptance', inline: true }
        );

        embed.addFields({
            name: 'Next Steps',
            value: `The target guild can accept or reject this war declaration using:\n\`/guild-wars accept war_id:${war.id}\`\n\`/guild-wars reject war_id:${war.id}\``,
            inline: false
        });

        embed.addFields({
            name: 'War Types',
            value: '**Skirmish:** Quick battles, moderate rewards\n**Siege:** Long-term conflict, high rewards\n**Tournament:** Structured competition, prestige rewards',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async listWars(interaction) {
        const userId = interaction.user.id;
        const status = interaction.options.getString('status') || 'all';

        // Get user's guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to view wars.',
                ephemeral: true
            });
        }

        // Build query based on status filter
        let query = `
            SELECT gw.*, g1.name as guild1_name, g2.name as guild2_name, winner.name as winner_name
            FROM guild_wars gw
            JOIN guilds g1 ON gw.guild1_id = g1.id
            JOIN guilds g2 ON gw.guild2_id = g2.id
            LEFT JOIN guilds winner ON gw.winner_id = winner.id
            WHERE (gw.guild1_id = $1 OR gw.guild2_id = $1)
        `;
        const params = [userGuild.id];

        if (status !== 'all') {
            query += ' AND gw.status = $2';
            params.push(status);
        }

        query += ' ORDER BY gw.created_at DESC LIMIT 10';

        const result = await Database.query(query, params);
        const wars = result.rows;

        if (wars.length === 0) {
            const embed = EmbedBuilderUtil.createInfoEmbed(
                'No Wars Found',
                `No wars found for your guild${status !== 'all' ? ` with status: ${status}` : ''}.`
            );
            return await interaction.reply({ embeds: [embed] });
        }

        const embed = EmbedBuilderUtil.createBaseEmbed(
            `⚔️ Guild Wars - ${userGuild.name}`,
            `War history and current conflicts`
        );

        wars.forEach(war => {
            const isGuild1 = war.guild1_id === userGuild.id;
            const opponent = isGuild1 ? war.guild2_name : war.guild1_name;
            const warStart = war.start_time ? new Date(war.start_time) : null;
            const warEnd = war.end_time ? new Date(war.end_time) : null;
            
            let statusText = war.status.charAt(0).toUpperCase() + war.status.slice(1);
            if (war.status === 'pending') {
                statusText += ' (Awaiting Response)';
            } else if (war.status === 'active' && warStart) {
                statusText += ` (Started <t:${Math.floor(warStart.getTime() / 1000)}:R>)`;
            } else if (war.status === 'completed' && warEnd) {
                statusText += ` (Ended <t:${Math.floor(warEnd.getTime() / 1000)}:R>)`;
            }

            const resultText = war.winner_id ? 
                (war.winner_id === userGuild.id ? '🏆 Victory' : '💀 Defeat') : 
                '⚖️ Draw';

            embed.addFields({
                name: `#${war.id} - ${war.war_type.charAt(0).toUpperCase() + war.war_type.slice(1)} vs ${opponent}`,
                value: `**Status:** ${statusText}\n**Result:** ${resultText}\n**Type:** ${war.war_type}\n**Created:** <t:${Math.floor(new Date(war.created_at).getTime() / 1000)}:R>`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    },

    async acceptWar(interaction) {
        const userId = interaction.user.id;
        const warId = interaction.options.getInteger('war_id');

        // Check if user is in a guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to accept wars.',
                ephemeral: true
            });
        }

        // Check if user has permission (owner only)
        if (userGuild.role !== 'owner') {
            return await interaction.reply({
                content: 'Only guild owners can accept wars.',
                ephemeral: true
            });
        }

        // Get war details
        const warQuery = `
            SELECT gw.*, g1.name as guild1_name, g2.name as guild2_name
            FROM guild_wars gw
            JOIN guilds g1 ON gw.guild1_id = g1.id
            JOIN guilds g2 ON gw.guild2_id = g2.id
            WHERE gw.id = $1
        `;
        const warResult = await Database.query(warQuery, [warId]);
        const war = warResult.rows[0];

        if (!war) {
            return await interaction.reply({
                content: 'War not found.',
                ephemeral: true
            });
        }

        // Check if user's guild is the target
        if (war.guild2_id !== userGuild.id) {
            return await interaction.reply({
                content: 'You can only accept wars declared against your guild.',
                ephemeral: true
            });
        }

        // Check if war is still pending
        if (war.status !== 'pending') {
            return await interaction.reply({
                content: 'This war is no longer pending.',
                ephemeral: true
            });
        }

        // Accept the war
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

        const acceptQuery = `
            UPDATE guild_wars
            SET status = 'active', start_time = $1, end_time = $2
            WHERE id = $3
        `;
        await Database.query(acceptQuery, [startTime, endTime, warId]);

        const embed = EmbedBuilderUtil.createSuccessEmbed(
            '⚔️ War Accepted!',
            `**${userGuild.name}** has accepted the war declaration!`
        );

        embed.addFields(
            { name: 'War ID', value: war.id.toString(), inline: true },
            { name: 'War Type', value: war.war_type.charAt(0).toUpperCase() + war.war_type.slice(1), inline: true },
            { name: 'Status', value: 'Active', inline: true },
            { name: 'Declaring Guild', value: war.guild1_name, inline: true },
            { name: 'Defending Guild', value: war.guild2_name, inline: true },
            { name: 'Duration', value: '24 hours', inline: true }
        );

        embed.addFields({
            name: 'War Begins!',
            value: `The war between **${war.guild1_name}** and **${war.guild2_name}** has begun! Both guilds can now engage in combat activities.`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async rejectWar(interaction) {
        const userId = interaction.user.id;
        const warId = interaction.options.getInteger('war_id');

        // Check if user is in a guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to reject wars.',
                ephemeral: true
            });
        }

        // Check if user has permission (owner only)
        if (userGuild.role !== 'owner') {
            return await interaction.reply({
                content: 'Only guild owners can reject wars.',
                ephemeral: true
            });
        }

        // Get war details
        const warQuery = `
            SELECT gw.*, g1.name as guild1_name, g2.name as guild2_name
            FROM guild_wars gw
            JOIN guilds g1 ON gw.guild1_id = g1.id
            JOIN guilds g2 ON gw.guild2_id = g2.id
            WHERE gw.id = $1
        `;
        const warResult = await Database.query(warQuery, [warId]);
        const war = warResult.rows[0];

        if (!war) {
            return await interaction.reply({
                content: 'War not found.',
                ephemeral: true
            });
        }

        // Check if user's guild is the target
        if (war.guild2_id !== userGuild.id) {
            return await interaction.reply({
                content: 'You can only reject wars declared against your guild.',
                ephemeral: true
            });
        }

        // Check if war is still pending
        if (war.status !== 'pending') {
            return await interaction.reply({
                content: 'This war is no longer pending.',
                ephemeral: true
            });
        }

        // Reject the war
        const rejectQuery = `
            UPDATE guild_wars
            SET status = 'cancelled'
            WHERE id = $1
        `;
        await Database.query(rejectQuery, [warId]);

        const embed = EmbedBuilderUtil.createWarningEmbed(
            '⚔️ War Rejected',
            `**${userGuild.name}** has rejected the war declaration.`
        );

        embed.addFields(
            { name: 'War ID', value: war.id.toString(), inline: true },
            { name: 'Declaring Guild', value: war.guild1_name, inline: true },
            { name: 'Rejecting Guild', value: war.guild2_name, inline: true },
            { name: 'Status', value: 'Cancelled', inline: true }
        );

        embed.addFields({
            name: 'War Cancelled',
            value: `The war declaration from **${war.guild1_name}** has been rejected by **${war.guild2_name}**. No conflict will occur.`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async viewWarStatus(interaction) {
        const userId = interaction.user.id;
        const warId = interaction.options.getInteger('war_id');

        // Get war details
        const warQuery = `
            SELECT gw.*, g1.name as guild1_name, g2.name as guild2_name, winner.name as winner_name
            FROM guild_wars gw
            JOIN guilds g1 ON gw.guild1_id = g1.id
            JOIN guilds g2 ON gw.guild2_id = g2.id
            LEFT JOIN guilds winner ON gw.winner_id = winner.id
            WHERE gw.id = $1
        `;
        const warResult = await Database.query(warQuery, [warId]);
        const war = warResult.rows[0];

        if (!war) {
            return await interaction.reply({
                content: 'War not found.',
                ephemeral: true
            });
        }

        const embed = EmbedBuilderUtil.createBaseEmbed(
            `⚔️ War Status - #${war.id}`,
            `Details of the war between ${war.guild1_name} and ${war.guild2_name}`
        );

        embed.addFields(
            { name: 'War Type', value: war.war_type.charAt(0).toUpperCase() + war.war_type.slice(1), inline: true },
            { name: 'Status', value: war.status.charAt(0).toUpperCase() + war.status.slice(1), inline: true },
            { name: 'Declaring Guild', value: war.guild1_name, inline: true },
            { name: 'Target Guild', value: war.guild2_name, inline: true }
        );

        if (war.start_time) {
            const startTime = new Date(war.start_time);
            embed.addFields({
                name: 'War Started',
                value: `<t:${Math.floor(startTime.getTime() / 1000)}:R>`,
                inline: true
            });
        }

        if (war.end_time) {
            const endTime = new Date(war.end_time);
            embed.addFields({
                name: 'War Ends',
                value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`,
                inline: true
            });
        }

        if (war.winner_name) {
            embed.addFields({
                name: 'Winner',
                value: war.winner_name,
                inline: true
            });
        }

        embed.addFields({
            name: 'Created',
            value: `<t:${Math.floor(new Date(war.created_at).getTime() / 1000)}:R>`,
            inline: true
        });

        // Add war-specific information
        if (war.status === 'active') {
            embed.addFields({
                name: 'Active War',
                value: 'This war is currently active. Both guilds can engage in combat activities.',
                inline: false
            });
        } else if (war.status === 'pending') {
            embed.addFields({
                name: 'Pending War',
                value: `This war is waiting for ${war.guild2_name} to accept or reject the declaration.`,
                inline: false
            });
        } else if (war.status === 'completed') {
            embed.addFields({
                name: 'Completed War',
                value: `This war has ended. ${war.winner_name ? `${war.winner_name} was victorious!` : 'The war ended in a draw.'}`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};

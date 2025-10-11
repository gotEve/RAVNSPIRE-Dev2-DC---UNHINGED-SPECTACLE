const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-competitions')
        .setDescription('Manage guild competitions and tournaments')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new guild competition')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Competition name')
                        .setRequired(true)
                        .setMaxLength(200))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Competition description')
                        .setRequired(true)
                        .setMaxLength(1000))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Competition type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tournament', value: 'tournament' },
                            { name: 'Challenge', value: 'challenge' },
                            { name: 'Event', value: 'event' }
                        ))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in hours (1-168)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(168))
                .addIntegerOption(option =>
                    option.setName('entry_fee')
                        .setDescription('Entry fee in currency')
                        .setRequired(false)
                        .setMinValue(0))
                .addIntegerOption(option =>
                    option.setName('max_participants')
                        .setDescription('Maximum number of participants')
                        .setRequired(false)
                        .setMinValue(2)
                        .setMaxValue(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List available competitions')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Filter by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Upcoming', value: 'upcoming' },
                            { name: 'Active', value: 'active' },
                            { name: 'Completed', value: 'completed' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join a competition')
                .addIntegerOption(option =>
                    option.setName('competition_id')
                        .setDescription('ID of the competition to join')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Leave a competition')
                .addIntegerOption(option =>
                    option.setName('competition_id')
                        .setDescription('ID of the competition to leave')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View competition status')
                .addIntegerOption(option =>
                    option.setName('competition_id')
                        .setDescription('ID of the competition to view')
                        .setRequired(true))),
    cooldown: 10,
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            if (subcommand === 'create') {
                await this.createCompetition(interaction);
            } else if (subcommand === 'list') {
                await this.listCompetitions(interaction);
            } else if (subcommand === 'join') {
                await this.joinCompetition(interaction);
            } else if (subcommand === 'leave') {
                await this.leaveCompetition(interaction);
            } else if (subcommand === 'status') {
                await this.viewCompetitionStatus(interaction);
            }

        } catch (error) {
            console.error('Error in guild-competitions command:', error);
            await interaction.reply({
                content: 'There was an error processing your request.',
                ephemeral: true
            });
        }
    },

    async createCompetition(interaction) {
        const userId = interaction.user.id;
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const type = interaction.options.getString('type');
        const duration = interaction.options.getInteger('duration');
        const entryFee = interaction.options.getInteger('entry_fee') || 0;
        const maxParticipants = interaction.options.getInteger('max_participants') || 10;

        // Check if user is in a guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to create competitions.',
                ephemeral: true
            });
        }

        // Check if user has permission (owner or officer)
        if (userGuild.role !== 'owner' && userGuild.role !== 'officer') {
            return await interaction.reply({
                content: 'Only guild owners and officers can create competitions.',
                ephemeral: true
            });
        }

        // Create competition
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));

        const competitionQuery = `
            INSERT INTO guild_competitions (
                name, description, competition_type, start_time, end_time,
                entry_fee, max_participants, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming')
            RETURNING *
        `;
        const competitionResult = await Database.query(competitionQuery, [
            name, description, type, startTime, endTime, entryFee, maxParticipants
        ]);
        const competition = competitionResult.rows[0];

        const embed = EmbedBuilderUtil.createSuccessEmbed(
            '🏆 Competition Created!',
            `Your guild competition has been created successfully.`
        );

        embed.addFields(
            { name: 'Name', value: name, inline: true },
            { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
            { name: 'Duration', value: `${duration} hours`, inline: true },
            { name: 'Entry Fee', value: `${entryFee} currency`, inline: true },
            { name: 'Max Participants', value: maxParticipants.toString(), inline: true },
            { name: 'Competition ID', value: competition.id.toString(), inline: true }
        );

        embed.addFields({
            name: 'Description',
            value: description,
            inline: false
        });

        embed.addFields({
            name: 'Schedule',
            value: `**Starts:** <t:${Math.floor(startTime.getTime() / 1000)}:R>\n**Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>`,
            inline: false
        });

        embed.addFields({
            name: 'How to Join',
            value: `Other guilds can join using:\n\`/guild-competitions join competition_id:${competition.id}\``,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async listCompetitions(interaction) {
        const userId = interaction.user.id;
        const status = interaction.options.getString('status') || 'all';

        // Build query based on status filter
        let query = `
            SELECT gc.*, COUNT(gcp.guild_id) as participant_count
            FROM guild_competitions gc
            LEFT JOIN guild_competition_participants gcp ON gc.id = gcp.competition_id
        `;
        const params = [];

        if (status !== 'all') {
            query += ' WHERE gc.status = $1';
            params.push(status);
        }

        query += ' GROUP BY gc.id ORDER BY gc.start_time DESC LIMIT 10';

        const result = await Database.query(query, params);
        const competitions = result.rows;

        if (competitions.length === 0) {
            const embed = EmbedBuilderUtil.createInfoEmbed(
                'No Competitions Found',
                `No competitions found${status !== 'all' ? ` with status: ${status}` : ''}.`
            );
            return await interaction.reply({ embeds: [embed] });
        }

        const embed = EmbedBuilderUtil.createBaseEmbed(
            '🏆 Guild Competitions',
            `Available guild competitions and tournaments`
        );

        competitions.forEach(competition => {
            const startTime = new Date(competition.start_time);
            const endTime = new Date(competition.end_time);
            const now = new Date();
            
            let statusText = competition.status.charAt(0).toUpperCase() + competition.status.slice(1);
            if (competition.status === 'upcoming' && now < startTime) {
                statusText += ` (Starts <t:${Math.floor(startTime.getTime() / 1000)}:R>)`;
            } else if (competition.status === 'active') {
                statusText += ` (Ends <t:${Math.floor(endTime.getTime() / 1000)}:R>)`;
            } else if (competition.status === 'completed') {
                statusText += ` (Ended <t:${Math.floor(endTime.getTime() / 1000)}:R>)`;
            }

            embed.addFields({
                name: `#${competition.id} - ${competition.name}`,
                value: `**Type:** ${competition.competition_type}\n**Status:** ${statusText}\n**Participants:** ${competition.participant_count}/${competition.max_participants}\n**Entry Fee:** ${competition.entry_fee} currency\n**Description:** ${competition.description.substring(0, 150)}${competition.description.length > 150 ? '...' : ''}`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    },

    async joinCompetition(interaction) {
        const userId = interaction.user.id;
        const competitionId = interaction.options.getInteger('competition_id');

        // Check if user is in a guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to join competitions.',
                ephemeral: true
            });
        }

        // Check if user has permission (owner or officer)
        if (userGuild.role !== 'owner' && userGuild.role !== 'officer') {
            return await interaction.reply({
                content: 'Only guild owners and officers can join competitions.',
                ephemeral: true
            });
        }

        // Get competition details
        const competitionQuery = `
            SELECT * FROM guild_competitions WHERE id = $1
        `;
        const competitionResult = await Database.query(competitionQuery, [competitionId]);
        const competition = competitionResult.rows[0];

        if (!competition) {
            return await interaction.reply({
                content: 'Competition not found.',
                ephemeral: true
            });
        }

        // Check if competition is still accepting participants
        if (competition.status !== 'upcoming') {
            return await interaction.reply({
                content: 'This competition is no longer accepting participants.',
                ephemeral: true
            });
        }

        // Check if guild is already participating
        const existingParticipantQuery = `
            SELECT * FROM guild_competition_participants
            WHERE competition_id = $1 AND guild_id = $2
        `;
        const existingParticipantResult = await Database.query(existingParticipantQuery, [competitionId, userGuild.id]);
        
        if (existingParticipantResult.rows.length > 0) {
            return await interaction.reply({
                content: 'Your guild is already participating in this competition.',
                ephemeral: true
            });
        }

        // Check if competition is full
        const participantCountQuery = `
            SELECT COUNT(*) as count FROM guild_competition_participants
            WHERE competition_id = $1
        `;
        const participantCountResult = await Database.query(participantCountQuery, [competitionId]);
        const participantCount = parseInt(participantCountResult.rows[0].count);

        if (participantCount >= competition.max_participants) {
            return await interaction.reply({
                content: 'This competition is full.',
                ephemeral: true
            });
        }

        // Check entry fee
        if (competition.entry_fee > 0) {
            const user = await Database.getUser(userId);
            if (user.currency < competition.entry_fee) {
                return await interaction.reply({
                    content: `You don't have enough currency to pay the entry fee of ${competition.entry_fee}.`,
                    ephemeral: true
                });
            }

            // Deduct entry fee
            await Database.updateUserCurrency(userId, -competition.entry_fee);
        }

        // Join competition
        const joinQuery = `
            INSERT INTO guild_competition_participants (competition_id, guild_id)
            VALUES ($1, $2)
        `;
        await Database.query(joinQuery, [competitionId, userGuild.id]);

        const embed = EmbedBuilderUtil.createSuccessEmbed(
            '🏆 Competition Joined!',
            `Your guild has successfully joined the competition!`
        );

        embed.addFields(
            { name: 'Competition', value: competition.name, inline: true },
            { name: 'Guild', value: userGuild.name, inline: true },
            { name: 'Entry Fee Paid', value: `${competition.entry_fee} currency`, inline: true },
            { name: 'Participants', value: `${participantCount + 1}/${competition.max_participants}`, inline: true }
        );

        embed.addFields({
            name: 'Competition Details',
            value: `**Type:** ${competition.competition_type}\n**Description:** ${competition.description}\n**Starts:** <t:${Math.floor(new Date(competition.start_time).getTime() / 1000)}:R>`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async leaveCompetition(interaction) {
        const userId = interaction.user.id;
        const competitionId = interaction.options.getInteger('competition_id');

        // Check if user is in a guild
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to leave competitions.',
                ephemeral: true
            });
        }

        // Check if user has permission (owner or officer)
        if (userGuild.role !== 'owner' && userGuild.role !== 'officer') {
            return await interaction.reply({
                content: 'Only guild owners and officers can leave competitions.',
                ephemeral: true
            });
        }

        // Check if guild is participating
        const participantQuery = `
            SELECT gcp.*, gc.name as competition_name, gc.status
            FROM guild_competition_participants gcp
            JOIN guild_competitions gc ON gcp.competition_id = gc.id
            WHERE gcp.competition_id = $1 AND gcp.guild_id = $2
        `;
        const participantResult = await Database.query(participantQuery, [competitionId, userGuild.id]);
        const participant = participantResult.rows[0];

        if (!participant) {
            return await interaction.reply({
                content: 'Your guild is not participating in this competition.',
                ephemeral: true
            });
        }

        // Check if competition has started
        if (participant.status === 'active') {
            return await interaction.reply({
                content: 'You cannot leave a competition that has already started.',
                ephemeral: true
            });
        }

        // Leave competition
        const leaveQuery = `
            DELETE FROM guild_competition_participants
            WHERE competition_id = $1 AND guild_id = $2
        `;
        await Database.query(leaveQuery, [competitionId, userGuild.id]);

        const embed = EmbedBuilderUtil.createWarningEmbed(
            '🏆 Competition Left',
            `Your guild has left the competition.`
        );

        embed.addFields(
            { name: 'Competition', value: participant.competition_name, inline: true },
            { name: 'Guild', value: userGuild.name, inline: true }
        );

        embed.addFields({
            name: 'Note',
            value: 'Entry fees are not refunded when leaving a competition.',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async viewCompetitionStatus(interaction) {
        const userId = interaction.user.id;
        const competitionId = interaction.options.getInteger('competition_id');

        // Get competition details
        const competitionQuery = `
            SELECT gc.*, COUNT(gcp.guild_id) as participant_count
            FROM guild_competitions gc
            LEFT JOIN guild_competition_participants gcp ON gc.id = gcp.competition_id
            WHERE gc.id = $1
            GROUP BY gc.id
        `;
        const competitionResult = await Database.query(competitionQuery, [competitionId]);
        const competition = competitionResult.rows[0];

        if (!competition) {
            return await interaction.reply({
                content: 'Competition not found.',
                ephemeral: true
            });
        }

        // Get participants
        const participantsQuery = `
            SELECT gcp.*, g.name as guild_name, g.level as guild_level
            FROM guild_competition_participants gcp
            JOIN guilds g ON gcp.guild_id = g.id
            WHERE gcp.competition_id = $1
            ORDER BY gcp.score DESC, gcp.joined_at ASC
        `;
        const participantsResult = await Database.query(participantsQuery, [competitionId]);
        const participants = participantsResult.rows;

        const embed = EmbedBuilderUtil.createBaseEmbed(
            `🏆 Competition Status - ${competition.name}`,
            `Details and current standings`
        );

        embed.addFields(
            { name: 'Type', value: competition.competition_type.charAt(0).toUpperCase() + competition.competition_type.slice(1), inline: true },
            { name: 'Status', value: competition.status.charAt(0).toUpperCase() + competition.status.slice(1), inline: true },
            { name: 'Participants', value: `${competition.participant_count}/${competition.max_participants}`, inline: true },
            { name: 'Entry Fee', value: `${competition.entry_fee} currency`, inline: true }
        );

        embed.addFields({
            name: 'Description',
            value: competition.description,
            inline: false
        });

        embed.addFields({
            name: 'Schedule',
            value: `**Starts:** <t:${Math.floor(new Date(competition.start_time).getTime() / 1000)}:R>\n**Ends:** <t:${Math.floor(new Date(competition.end_time).getTime() / 1000)}:R>`,
            inline: false
        });

        if (participants.length > 0) {
            const leaderboard = participants.map((participant, index) => {
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                return `${medal} **${participant.guild_name}** - ${participant.score} points (Level ${participant.guild_level})`;
            }).join('\n');

            embed.addFields({
                name: 'Current Standings',
                value: leaderboard,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};

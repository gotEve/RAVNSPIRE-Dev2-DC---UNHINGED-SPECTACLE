const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crucible-admin')
        .setDescription('Admin commands for The Crucible arena system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-competition')
                .setDescription('Create a new arena competition')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Competition type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Individual PvP', value: 'individual_pvp' },
                            { name: 'Guild PvP', value: 'guild_pvp' },
                            { name: 'Tournament', value: 'tournament' },
                            { name: 'Boss Raid', value: 'boss_raid' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Competition name')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('game')
                        .setDescription('Game type')
                        .addChoices(
                            { name: 'Tetris', value: 'tetris' },
                            { name: 'Tic Tac Toe', value: 'tictactoe' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('max_participants')
                        .setDescription('Maximum participants')
                        .setMinValue(2)
                        .setMaxValue(100)
                )
                .addIntegerOption(option =>
                    option
                        .setName('entry_fee')
                        .setDescription('Entry fee in currency')
                        .setMinValue(0)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration_minutes')
                        .setDescription('Competition duration in minutes')
                        .setMinValue(5)
                        .setMaxValue(1440)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('start-boss-raid')
                .setDescription('Start a server-wide boss raid')
                .addStringOption(option =>
                    option
                        .setName('boss_name')
                        .setDescription('Name of the boss')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('health')
                        .setDescription('Boss health points')
                        .setRequired(true)
                        .setMinValue(1000)
                        .setMaxValue(1000000)
                )
                .addStringOption(option =>
                    option
                        .setName('game')
                        .setDescription('Game type for the raid')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tetris', value: 'tetris' },
                            { name: 'Tic Tac Toe', value: 'tictactoe' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration_hours')
                        .setDescription('Raid duration in hours')
                        .setMinValue(1)
                        .setMaxValue(24)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('end-competition')
                .setDescription('Manually end a competition')
                .addIntegerOption(option =>
                    option
                        .setName('competition_id')
                        .setDescription('ID of the competition to end')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view-competition')
                .setDescription('View detailed competition information')
                .addIntegerOption(option =>
                    option
                        .setName('competition_id')
                        .setDescription('ID of the competition to view')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-event')
                .setDescription('Create a scheduled arena event')
                .addStringOption(option =>
                    option
                        .setName('event_type')
                        .setDescription('Type of event')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Daily Practice', value: 'daily_practice' },
                            { name: 'Weekly Tournament', value: 'weekly_tournament' },
                            { name: 'Monthly Boss Raid', value: 'monthly_boss_raid' },
                            { name: 'Special Event', value: 'special_event' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Event name')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('game')
                        .setDescription('Game type')
                        .addChoices(
                            { name: 'Tetris', value: 'tetris' },
                            { name: 'Tic Tac Toe', value: 'tictactoe' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('start_hours')
                        .setDescription('Hours from now to start the event')
                        .setMinValue(1)
                        .setMaxValue(168)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration_hours')
                        .setDescription('Event duration in hours')
                        .setMinValue(1)
                        .setMaxValue(72)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard-reset')
                .setDescription('Reset leaderboard data')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Leaderboard type to reset')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Daily Practice', value: 'daily_practice' },
                            { name: 'Weekly Competitions', value: 'weekly_competitions' },
                            { name: 'Monthly Tournaments', value: 'monthly_tournaments' },
                            { name: 'All Time', value: 'all_time' }
                        )
                )
        ),

    async execute(interaction) {
        // Check if user has admin permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create-competition':
                    await handleCreateCompetition(interaction);
                    break;
                case 'start-boss-raid':
                    await handleStartBossRaid(interaction);
                    break;
                case 'end-competition':
                    await handleEndCompetition(interaction);
                    break;
                case 'view-competition':
                    await handleViewCompetition(interaction);
                    break;
                case 'create-event':
                    await handleCreateEvent(interaction);
                    break;
                case 'leaderboard-reset':
                    await handleLeaderboardReset(interaction);
                    break;
            }

        } catch (error) {
            console.error('Crucible admin command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleCreateCompetition(interaction) {
    const type = interaction.options.getString('type');
    const name = interaction.options.getString('name');
    const gameType = interaction.options.getString('game');
    const maxParticipants = interaction.options.getInteger('max_participants') || 16;
    const entryFee = interaction.options.getInteger('entry_fee') || 0;
    const durationMinutes = interaction.options.getInteger('duration_minutes') || 60;

    const startTime = new Date(Date.now() + 300000); // 5 minutes from now
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    // Calculate rewards based on competition type
    let rewards = {};
    switch (type) {
        case 'individual_pvp':
            rewards = { xp: 500, currency: 250 };
            break;
        case 'guild_pvp':
            rewards = { xp: 1000, currency: 500 };
            break;
        case 'tournament':
            rewards = { xp: 2000, currency: 1000, title: 'Tournament Winner' };
            break;
        case 'boss_raid':
            rewards = { xp: 1500, currency: 750, title: 'Boss Slayer' };
            break;
    }

    const result = await Database.query(`
        INSERT INTO arena_competitions (
            competition_type, name, game_type, max_participants, entry_fee,
            start_time, end_time, duration_minutes, rewards, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
    `, [
        type, name, gameType, maxParticipants, entryFee,
        startTime.toISOString(), endTime.toISOString(), durationMinutes,
        JSON.stringify(rewards), interaction.user.id
    ]);

    const competitionId = result.rows[0].id;

    const embed = new EmbedBuilder()
        .setTitle('⚔️ Competition Created!')
        .setDescription(`**${name}** has been created successfully.`)
        .addFields(
            { name: '🆔 Competition ID', value: competitionId.toString(), inline: true },
            { name: '🎮 Type', value: type.replace('_', ' ').toUpperCase(), inline: true },
            { name: '🎯 Game', value: gameType || 'Various', inline: true },
            { name: '👥 Max Participants', value: maxParticipants.toString(), inline: true },
            { name: '💰 Entry Fee', value: `${entryFee} currency`, inline: true },
            { name: '⏰ Duration', value: `${durationMinutes} minutes`, inline: true },
            { name: '🏆 Rewards', value: `XP: ${rewards.xp}, Currency: ${rewards.currency}${rewards.title ? `, Title: ${rewards.title}` : ''}`, inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleStartBossRaid(interaction) {
    const bossName = interaction.options.getString('boss_name');
    const health = interaction.options.getInteger('health');
    const gameType = interaction.options.getString('game');
    const durationHours = interaction.options.getInteger('duration_hours') || 6;

    const startTime = new Date(Date.now() + 60000); // 1 minute from now
    const endTime = new Date(startTime.getTime() + durationHours * 3600000);

    const rewards = {
        xp: Math.floor(health / 100),
        currency: Math.floor(health / 200),
        title: `${bossName} Slayer`
    };

    const result = await Database.query(`
        INSERT INTO arena_competitions (
            competition_type, name, game_type, max_participants, entry_fee,
            start_time, end_time, duration_minutes, rewards, boss_health,
            boss_current_health, boss_name, server_wide, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
    `, [
        'boss_raid', `${bossName} Raid`, gameType, 1000, 0,
        startTime.toISOString(), endTime.toISOString(), durationHours * 60,
        JSON.stringify(rewards), health, health, bossName, true, interaction.user.id
    ]);

    const competitionId = result.rows[0].id;

    const embed = new EmbedBuilder()
        .setTitle('🐉 Boss Raid Started!')
        .setDescription(`**${bossName}** has appeared! The server must work together to defeat this mighty foe!`)
        .addFields(
            { name: '🆔 Raid ID', value: competitionId.toString(), inline: true },
            { name: '❤️ Boss Health', value: health.toLocaleString(), inline: true },
            { name: '🎮 Game Type', value: gameType, inline: true },
            { name: '⏰ Duration', value: `${durationHours} hours`, inline: true },
            { name: '🏆 Rewards', value: `XP: ${rewards.xp}, Currency: ${rewards.currency}, Title: ${rewards.title}`, inline: false }
        )
        .setColor('#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleEndCompetition(interaction) {
    const competitionId = interaction.options.getInteger('competition_id');

    // Get the competition
    const competition = await Database.query(
        'SELECT * FROM arena_competitions WHERE id = $1',
        [competitionId]
    );

    if (competition.rows.length === 0) {
        return await interaction.reply({
            content: '❌ Competition not found.',
            ephemeral: true
        });
    }

    const comp = competition.rows[0];

    if (comp.status === 'completed') {
        return await interaction.reply({
            content: '❌ Competition is already completed.',
            ephemeral: true
        });
    }

    // End the competition
    await Database.query(
        'UPDATE arena_competitions SET status = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', competitionId]
    );

    const embed = new EmbedBuilder()
        .setTitle('🏁 Competition Ended')
        .setDescription(`**${comp.name}** has been manually ended.`)
        .addFields(
            { name: '🆔 Competition ID', value: competitionId.toString(), inline: true },
            { name: '📊 Status', value: 'Completed', inline: true },
            { name: '⏰ Ended At', value: new Date().toLocaleString(), inline: true }
        )
        .setColor('#FFA500')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleViewCompetition(interaction) {
    const competitionId = interaction.options.getInteger('competition_id');

    // Get the competition
    const competition = await Database.query(
        'SELECT * FROM arena_competitions WHERE id = $1',
        [competitionId]
    );

    if (competition.rows.length === 0) {
        return await interaction.reply({
            content: '❌ Competition not found.',
            ephemeral: true
        });
    }

    const comp = competition.rows[0];
    const participants = JSON.parse(comp.participants || '{}');
    const rewards = JSON.parse(comp.rewards || '{}');
    const winners = JSON.parse(comp.winners || '[]');

    const embed = new EmbedBuilder()
        .setTitle(`📊 Competition Details: ${comp.name}`)
        .setColor('#2B2D31')
        .setTimestamp();

    let details = `**🆔 ID:** ${comp.id}\n`;
    details += `**🎮 Type:** ${comp.competition_type.replace('_', ' ').toUpperCase()}\n`;
    details += `**🎯 Game:** ${comp.game_type || 'Various'}\n`;
    details += `**📊 Status:** ${comp.status}\n`;
    details += `**👥 Participants:** ${(participants.users || []).length}/${comp.max_participants}\n`;
    details += `**💰 Entry Fee:** ${comp.entry_fee} currency\n`;
    details += `**⏰ Start Time:** ${comp.start_time ? new Date(comp.start_time).toLocaleString() : 'TBD'}\n`;
    details += `**⏰ End Time:** ${comp.end_time ? new Date(comp.end_time).toLocaleString() : 'TBD'}\n`;

    if (comp.boss_name) {
        details += `**🐉 Boss:** ${comp.boss_name}\n`;
        details += `**❤️ Health:** ${comp.boss_current_health}/${comp.boss_health}\n`;
    }

    if (Object.keys(rewards).length > 0) {
        details += `**🏆 Rewards:** XP: ${rewards.xp || 0}, Currency: ${rewards.currency || 0}`;
        if (rewards.title) details += `, Title: ${rewards.title}`;
        details += '\n';
    }

    if (winners.length > 0) {
        details += `**🏅 Winners:** ${winners.map(id => `<@${id}>`).join(', ')}\n`;
    }

    embed.setDescription(details);

    await interaction.reply({ embeds: [embed] });
}

async function handleCreateEvent(interaction) {
    const eventType = interaction.options.getString('event_type');
    const name = interaction.options.getString('name');
    const gameType = interaction.options.getString('game');
    const startHours = interaction.options.getInteger('start_hours') || 24;
    const durationHours = interaction.options.getInteger('duration_hours') || 2;

    const startTime = new Date(Date.now() + startHours * 3600000);
    const endTime = new Date(startTime.getTime() + durationHours * 3600000);

    // Calculate rewards based on event type
    let rewards = {};
    switch (eventType) {
        case 'daily_practice':
            rewards = { xp_bonus: 1.5 };
            break;
        case 'weekly_tournament':
            rewards = { xp: 2000, currency: 1000, title: 'Weekly Champion' };
            break;
        case 'monthly_boss_raid':
            rewards = { xp: 5000, currency: 2500, title: 'Monthly Boss Slayer' };
            break;
        case 'special_event':
            rewards = { xp: 1000, currency: 500, special_rewards: true };
            break;
    }

    const result = await Database.query(`
        INSERT INTO arena_events (
            event_type, name, start_time, end_time, game_type,
            max_participants, rewards, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `, [
        eventType, name, startTime.toISOString(), endTime.toISOString(),
        gameType, 1000, JSON.stringify(rewards), true
    ]);

    const eventId = result.rows[0].id;

    const embed = new EmbedBuilder()
        .setTitle('📅 Event Created!')
        .setDescription(`**${name}** has been scheduled successfully.`)
        .addFields(
            { name: '🆔 Event ID', value: eventId.toString(), inline: true },
            { name: '🎪 Type', value: eventType.replace('_', ' ').toUpperCase(), inline: true },
            { name: '🎮 Game', value: gameType || 'Various', inline: true },
            { name: '⏰ Start Time', value: startTime.toLocaleString(), inline: true },
            { name: '⏰ End Time', value: endTime.toLocaleString(), inline: true },
            { name: '🏆 Rewards', value: JSON.stringify(rewards), inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboardReset(interaction) {
    const type = interaction.options.getString('type');

    // Create confirmation button
    const confirmButton = new ButtonBuilder()
        .setCustomId(`reset_leaderboard_${type}`)
        .setLabel('Confirm Reset')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_reset_${type}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const embed = new EmbedBuilder()
        .setTitle('⚠️ Confirm Leaderboard Reset')
        .setDescription(`Are you sure you want to reset the **${type.replace('_', ' ')}** leaderboard?\n\nThis action cannot be undone!`)
        .setColor('#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
}

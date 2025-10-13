const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../../database/db');
const { embedBuilder } = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crucible')
        .setDescription('Enter The Crucible - Arena competitions, practice, and tournaments')
        .addSubcommand(subcommand =>
            subcommand
                .setName('practice')
                .setDescription('Practice in The Crucible for daily XP gains')
                .addStringOption(option =>
                    option
                        .setName('game')
                        .setDescription('Game to practice')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tetris', value: 'tetris' },
                            { name: 'Tic Tac Toe', value: 'tictactoe' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an active competition')
                .addIntegerOption(option =>
                    option
                        .setName('competition_id')
                        .setDescription('ID of the competition to join')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View arena leaderboards')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Leaderboard type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Daily Practice', value: 'daily_practice' },
                            { name: 'Weekly Competitions', value: 'weekly_competitions' },
                            { name: 'Monthly Tournaments', value: 'monthly_tournaments' },
                            { name: 'All Time', value: 'all_time' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('game')
                        .setDescription('Game type (optional)')
                        .addChoices(
                            { name: 'Tetris', value: 'tetris' },
                            { name: 'Tic Tac Toe', value: 'tictactoe' },
                            { name: 'All Games', value: 'all' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('View upcoming arena events and competitions')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View your arena statistics and achievements')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('competitions')
                .setDescription('View active competitions you can join')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'practice':
                    await handlePractice(interaction, userId);
                    break;
                case 'join':
                    await handleJoin(interaction, userId);
                    break;
                case 'leaderboard':
                    await handleLeaderboard(interaction);
                    break;
                case 'schedule':
                    await handleSchedule(interaction);
                    break;
                case 'status':
                    await handleStatus(interaction, userId);
                    break;
                case 'competitions':
                    await handleCompetitions(interaction);
                    break;
            }

        } catch (error) {
            console.error('Crucible command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handlePractice(interaction, userId) {
    const gameType = interaction.options.getString('game');
    const today = new Date().toISOString().split('T')[0];

    // Check if user has already practiced today
    const existingPractice = await Database.query(
        'SELECT * FROM arena_practice_log WHERE user_id = $1 AND practice_date = $2 AND game_type = $3',
        [userId, today, gameType]
    );

    if (existingPractice.rows.length > 0) {
        const practice = existingPractice.rows[0];
        
        if (practice.sessions_completed >= 5) {
            return await interaction.reply({
                content: `❌ You've already completed your maximum 5 practice sessions for ${gameType} today. Come back tomorrow!`,
                ephemeral: true
            });
        }
    }

    // Create or update practice log
    const xpPerSession = 25;
    const maxSessions = 5;

    if (existingPractice.rows.length > 0) {
        // Update existing practice log
        await Database.query(
            'UPDATE arena_practice_log SET sessions_completed = sessions_completed + 1, xp_earned = xp_earned + $1 WHERE user_id = $2 AND practice_date = $3 AND game_type = $4',
            [xpPerSession, userId, today, gameType]
        );
    } else {
        // Create new practice log
        await Database.query(
            'INSERT INTO arena_practice_log (user_id, game_type, xp_earned, sessions_completed) VALUES ($1, $2, $3, $4)',
            [userId, gameType, xpPerSession, 1]
        );
    }

    // Get updated practice info
    const updatedPractice = await Database.query(
        'SELECT * FROM arena_practice_log WHERE user_id = $1 AND practice_date = $2 AND game_type = $3',
        [userId, today, gameType]
    );

    const practice = updatedPractice.rows[0];
    const remainingSessions = maxSessions - practice.sessions_completed;

    const embed = new EmbedBuilder()
        .setTitle('⚔️ Practice Session Complete!')
        .setDescription(`You've completed a practice session in **${gameType}** and earned **${xpPerSession} XP**!`)
        .addFields(
            { name: '📊 Today\'s Progress', value: `Sessions: ${practice.sessions_completed}/${maxSessions}\nTotal XP: ${practice.xp_earned}`, inline: true },
            { name: '⏰ Remaining Sessions', value: `${remainingSessions} sessions left today`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    if (remainingSessions > 0) {
        const practiceButton = new ButtonBuilder()
            .setCustomId(`practice_${gameType}`)
            .setLabel(`Practice ${gameType} Again`)
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(practiceButton);
        await interaction.reply({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed] });
    }
}

async function handleJoin(interaction, userId) {
    const competitionId = interaction.options.getInteger('competition_id');

    // Get the competition
    const competition = await Database.query(
        'SELECT * FROM arena_competitions WHERE id = $1 AND status = $2',
        [competitionId, 'upcoming']
    );

    if (competition.rows.length === 0) {
        return await interaction.reply({
            content: '❌ Competition not found or not accepting participants.',
            ephemeral: true
        });
    }

    const comp = competition.rows[0];
    const participants = JSON.parse(comp.participants || '{}');
    const userParticipants = participants.users || [];

    // Check if user is already participating
    if (userParticipants.includes(userId)) {
        return await interaction.reply({
            content: '❌ You are already participating in this competition.',
            ephemeral: true
        });
    }

    // Check if competition is full
    if (userParticipants.length >= comp.max_participants) {
        return await interaction.reply({
            content: '❌ This competition is full.',
            ephemeral: true
        });
    }

    // Add user to participants
    userParticipants.push(userId);
    participants.users = userParticipants;

    await Database.query(
        'UPDATE arena_competitions SET participants = $1 WHERE id = $2',
        [JSON.stringify(participants), competitionId]
    );

    const embed = new EmbedBuilder()
        .setTitle('⚔️ Competition Joined!')
        .setDescription(`You have successfully joined **${comp.name}**!`)
        .addFields(
            { name: '🎮 Game Type', value: comp.game_type || 'Various', inline: true },
            { name: '👥 Participants', value: `${userParticipants.length}/${comp.max_participants}`, inline: true },
            { name: '⏰ Start Time', value: comp.start_time ? new Date(comp.start_time).toLocaleString() : 'TBD', inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction) {
    const type = interaction.options.getString('type');
    const gameType = interaction.options.getString('game') || 'all';

    // Calculate date range based on type
    let periodStart, periodEnd;
    const now = new Date();

    switch (type) {
        case 'daily_practice':
            periodStart = now.toISOString().split('T')[0];
            periodEnd = periodStart;
            break;
        case 'weekly_competitions':
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
            periodStart = weekStart.toISOString().split('T')[0];
            periodEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
        case 'monthly_tournaments':
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            break;
        case 'all_time':
            periodStart = null;
            periodEnd = null;
            break;
    }

    // Build query based on type
    let query, params;
    
    if (type === 'daily_practice') {
        query = `
            SELECT user_id, game_type, xp_earned, sessions_completed
            FROM arena_practice_log 
            WHERE practice_date = $1
            ${gameType !== 'all' ? 'AND game_type = $2' : ''}
            ORDER BY xp_earned DESC, sessions_completed DESC
            LIMIT 10
        `;
        params = gameType !== 'all' ? [periodStart, gameType] : [periodStart];
    } else {
        query = `
            SELECT user_id, guild_id, score, rank, matches_played, matches_won, win_rate
            FROM arena_leaderboards 
            WHERE leaderboard_type = $1
            ${gameType !== 'all' ? 'AND game_type = $2' : ''}
            ${periodStart ? 'AND period_start = $3' : ''}
            ORDER BY score DESC, win_rate DESC
            LIMIT 10
        `;
        params = [type];
        if (gameType !== 'all') params.push(gameType);
        if (periodStart) params.push(periodStart);
    }

    const results = await Database.query(query, params);

    if (results.rows.length === 0) {
        return await interaction.reply({
            content: `❌ No data found for ${type} leaderboard${gameType !== 'all' ? ` (${gameType})` : ''}.`,
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${type.replace('_', ' ').toUpperCase()} Leaderboard`)
        .setColor('#FFD700')
        .setTimestamp();

    if (gameType !== 'all') {
        embed.setDescription(`**Game:** ${gameType}\n**Period:** ${periodStart || 'All Time'}`);
    }

    let leaderboardText = '';
    results.rows.forEach((entry, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        
        if (type === 'daily_practice') {
            leaderboardText += `${medal} <@${entry.user_id}> - ${entry.xp_earned} XP (${entry.sessions_completed} sessions)\n`;
        } else {
            const winRate = entry.win_rate ? `${entry.win_rate}%` : 'N/A';
            leaderboardText += `${medal} <@${entry.user_id}> - ${entry.score} points (${entry.matches_won}/${entry.matches_played} wins, ${winRate})\n`;
        }
    });

    embed.addFields({ name: '🏅 Rankings', value: leaderboardText, inline: false });

    await interaction.reply({ embeds: [embed] });
}

async function handleSchedule(interaction) {
    const now = new Date().toISOString();
    
    // Get upcoming events
    const events = await Database.query(
        'SELECT * FROM arena_events WHERE start_time > $1 AND active = true ORDER BY start_time LIMIT 10',
        [now]
    );

    // Get upcoming competitions
    const competitions = await Database.query(
        'SELECT * FROM arena_competitions WHERE start_time > $1 AND status = $2 ORDER BY start_time LIMIT 10',
        [now, 'upcoming']
    );

    const embed = new EmbedBuilder()
        .setTitle('📅 Arena Schedule')
        .setColor('#2B2D31')
        .setTimestamp();

    if (events.rows.length === 0 && competitions.rows.length === 0) {
        embed.setDescription('No upcoming events or competitions scheduled.');
    } else {
        let scheduleText = '';

        if (events.rows.length > 0) {
            scheduleText += '**🎪 Upcoming Events:**\n';
            events.rows.forEach(event => {
                const startTime = new Date(event.start_time).toLocaleString();
                scheduleText += `• **${event.name}** - ${startTime}\n`;
                if (event.description) {
                    scheduleText += `  ${event.description}\n`;
                }
            });
            scheduleText += '\n';
        }

        if (competitions.rows.length > 0) {
            scheduleText += '**⚔️ Upcoming Competitions:**\n';
            competitions.rows.forEach(comp => {
                const startTime = new Date(comp.start_time).toLocaleString();
                const participants = JSON.parse(comp.participants || '{}');
                const participantCount = (participants.users || []).length;
                scheduleText += `• **${comp.name}** (${comp.game_type}) - ${startTime}\n`;
                scheduleText += `  Participants: ${participantCount}/${comp.max_participants}\n`;
            });
        }

        embed.setDescription(scheduleText);
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleStatus(interaction, userId) {
    // Get user's practice stats
    const practiceStats = await Database.query(
        'SELECT game_type, SUM(xp_earned) as total_xp, SUM(sessions_completed) as total_sessions FROM arena_practice_log WHERE user_id = $1 GROUP BY game_type',
        [userId]
    );

    // Get user's competition stats
    const competitionStats = await Database.query(
        'SELECT COUNT(*) as total_matches, SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) as wins FROM arena_matches WHERE participants LIKE $2',
        [userId, `%${userId}%`]
    );

    // Get user's achievements
    const achievements = await Database.query(
        'SELECT aa.name, aa.description, aa.rarity FROM user_arena_achievements uaa JOIN arena_achievements aa ON uaa.achievement_id = aa.id WHERE uaa.user_id = $1',
        [userId]
    );

    const embed = new EmbedBuilder()
        .setTitle('⚔️ Your Arena Status')
        .setColor('#2B2D31')
        .setTimestamp();

    let statusText = '';

    // Practice stats
    if (practiceStats.rows.length > 0) {
        statusText += '**🏃 Practice Stats:**\n';
        practiceStats.rows.forEach(stat => {
            statusText += `• ${stat.game_type}: ${stat.total_xp} XP (${stat.total_sessions} sessions)\n`;
        });
        statusText += '\n';
    }

    // Competition stats
    if (competitionStats.rows.length > 0) {
        const stats = competitionStats.rows[0];
        const winRate = stats.total_matches > 0 ? ((stats.wins / stats.total_matches) * 100).toFixed(1) : 0;
        statusText += `**🏆 Competition Stats:**\n`;
        statusText += `• Matches: ${stats.total_matches}\n`;
        statusText += `• Wins: ${stats.wins}\n`;
        statusText += `• Win Rate: ${winRate}%\n\n`;
    }

    // Achievements
    if (achievements.rows.length > 0) {
        statusText += '**🏅 Arena Achievements:**\n';
        achievements.rows.forEach(achievement => {
            const rarityEmoji = {
                'common': '⚪',
                'uncommon': '🟢',
                'rare': '🔵',
                'epic': '🟣',
                'legendary': '🟡'
            };
            statusText += `${rarityEmoji[achievement.rarity] || '⚪'} ${achievement.name}\n`;
        });
    }

    if (statusText === '') {
        statusText = 'You haven\'t participated in any arena activities yet. Try practicing or joining a competition!';
    }

    embed.setDescription(statusText);

    await interaction.reply({ embeds: [embed] });
}

async function handleCompetitions(interaction) {
    const now = new Date().toISOString();
    
    // Get active competitions
    const competitions = await Database.query(
        'SELECT * FROM arena_competitions WHERE start_time > $1 AND status = $2 ORDER BY start_time LIMIT 10',
        [now, 'upcoming']
    );

    const embed = new EmbedBuilder()
        .setTitle('⚔️ Active Competitions')
        .setColor('#2B2D31')
        .setTimestamp();

    if (competitions.rows.length === 0) {
        embed.setDescription('No active competitions available. Check back later or create one!');
    } else {
        let competitionText = '';
        
        competitions.rows.forEach(comp => {
            const participants = JSON.parse(comp.participants || '{}');
            const participantCount = (participants.users || []).length;
            const startTime = new Date(comp.start_time).toLocaleString();
            
            competitionText += `**${comp.name}** (ID: ${comp.id})\n`;
            competitionText += `• Game: ${comp.game_type || 'Various'}\n`;
            competitionText += `• Participants: ${participantCount}/${comp.max_participants}\n`;
            competitionText += `• Start: ${startTime}\n`;
            if (comp.entry_fee > 0) {
                competitionText += `• Entry Fee: ${comp.entry_fee} currency\n`;
            }
            competitionText += '\n';
        });

        embed.setDescription(competitionText);
        embed.setFooter({ text: 'Use /crucible join [competition_id] to join a competition' });
    }

    await interaction.reply({ embeds: [embed] });
}

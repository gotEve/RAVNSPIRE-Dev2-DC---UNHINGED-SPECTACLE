const Database = require('../database/db');

class ArenaManager {
    constructor() {
        this.practiceLimits = {
            maxSessionsPerDay: 5,
            xpPerSession: 25
        };

        this.competitionTypes = {
            individual_pvp: { maxParticipants: 16, defaultDuration: 60 },
            guild_pvp: { maxParticipants: 8, defaultDuration: 90 },
            tournament: { maxParticipants: 32, defaultDuration: 120 },
            boss_raid: { maxParticipants: 1000, defaultDuration: 360 }
        };
    }

    /**
     * Check if user can practice today
     */
    async canUserPractice(userId, gameType) {
        const today = new Date().toISOString().split('T')[0];
        
        const practice = await Database.query(
            'SELECT sessions_completed FROM arena_practice_log WHERE user_id = $1 AND practice_date = $2 AND game_type = $3',
            [userId, today, gameType]
        );

        if (practice.rows.length === 0) {
            return { canPractice: true, sessionsCompleted: 0, remainingSessions: this.practiceLimits.maxSessionsPerDay };
        }

        const sessionsCompleted = practice.rows[0].sessions_completed;
        const remainingSessions = this.practiceLimits.maxSessionsPerDay - sessionsCompleted;

        return {
            canPractice: remainingSessions > 0,
            sessionsCompleted,
            remainingSessions
        };
    }

    /**
     * Record a practice session
     */
    async recordPracticeSession(userId, gameType, score = 0) {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if user can practice
        const canPractice = await this.canUserPractice(userId, gameType);
        if (!canPractice.canPractice) {
            throw new Error('Daily practice limit reached');
        }

        // Update or create practice log
        const existingPractice = await Database.query(
            'SELECT * FROM arena_practice_log WHERE user_id = $1 AND practice_date = $2 AND game_type = $3',
            [userId, today, gameType]
        );

        if (existingPractice.rows.length > 0) {
            // Update existing practice log
            const currentPractice = existingPractice.rows[0];
            const newBestScore = Math.max(currentPractice.best_score || 0, score);
            const newAverageScore = ((currentPractice.average_score || 0) * currentPractice.sessions_completed + score) / (currentPractice.sessions_completed + 1);
            
            await Database.query(
                'UPDATE arena_practice_log SET sessions_completed = sessions_completed + 1, xp_earned = xp_earned + $1, total_practice_time = total_practice_time + $2, best_score = $3, average_score = $4 WHERE user_id = $5 AND practice_date = $6 AND game_type = $7',
                [this.practiceLimits.xpPerSession, 300, newBestScore, newAverageScore, userId, today, gameType]
            );
        } else {
            // Create new practice log
            await Database.query(
                'INSERT INTO arena_practice_log (user_id, game_type, xp_earned, sessions_completed, total_practice_time, best_score, average_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, gameType, this.practiceLimits.xpPerSession, 1, 300, score, score]
            );
        }

        return {
            xpEarned: this.practiceLimits.xpPerSession,
            sessionsCompleted: canPractice.sessionsCompleted + 1,
            remainingSessions: canPractice.remainingSessions - 1
        };
    }

    /**
     * Create a new competition
     */
    async createCompetition(competitionData) {
        const {
            type,
            name,
            description = '',
            gameType = null,
            maxParticipants = this.competitionTypes[type]?.maxParticipants || 16,
            entryFee = 0,
            durationMinutes = this.competitionTypes[type]?.defaultDuration || 60,
            startTime = new Date(Date.now() + 300000), // 5 minutes from now
            rewards = {},
            createdBy
        } = competitionData;

        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

        const result = await Database.query(`
            INSERT INTO arena_competitions (
                competition_type, name, description, game_type, max_participants,
                entry_fee, start_time, end_time, duration_minutes, rewards, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            type, name, description, gameType, maxParticipants,
            entryFee, startTime.toISOString(), endTime.toISOString(),
            durationMinutes, JSON.stringify(rewards), createdBy
        ]);

        return result.rows[0].id;
    }

    /**
     * Join a competition
     */
    async joinCompetition(competitionId, userId) {
        // Get the competition
        const competition = await Database.query(
            'SELECT * FROM arena_competitions WHERE id = $1 AND status = $2',
            [competitionId, 'upcoming']
        );

        if (competition.rows.length === 0) {
            throw new Error('Competition not found or not accepting participants');
        }

        const comp = competition.rows[0];
        const participants = JSON.parse(comp.participants || '{}');
        const userParticipants = participants.users || [];

        // Check if user is already participating
        if (userParticipants.includes(userId)) {
            throw new Error('User is already participating in this competition');
        }

        // Check if competition is full
        if (userParticipants.length >= comp.max_participants) {
            throw new Error('Competition is full');
        }

        // Add user to participants
        userParticipants.push(userId);
        participants.users = userParticipants;

        await Database.query(
            'UPDATE arena_competitions SET participants = $1 WHERE id = $2',
            [JSON.stringify(participants), competitionId]
        );

        return {
            competitionId,
            participantCount: userParticipants.length,
            maxParticipants: comp.max_participants
        };
    }

    /**
     * Start a boss raid
     */
    async startBossRaid(bossData) {
        const {
            bossName,
            health,
            gameType,
            durationHours = 6,
            createdBy
        } = bossData;

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
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            'boss_raid', `${bossName} Raid`, gameType, 1000, 0,
            startTime.toISOString(), endTime.toISOString(), durationHours * 60,
            JSON.stringify(rewards), health, health, bossName, true, createdBy
        ]);

        return result.rows[0].id;
    }

    /**
     * Record a match result
     */
    async recordMatch(matchData) {
        const {
            competitionId,
            matchType,
            participants,
            winnerId,
            winnerGuildId = null,
            matchData: gameData,
            durationSeconds
        } = matchData;

        const result = await Database.query(`
            INSERT INTO arena_matches (
                competition_id, match_type, participants, winner_id,
                winner_guild_id, match_data, duration_seconds
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [
            competitionId, matchType, JSON.stringify(participants),
            winnerId, winnerGuildId, JSON.stringify(gameData), durationSeconds
        ]);

        return result.rows[0].id;
    }

    /**
     * Update leaderboard
     */
    async updateLeaderboard(userId, leaderboardData) {
        const {
            leaderboardType,
            gameType,
            periodStart,
            periodEnd,
            score,
            matchesPlayed,
            matchesWon
        } = leaderboardData;

        const winRate = matchesPlayed > 0 ? (matchesWon / matchesPlayed) * 100 : 0;

        // Get current rank
        const rankResult = await Database.query(
            'SELECT COUNT(*) + 1 as rank FROM arena_leaderboards WHERE leaderboard_type = $1 AND game_type = $2 AND period_start = $3 AND score > $4',
            [leaderboardType, gameType, periodStart, score]
        );

        const rank = parseInt(rankResult.rows[0].rank);

        // Update or insert leaderboard entry
        await Database.query(`
            INSERT INTO arena_leaderboards (
                leaderboard_type, game_type, period_start, period_end,
                user_id, score, rank, matches_played, matches_won, win_rate
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (leaderboard_type, game_type, period_start, user_id, guild_id)
            DO UPDATE SET
                score = EXCLUDED.score,
                rank = EXCLUDED.rank,
                matches_played = EXCLUDED.matches_played,
                matches_won = EXCLUDED.matches_won,
                win_rate = EXCLUDED.win_rate
        `, [
            leaderboardType, gameType, periodStart, periodEnd,
            userId, score, rank, matchesPlayed, matchesWon, winRate
        ]);

        return { rank, winRate };
    }

    /**
     * Get leaderboard data
     */
    async getLeaderboard(leaderboardType, gameType = null, periodStart = null, limit = 10) {
        let query = `
            SELECT user_id, guild_id, score, rank, matches_played, matches_won, win_rate
            FROM arena_leaderboards 
            WHERE leaderboard_type = $1
        `;
        let params = [leaderboardType];

        if (gameType) {
            query += ' AND game_type = $2';
            params.push(gameType);
        }

        if (periodStart) {
            query += ` AND period_start = $${params.length + 1}`;
            params.push(periodStart);
        }

        query += ' ORDER BY score DESC, win_rate DESC LIMIT $' + (params.length + 1);
        params.push(limit);

        const result = await Database.query(query, params);
        return result.rows;
    }

    /**
     * Get user's arena statistics
     */
    async getUserStats(userId) {
        // Practice stats
        const practiceStats = await Database.query(
            'SELECT game_type, SUM(xp_earned) as total_xp, SUM(sessions_completed) as total_sessions FROM arena_practice_log WHERE user_id = $1 GROUP BY game_type',
            [userId]
        );

        // Competition stats
        const competitionStats = await Database.query(
            'SELECT COUNT(*) as total_matches, SUM(CASE WHEN winner_id = $1 THEN 1 ELSE 0 END) as wins FROM arena_matches WHERE participants LIKE $2',
            [userId, `%${userId}%`]
        );

        // Achievements
        const achievements = await Database.query(
            'SELECT aa.name, aa.description, aa.rarity FROM user_arena_achievements uaa JOIN arena_achievements aa ON uaa.achievement_id = aa.id WHERE uaa.user_id = $1',
            [userId]
        );

        return {
            practice: practiceStats.rows,
            competition: competitionStats.rows[0] || { total_matches: 0, wins: 0 },
            achievements: achievements.rows
        };
    }

    /**
     * Get active competitions
     */
    async getActiveCompetitions(limit = 10) {
        const now = new Date().toISOString();
        
        const result = await Database.query(
            'SELECT * FROM arena_competitions WHERE start_time > $1 AND status = $2 ORDER BY start_time LIMIT $3',
            [now, 'upcoming', limit]
        );

        return result.rows;
    }

    /**
     * Get upcoming events
     */
    async getUpcomingEvents(limit = 10) {
        const now = new Date().toISOString();
        
        const result = await Database.query(
            'SELECT * FROM arena_events WHERE start_time > $1 AND active = true ORDER BY start_time LIMIT $2',
            [now, limit]
        );

        return result.rows;
    }

    /**
     * Check and award arena achievements
     */
    async checkArenaAchievements(userId) {
        const userStats = await this.getUserStats(userId);
        const achievements = await Database.query('SELECT * FROM arena_achievements WHERE active = true');
        
        const newAchievements = [];

        for (const achievement of achievements.rows) {
            const requirements = JSON.parse(achievement.requirements);
            const rewards = JSON.parse(achievement.rewards);
            
            // Check if user already has this achievement
            const existingAchievement = await Database.query(
                'SELECT id FROM user_arena_achievements WHERE user_id = $1 AND achievement_id = $2',
                [userId, achievement.id]
            );

            if (existingAchievement.rows.length > 0) {
                continue; // User already has this achievement
            }

            let shouldAward = false;

            // Check achievement requirements
            switch (achievement.achievement_type) {
                case 'practice_master':
                    if (requirements.consecutive_days) {
                        // Check for consecutive practice days
                        const consecutiveDays = await this.getConsecutivePracticeDays(userId);
                        shouldAward = consecutiveDays >= requirements.consecutive_days;
                    } else if (requirements.total_days) {
                        // Check for total practice days
                        const totalDays = await this.getTotalPracticeDays(userId);
                        shouldAward = totalDays >= requirements.total_days;
                    }
                    break;

                case 'tournament_winner':
                    if (requirements.tournament_wins) {
                        const tournamentWins = await this.getTournamentWins(userId);
                        shouldAward = tournamentWins >= requirements.tournament_wins;
                    }
                    break;

                case 'boss_slayer':
                    if (requirements.boss_raids) {
                        const bossRaids = await this.getBossRaids(userId);
                        shouldAward = bossRaids >= requirements.boss_raids;
                    } else if (requirements.killing_blows) {
                        const killingBlows = await this.getKillingBlows(userId);
                        shouldAward = killingBlows >= requirements.killing_blows;
                    }
                    break;

                case 'undefeated':
                    if (requirements.win_streak) {
                        const winStreak = await this.getWinStreak(userId);
                        shouldAward = winStreak >= requirements.win_streak;
                    }
                    break;
            }

            if (shouldAward) {
                // Award the achievement
                await Database.query(
                    'INSERT INTO user_arena_achievements (user_id, achievement_id) VALUES ($1, $2)',
                    [userId, achievement.id]
                );

                newAchievements.push({
                    name: achievement.name,
                    description: achievement.description,
                    rarity: achievement.rarity,
                    rewards
                });
            }
        }

        return newAchievements;
    }

    // Helper methods for achievement checking
    async getConsecutivePracticeDays(userId) {
        // Implementation would check consecutive days of practice
        return 0; // Placeholder
    }

    async getTotalPracticeDays(userId) {
        const result = await Database.query(
            'SELECT COUNT(DISTINCT practice_date) as total_days FROM arena_practice_log WHERE user_id = $1',
            [userId]
        );
        return result.rows[0].total_days || 0;
    }

    async getTournamentWins(userId) {
        const result = await Database.query(
            'SELECT COUNT(*) as wins FROM arena_matches WHERE winner_id = $1 AND match_type = $2',
            [userId, 'tournament']
        );
        return result.rows[0].wins || 0;
    }

    async getBossRaids(userId) {
        const result = await Database.query(
            'SELECT COUNT(*) as raids FROM arena_matches WHERE participants LIKE $1 AND match_type = $2',
            [`%${userId}%`, 'boss_raid']
        );
        return result.rows[0].raids || 0;
    }

    async getKillingBlows(userId) {
        // Implementation would check for killing blows in boss raids
        return 0; // Placeholder
    }

    async getWinStreak(userId) {
        // Implementation would calculate current win streak
        return 0; // Placeholder
    }
}

module.exports = new ArenaManager();

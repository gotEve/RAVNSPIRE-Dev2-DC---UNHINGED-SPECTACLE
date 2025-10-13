const Database = require('../database/db');
const ArenaManager = require('../utils/arenaManager');

async function testArenaCommands() {
    console.log('⚔️ Testing Arena Commands System...\n');

    try {
        // Test 1: Practice session functionality
        console.log('1. Testing practice session functionality...');
        const testUserId = '999888777'; // Use different user ID to avoid daily limits
        const gameType = 'tetris';

        // Check if user can practice
        const canPractice = await ArenaManager.canUserPractice(testUserId, gameType);
        console.log(`✅ User can practice: ${canPractice.canPractice}`);
        console.log(`   Sessions completed: ${canPractice.sessionsCompleted}`);
        console.log(`   Remaining sessions: ${canPractice.remainingSessions}`);

        // Record a practice session
        const practiceResult = await ArenaManager.recordPracticeSession(testUserId, gameType, 15000);
        console.log(`✅ Practice session recorded:`);
        console.log(`   XP earned: ${practiceResult.xpEarned}`);
        console.log(`   Sessions completed: ${practiceResult.sessionsCompleted}`);
        console.log(`   Remaining sessions: ${practiceResult.remainingSessions}`);

        // Test 2: Competition creation
        console.log('\n2. Testing competition creation...');
        const competitionData = {
            type: 'individual_pvp',
            name: 'Test Tournament',
            description: 'A test tournament for system verification',
            gameType: 'tetris',
            maxParticipants: 16,
            entryFee: 100,
            durationMinutes: 60,
            createdBy: testUserId
        };

        const competitionId = await ArenaManager.createCompetition(competitionData);
        console.log(`✅ Competition created with ID: ${competitionId}`);

        // Test 3: Join competition
        console.log('\n3. Testing competition joining...');
        const joinResult = await ArenaManager.joinCompetition(competitionId, testUserId);
        console.log(`✅ User joined competition:`);
        console.log(`   Competition ID: ${joinResult.competitionId}`);
        console.log(`   Participants: ${joinResult.participantCount}/${joinResult.maxParticipants}`);

        // Test 4: Boss raid creation
        console.log('\n4. Testing boss raid creation...');
        const bossData = {
            bossName: 'Test Dragon',
            health: 10000,
            gameType: 'tetris',
            durationHours: 6,
            createdBy: testUserId
        };

        const bossRaidId = await ArenaManager.startBossRaid(bossData);
        console.log(`✅ Boss raid created with ID: ${bossRaidId}`);

        // Test 5: Match recording
        console.log('\n5. Testing match recording...');
        const matchData = {
            competitionId: competitionId,
            matchType: '1v1',
            participants: [
                { user_id: testUserId, score: 15000 },
                { user_id: '987654321', score: 12000 }
            ],
            winnerId: testUserId,
            matchData: {
                game_type: 'tetris',
                final_scores: { [testUserId]: 15000, '987654321': 12000 },
                lines_cleared: { [testUserId]: 45, '987654321': 38 }
            },
            durationSeconds: 300
        };

        const matchId = await ArenaManager.recordMatch(matchData);
        console.log(`✅ Match recorded with ID: ${matchId}`);

        // Test 6: Leaderboard update
        console.log('\n6. Testing leaderboard update...');
        const leaderboardData = {
            leaderboardType: 'weekly_competitions',
            gameType: 'tetris',
            periodStart: new Date().toISOString().split('T')[0],
            periodEnd: new Date(Date.now() + 604800000).toISOString().split('T')[0],
            score: 15000,
            matchesPlayed: 1,
            matchesWon: 1
        };

        const leaderboardResult = await ArenaManager.updateLeaderboard(testUserId, leaderboardData);
        console.log(`✅ Leaderboard updated:`);
        console.log(`   Rank: ${leaderboardResult.rank}`);
        console.log(`   Win rate: ${leaderboardResult.winRate.toFixed(1)}%`);

        // Test 7: Get user stats
        console.log('\n7. Testing user statistics...');
        const userStats = await ArenaManager.getUserStats(testUserId);
        console.log(`✅ User statistics retrieved:`);
        console.log(`   Practice stats: ${userStats.practice.length} games`);
        console.log(`   Competition stats: ${userStats.competition.total_matches} matches, ${userStats.competition.wins} wins`);
        console.log(`   Achievements: ${userStats.achievements.length} earned`);

        // Test 8: Get active competitions
        console.log('\n8. Testing active competitions retrieval...');
        const activeCompetitions = await ArenaManager.getActiveCompetitions(5);
        console.log(`✅ Found ${activeCompetitions.length} active competitions`);

        // Test 9: Get upcoming events
        console.log('\n9. Testing upcoming events retrieval...');
        const upcomingEvents = await ArenaManager.getUpcomingEvents(5);
        console.log(`✅ Found ${upcomingEvents.length} upcoming events`);

        // Test 10: Get leaderboard data
        console.log('\n10. Testing leaderboard data retrieval...');
        const leaderboard = await ArenaManager.getLeaderboard('weekly_competitions', 'tetris', null, 5);
        console.log(`✅ Retrieved leaderboard with ${leaderboard.length} entries`);

        // Test 11: Achievement checking
        console.log('\n11. Testing achievement checking...');
        const newAchievements = await ArenaManager.checkArenaAchievements(testUserId);
        console.log(`✅ Found ${newAchievements.length} new achievements to award`);

        // Test 12: Database queries for command functionality
        console.log('\n12. Testing database queries for commands...');
        
        // Test practice log query
        const practiceLogs = await Database.query(
            'SELECT * FROM arena_practice_log WHERE user_id = $1 ORDER BY practice_date DESC',
            [testUserId]
        );
        console.log(`✅ Found ${practiceLogs.rows.length} practice log entries`);

        // Test competition query
        const competitions = await Database.query(
            'SELECT * FROM arena_competitions WHERE created_by = $1 ORDER BY created_at DESC',
            [testUserId]
        );
        console.log(`✅ Found ${competitions.rows.length} competitions created by user`);

        // Test match query
        const matches = await Database.query(
            'SELECT * FROM arena_matches WHERE winner_id = $1 ORDER BY completed_at DESC',
            [testUserId]
        );
        console.log(`✅ Found ${matches.rows.length} matches won by user`);

        // Test leaderboard query
        const leaderboards = await Database.query(
            'SELECT * FROM arena_leaderboards WHERE user_id = $1 ORDER BY score DESC',
            [testUserId]
        );
        console.log(`✅ Found ${leaderboards.rows.length} leaderboard entries for user`);

        console.log('\n🎉 Arena Commands system test completed successfully!\n');

    } catch (error) {
        console.error('❌ Arena Commands test failed:', error);
        process.exit(1);
    }
}

// If run directly, execute the test
if (require.main === module) {
    testArenaCommands().catch(console.error);
}

module.exports = { testArenaCommands };

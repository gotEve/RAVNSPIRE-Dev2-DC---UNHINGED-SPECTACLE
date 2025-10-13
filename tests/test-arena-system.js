const Database = require('../database/db');

async function testArenaSystem() {
    console.log('⚔️ Testing Arena/Crucible System...\n');

    try {
        // Test 1: Get arena achievements
        console.log('1. Testing arena achievements...');
        const achievements = await Database.query('SELECT * FROM arena_achievements ORDER BY achievement_type, name');
        console.log(`✅ Found ${achievements.rows.length} arena achievements:`);
        achievements.rows.forEach(achievement => {
            console.log(`   • ${achievement.name} (${achievement.achievement_type}) - ${achievement.rarity}`);
        });

        // Test 2: Create a test competition
        console.log('\n2. Testing competition creation...');
        const competitionResult = await Database.query(`
            INSERT INTO arena_competitions (
                competition_type, name, description, game_type, max_participants, 
                entry_fee, start_time, end_time, rewards, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'individual_pvp',
            'Test Tournament',
            'A test tournament for system verification',
            'tetris',
            16,
            100,
            new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
            JSON.stringify({ xp: 1000, currency: 500 }),
            '123456789'
        ]);
        const competitionId = competitionResult.lastID;
        console.log(`✅ Created test competition with ID: ${competitionId}`);

        // Test 3: Add participants to competition
        console.log('\n3. Testing participant management...');
        const participants = {
            users: ['123456789', '987654321', '555666777'],
            guilds: []
        };
        
        await Database.query(
            'UPDATE arena_competitions SET participants = ? WHERE id = ?',
            [JSON.stringify(participants), competitionId]
        );
        console.log(`✅ Added ${participants.users.length} participants to competition`);

        // Test 4: Create practice log entry
        console.log('\n4. Testing practice log...');
        const practiceResult = await Database.query(`
            INSERT INTO arena_practice_log (
                user_id, game_type, xp_earned, sessions_completed, 
                total_practice_time, best_score, average_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            '123456789',
            'tetris',
            125,
            5,
            1800, // 30 minutes
            15000,
            12000
        ]);
        console.log(`✅ Created practice log entry with ID: ${practiceResult.lastID}`);

        // Test 5: Create match result
        console.log('\n5. Testing match results...');
        const matchResult = await Database.query(`
            INSERT INTO arena_matches (
                competition_id, match_type, participants, winner_id, 
                match_data, duration_seconds
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            competitionId,
            '1v1',
            JSON.stringify([
                { user_id: '123456789', score: 15000 },
                { user_id: '987654321', score: 12000 }
            ]),
            '123456789',
            JSON.stringify({
                game_type: 'tetris',
                final_scores: { '123456789': 15000, '987654321': 12000 },
                lines_cleared: { '123456789': 45, '987654321': 38 }
            }),
            300 // 5 minutes
        ]);
        console.log(`✅ Created match result with ID: ${matchResult.lastID}`);

        // Test 6: Update competition with results
        console.log('\n6. Testing competition completion...');
        const winners = ['123456789'];
        const results = {
            total_matches: 1,
            participants: participants.users.length,
            winner: '123456789',
            final_scores: { '123456789': 15000, '987654321': 12000 }
        };

        await Database.query(
            'UPDATE arena_competitions SET status = ?, winners = ?, results = ? WHERE id = ?',
            ['completed', JSON.stringify(winners), JSON.stringify(results), competitionId]
        );
        console.log('✅ Updated competition with results');

        // Test 7: Create leaderboard entry
        console.log('\n7. Testing leaderboard...');
        const leaderboardResult = await Database.query(`
            INSERT INTO arena_leaderboards (
                leaderboard_type, game_type, period_start, period_end,
                user_id, score, rank, matches_played, matches_won, win_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'weekly_competitions',
            'tetris',
            new Date().toISOString().split('T')[0], // Today
            new Date(Date.now() + 604800000).toISOString().split('T')[0], // Next week
            '123456789',
            15000,
            1,
            1,
            1,
            100.00
        ]);
        console.log(`✅ Created leaderboard entry with ID: ${leaderboardResult.lastID}`);

        // Test 8: Create arena statistics
        console.log('\n8. Testing arena statistics...');
        const statsResult = await Database.query(`
            INSERT INTO arena_statistics (
                user_id, game_type, stat_type, stat_value
            ) VALUES (?, ?, ?, ?)
        `, [
            '123456789',
            'tetris',
            'total_matches',
            1
        ]);
        console.log(`✅ Created arena statistics with ID: ${statsResult.lastID}`);

        // Test 9: Create arena event
        console.log('\n9. Testing arena events...');
        const eventResult = await Database.query(`
            INSERT INTO arena_events (
                event_type, name, description, start_time, end_time,
                game_type, max_participants, rewards
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'weekly_tournament',
            'Weekly Tetris Championship',
            'Weekly tournament for Tetris players',
            new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            new Date(Date.now() + 86400000 + 7200000).toISOString(), // Tomorrow + 2 hours
            'tetris',
            32,
            JSON.stringify({ xp: 2000, currency: 1000, title: 'Weekly Champion' })
        ]);
        console.log(`✅ Created arena event with ID: ${eventResult.lastID}`);

        // Test 10: Query and display results
        console.log('\n10. Testing data retrieval...');
        
        // Get active competitions
        const activeCompetitions = await Database.query(
            'SELECT * FROM arena_competitions WHERE status = ?',
            ['completed']
        );
        console.log(`✅ Found ${activeCompetitions.rows.length} completed competitions`);

        // Get practice logs for user
        const practiceLogs = await Database.query(
            'SELECT * FROM arena_practice_log WHERE user_id = ?',
            ['123456789']
        );
        console.log(`✅ Found ${practiceLogs.rows.length} practice log entries for user`);

        // Get leaderboard entries
        const leaderboardEntries = await Database.query(
            'SELECT * FROM arena_leaderboards WHERE user_id = ?',
            ['123456789']
        );
        console.log(`✅ Found ${leaderboardEntries.rows.length} leaderboard entries for user`);

        // Get user statistics
        const userStats = await Database.query(
            'SELECT * FROM arena_statistics WHERE user_id = ?',
            ['123456789']
        );
        console.log(`✅ Found ${userStats.rows.length} statistics entries for user`);

        // Get upcoming events
        const upcomingEvents = await Database.query(
            'SELECT * FROM arena_events WHERE start_time > ? AND active = ?',
            [new Date().toISOString(), true]
        );
        console.log(`✅ Found ${upcomingEvents.rows.length} upcoming events`);

        console.log('\n🎉 Arena/Crucible system test completed successfully!\n');

    } catch (error) {
        console.error('❌ Arena/Crucible test failed:', error);
        process.exit(1);
    }
}

// If run directly, execute the test
if (require.main === module) {
    testArenaSystem().catch(console.error);
}

module.exports = { testArenaSystem };

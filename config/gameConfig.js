// Game configuration and definitions
const gameConfig = {
    // Available games
    games: {
        tetris: {
            name: 'Tetris',
            description: 'A classic falling block puzzle game',
            category: 'puzzle',
            minPlayers: 1,
            maxPlayers: 1,
            duration: 600, // 10 minutes
            boardWidth: 10,
            boardHeight: 20,
            initialSpeed: 1000,
            speedIncreasePerLevel: 100,
            rewards: {
                xp: 75,
                currency: 40,
                bonus: {
                    highScore: { xp: 100, currency: 50 },
                    levelBonus: { xp: 25, currency: 15 } // per level reached
                }
            }
        },
        
        tictactoe: {
            name: 'Tic Tac Toe',
            description: 'The classic paper-and-pencil game for two players',
            category: 'strategy',
            minPlayers: 1,
            maxPlayers: 2,
            duration: 300, // 5 minutes
            boardSize: 3,
            winCondition: 3,
            aiDifficulty: 'easy',
            rewards: {
                xp: 50,
                currency: 25,
                bonus: {
                    win: { xp: 75, currency: 35 },
                    draw: { xp: 25, currency: 15 }
                }
            }
        }
    },

    // Game session configuration
    session: {
        timeout: 30 * 60 * 1000, // 30 minutes
        cleanupInterval: 5 * 60 * 1000, // 5 minutes
        maxSessions: 100,
    },

    // Question database structure
    questions: {
        trivia: {
            // Questions will be loaded from database or external API
            sources: ['database', 'opentdb'], // Open Trivia Database
            fallback: true,
        }
    },

    // Leaderboard configuration
    leaderboards: {
        global: {
            limit: 50,
            updateInterval: 60 * 1000, // 1 minute
        },
        game: {
            limit: 20,
            updateInterval: 5 * 60 * 1000, // 5 minutes
        },
        guild: {
            limit: 10,
            updateInterval: 10 * 60 * 1000, // 10 minutes
        }
    },

    // Game statistics tracking
    stats: {
        track: [
            'games_played',
            'games_won',
            'total_score',
            'average_score',
            'best_score',
            'win_streak',
            'longest_streak',
            'total_time_played',
            'favorite_category',
            'achievements_unlocked'
        ]
    },

    // Game events
    events: {
        onGameStart: ['track_session', 'update_stats'],
        onGameEnd: ['calculate_rewards', 'update_leaderboard', 'check_achievements'],
        onQuestionAnswer: ['update_progress', 'check_streak'],
        onGameAbandon: ['cleanup_session', 'penalty_check']
    }
};

module.exports = gameConfig;

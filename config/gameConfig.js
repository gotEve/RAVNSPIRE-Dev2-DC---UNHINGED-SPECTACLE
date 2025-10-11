// Game configuration and definitions
const gameConfig = {
    // Available games
    games: {
        trivia: {
            name: 'Trivia Challenge',
            description: 'Test your knowledge with questions from various categories',
            category: 'knowledge',
            minPlayers: 1,
            maxPlayers: 1,
            duration: 300, // 5 minutes
            questionsPerGame: 10,
            categories: [
                'general',
                'science',
                'history',
                'geography',
                'entertainment',
                'sports',
                'technology',
                'literature'
            ],
            difficulty: ['easy', 'medium', 'hard'],
            rewards: {
                xp: 50,
                currency: 25,
                bonus: {
                    perfect: { xp: 100, currency: 50 },
                    streak: { xp: 25, currency: 10 } // per 3 correct in a row
                }
            }
        },
        
        adventure: {
            name: 'Text Adventure',
            description: 'Embark on an interactive story adventure',
            category: 'story',
            minPlayers: 1,
            maxPlayers: 1,
            duration: 600, // 10 minutes
            chapters: 5,
            choicesPerChapter: 3,
            rewards: {
                xp: 75,
                currency: 40,
                bonus: {
                    completion: { xp: 150, currency: 75 },
                    exploration: { xp: 25, currency: 15 } // per hidden item found
                }
            }
        },
        
        puzzle: {
            name: 'Logic Puzzles',
            description: 'Solve challenging logic and math puzzles',
            category: 'logic',
            minPlayers: 1,
            maxPlayers: 1,
            duration: 900, // 15 minutes
            puzzlesPerGame: 5,
            types: [
                'sudoku',
                'crossword',
                'riddle',
                'math',
                'pattern',
                'wordplay'
            ],
            difficulty: ['easy', 'medium', 'hard', 'expert'],
            rewards: {
                xp: 60,
                currency: 30,
                bonus: {
                    speed: { xp: 50, currency: 25 }, // for quick completion
                    accuracy: { xp: 30, currency: 15 } // for perfect score
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

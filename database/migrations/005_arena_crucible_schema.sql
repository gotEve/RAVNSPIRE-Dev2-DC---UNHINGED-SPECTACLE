-- Arena/Crucible Schema Migration (PostgreSQL)
-- This migration creates the database structure for The Crucible arena system

-- Arena competitions
CREATE TABLE IF NOT EXISTS arena_competitions (
    id SERIAL PRIMARY KEY,
    competition_type VARCHAR(50) NOT NULL, -- individual_pvp, guild_pvp, practice, boss_raid, tournament
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Competition settings
    game_type VARCHAR(50), -- Which game is being played (tetris, tictactoe, etc.)
    participants JSONB DEFAULT '{}', -- {users: [], guilds: []}
    max_participants INTEGER DEFAULT 100,
    entry_fee INTEGER DEFAULT 0,
    
    -- Status and timing
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, active, completed, cancelled
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Rewards and results
    rewards JSONB DEFAULT '{}', -- {xp: 0, currency: 0, items: []}
    winners JSONB DEFAULT '[]', -- Array of winner IDs
    results JSONB DEFAULT '{}', -- Detailed match results
    
    -- Boss raid specific
    boss_health INTEGER DEFAULT 0,
    boss_current_health INTEGER DEFAULT 0,
    boss_name VARCHAR(100),
    server_wide BOOLEAN DEFAULT FALSE,
    
    -- Tournament specific
    tournament_round INTEGER DEFAULT 1,
    max_rounds INTEGER DEFAULT 1,
    elimination_style VARCHAR(20) DEFAULT 'single', -- single, double, round_robin
    
    -- Metadata
    created_by BIGINT REFERENCES users(discord_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Arena practice sessions (daily XP gains)
CREATE TABLE IF NOT EXISTS arena_practice_log (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    practice_date DATE DEFAULT CURRENT_DATE,
    game_type VARCHAR(50) NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,
    total_practice_time INTEGER DEFAULT 0, -- in seconds
    best_score INTEGER DEFAULT 0,
    average_score DECIMAL(10,2) DEFAULT 0,
    
    UNIQUE(user_id, practice_date, game_type)
);

-- Arena match results
CREATE TABLE IF NOT EXISTS arena_matches (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES arena_competitions(id),
    match_type VARCHAR(20) NOT NULL, -- 1v1, 2v2, guild_battle, boss_raid, practice
    participants JSONB NOT NULL, -- Array of participant objects
    winner_id BIGINT,
    winner_guild_id INTEGER REFERENCES guilds(id),
    match_data JSONB DEFAULT '{}', -- Scores, stats, game state, etc.
    duration_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Arena leaderboards (various categories)
CREATE TABLE IF NOT EXISTS arena_leaderboards (
    id SERIAL PRIMARY KEY,
    leaderboard_type VARCHAR(50) NOT NULL, -- daily_practice, weekly_competitions, monthly_tournaments, all_time
    game_type VARCHAR(50),
    period_start DATE,
    period_end DATE,
    user_id BIGINT REFERENCES users(discord_id),
    guild_id INTEGER REFERENCES guilds(id),
    score INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    
    UNIQUE(leaderboard_type, game_type, period_start, user_id, guild_id)
);

-- Arena achievements and titles
CREATE TABLE IF NOT EXISTS arena_achievements (
    id SERIAL PRIMARY KEY,
    achievement_type VARCHAR(50) NOT NULL, -- practice_master, tournament_winner, boss_slayer, undefeated
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL, -- What's needed to earn this
    rewards JSONB DEFAULT '{}', -- XP, currency, titles, badges
    rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
    active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(achievement_type, name)
);

-- User arena achievements
CREATE TABLE IF NOT EXISTS user_arena_achievements (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    achievement_id INTEGER REFERENCES arena_achievements(id),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress JSONB DEFAULT '{}', -- Current progress toward achievement
    
    UNIQUE(user_id, achievement_id)
);

-- Arena event schedule
CREATE TABLE IF NOT EXISTS arena_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- daily_practice, weekly_tournament, monthly_boss_raid, special_event
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    game_type VARCHAR(50),
    max_participants INTEGER DEFAULT 1000,
    rewards JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50), -- daily, weekly, monthly
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Arena statistics
CREATE TABLE IF NOT EXISTS arena_statistics (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    guild_id INTEGER REFERENCES guilds(id),
    game_type VARCHAR(50),
    stat_type VARCHAR(50) NOT NULL, -- total_matches, total_wins, total_practice_sessions, etc.
    stat_value INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, guild_id, game_type, stat_type)
);

-- Insert default arena achievements
INSERT INTO arena_achievements (achievement_type, name, description, requirements, rewards, rarity) VALUES
('practice_master', 'Daily Grinder', 'Complete 7 consecutive days of practice', '{"consecutive_days": 7}', '{"xp": 500, "title": "Daily Grinder"}', 'common'),
('practice_master', 'Practice Legend', 'Complete 30 days of practice', '{"total_days": 30}', '{"xp": 2000, "title": "Practice Legend"}', 'uncommon'),
('tournament_winner', 'First Victory', 'Win your first tournament', '{"tournament_wins": 1}', '{"xp": 1000, "title": "Tournament Winner"}', 'common'),
('tournament_winner', 'Champion', 'Win 5 tournaments', '{"tournament_wins": 5}', '{"xp": 5000, "title": "Champion"}', 'rare'),
('boss_slayer', 'Boss Hunter', 'Participate in 5 boss raids', '{"boss_raids": 5}', '{"xp": 1500, "title": "Boss Hunter"}', 'uncommon'),
('boss_slayer', 'Dragon Slayer', 'Deal the killing blow to a boss', '{"killing_blows": 1}', '{"xp": 10000, "title": "Dragon Slayer"}', 'epic'),
('undefeated', 'Unstoppable', 'Win 10 matches in a row', '{"win_streak": 10}', '{"xp": 7500, "title": "Unstoppable"}', 'rare'),
('undefeated', 'Invincible', 'Win 50 matches in a row', '{"win_streak": 50}', '{"xp": 50000, "title": "Invincible"}', 'legendary')
ON CONFLICT (achievement_type, name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_arena_competitions_type ON arena_competitions(competition_type);
CREATE INDEX IF NOT EXISTS idx_arena_competitions_status ON arena_competitions(status);
CREATE INDEX IF NOT EXISTS idx_arena_competitions_start_time ON arena_competitions(start_time);
CREATE INDEX IF NOT EXISTS idx_arena_competitions_game_type ON arena_competitions(game_type);
CREATE INDEX IF NOT EXISTS idx_arena_practice_log_user_date ON arena_practice_log(user_id, practice_date);
CREATE INDEX IF NOT EXISTS idx_arena_practice_log_game_type ON arena_practice_log(game_type);
CREATE INDEX IF NOT EXISTS idx_arena_matches_competition ON arena_matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_arena_matches_winner ON arena_matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_arena_leaderboards_type ON arena_leaderboards(leaderboard_type);
CREATE INDEX IF NOT EXISTS idx_arena_leaderboards_period ON arena_leaderboards(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_arena_events_start_time ON arena_events(start_time);
CREATE INDEX IF NOT EXISTS idx_arena_events_type ON arena_events(event_type);
CREATE INDEX IF NOT EXISTS idx_arena_statistics_user ON arena_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_statistics_guild ON arena_statistics(guild_id);
CREATE INDEX IF NOT EXISTS idx_user_arena_achievements_user ON user_arena_achievements(user_id);

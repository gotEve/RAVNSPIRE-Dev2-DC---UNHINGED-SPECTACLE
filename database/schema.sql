-- RAVNSPIRE Multi-Game Bot Database Schema
-- PostgreSQL Database Schema

-- Users table - Core user data
CREATE TABLE IF NOT EXISTS users (
    discord_id BIGINT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    global_xp INTEGER DEFAULT 0,
    currency INTEGER DEFAULT 0,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extended user profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    discord_id BIGINT PRIMARY KEY REFERENCES users(discord_id),
    bio TEXT,
    avatar_url TEXT,
    equipped_title VARCHAR(100),
    equipped_badges JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games definitions
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User progress per game
CREATE TABLE IF NOT EXISTS game_progress (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    game_id INTEGER REFERENCES games(id),
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    stats JSONB DEFAULT '{}',
    achievements JSONB DEFAULT '[]',
    last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_id, game_id)
);

-- Guilds
CREATE TABLE IF NOT EXISTS guilds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    resources INTEGER DEFAULT 0,
    owner_id BIGINT REFERENCES users(discord_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild members
CREATE TABLE IF NOT EXISTS guild_members (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id),
    discord_id BIGINT REFERENCES users(discord_id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, discord_id)
);

-- Neighborhoods
CREATE TABLE IF NOT EXISTS neighborhoods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    defense_level INTEGER DEFAULT 1,
    resources INTEGER DEFAULT 0,
    max_plots INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Neighborhood plots
CREATE TABLE IF NOT EXISTS neighborhood_plots (
    id SERIAL PRIMARY KEY,
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    guild_id INTEGER REFERENCES guilds(id),
    plot_number INTEGER NOT NULL,
    purchase_price INTEGER DEFAULT 0,
    upgrade_level INTEGER DEFAULT 0,
    last_maintenance TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    for_sale BOOLEAN DEFAULT FALSE,
    sale_price INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(neighborhood_id, plot_number)
);

-- Neighborhood buildings
CREATE TABLE IF NOT EXISTS neighborhood_buildings (
    id SERIAL PRIMARY KEY,
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    building_type VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1,
    required_resources INTEGER DEFAULT 0,
    current_resources INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(neighborhood_id, building_type)
);

-- Neighborhood events
CREATE TABLE IF NOT EXISTS neighborhood_events (
    id SERIAL PRIMARY KEY,
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    goal INTEGER,
    progress INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Neighborhood votes
CREATE TABLE IF NOT EXISTS neighborhood_votes (
    id SERIAL PRIMARY KEY,
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    proposal VARCHAR(200) NOT NULL,
    guild_id INTEGER REFERENCES guilds(id),
    vote VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(neighborhood_id, proposal, guild_id)
);

-- Neighborhood contributions
CREATE TABLE IF NOT EXISTS neighborhood_contributions (
    id SERIAL PRIMARY KEY,
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    guild_id INTEGER REFERENCES guilds(id),
    building_type VARCHAR(50),
    amount INTEGER NOT NULL,
    contribution_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Neighborhood attacks
CREATE TABLE IF NOT EXISTS neighborhood_attacks (
    id SERIAL PRIMARY KEY,
    attacker_neighborhood_id INTEGER REFERENCES neighborhoods(id),
    defender_neighborhood_id INTEGER REFERENCES neighborhoods(id),
    attack_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    result VARCHAR(20)
);

-- Lore entries
CREATE TABLE IF NOT EXISTS lore_entries (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tags JSONB DEFAULT '[]',
    hidden BOOLEAN DEFAULT FALSE,
    unlock_requirements JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User lore discoveries
CREATE TABLE IF NOT EXISTS lore_discoveries (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    lore_id INTEGER REFERENCES lore_entries(id),
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_id, lore_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- global, game-specific, guild, lore, social
    requirements JSONB NOT NULL,
    rewards JSONB DEFAULT '{}',
    hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    achievement_id INTEGER REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress JSONB DEFAULT '{}',
    UNIQUE(discord_id, achievement_id)
);

-- Community events
CREATE TABLE IF NOT EXISTS community_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    requirements JSONB DEFAULT '{}',
    rewards JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community challenges
CREATE TABLE IF NOT EXISTS community_challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    requirements JSONB NOT NULL,
    rewards JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    challenge_id INTEGER REFERENCES community_challenges(id),
    progress JSONB DEFAULT '{}',
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_id, challenge_id)
);

-- Game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id BIGINT REFERENCES users(discord_id),
    game_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- in milliseconds
    state VARCHAR(20) DEFAULT 'playing',
    score INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    final_score INTEGER,
    final_level INTEGER,
    game_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User badges (for achievement system)
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    badge_name VARCHAR(100) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_id, badge_name)
);

-- User titles (for achievement system)
CREATE TABLE IF NOT EXISTS user_titles (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    title_name VARCHAR(100) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_id, title_name)
);

-- Security and anti-cheating tables
CREATE TABLE IF NOT EXISTS user_security (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    status VARCHAR(20) DEFAULT 'active', -- active, restricted, banned
    restrictions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS security_flags (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    flag_type VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_audit_log (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    action VARCHAR(100) NOT NULL,
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild wars and competitions
CREATE TABLE IF NOT EXISTS guild_wars (
    id SERIAL PRIMARY KEY,
    guild1_id INTEGER REFERENCES guilds(id),
    guild2_id INTEGER REFERENCES guilds(id),
    war_type VARCHAR(50) NOT NULL, -- skirmish, siege, tournament
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, cancelled
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    winner_id INTEGER REFERENCES guilds(id),
    rewards JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_competitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    competition_type VARCHAR(50) NOT NULL, -- tournament, challenge, event
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, active, completed
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    entry_fee INTEGER DEFAULT 0,
    rewards JSONB DEFAULT '{}',
    max_participants INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_competition_participants (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES guild_competitions(id),
    guild_id INTEGER REFERENCES guilds(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INTEGER DEFAULT 0,
    rank INTEGER,
    UNIQUE(competition_id, guild_id)
);

-- Neighborhood voting and defense
CREATE TABLE IF NOT EXISTS neighborhood_proposals (
    id SERIAL PRIMARY KEY,
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    proposer_guild_id INTEGER REFERENCES guilds(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    proposal_type VARCHAR(50) NOT NULL, -- building, policy, event, defense
    data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active', -- active, passed, failed, expired
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NOT NULL,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS neighborhood_defense_logs (
    id SERIAL PRIMARY KEY,
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    attack_type VARCHAR(50) NOT NULL,
    attacker_info JSONB DEFAULT '{}',
    defense_strength INTEGER DEFAULT 0,
    attack_strength INTEGER DEFAULT 0,
    result VARCHAR(20) NOT NULL, -- defended, breached, partial
    damage_taken INTEGER DEFAULT 0,
    resources_lost INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced security tables for anti-cheat
CREATE TABLE IF NOT EXISTS user_behavior_logs (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    action VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    device_fingerprint VARCHAR(255),
    ip_address INET,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cheat_detection_logs (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    game_type VARCHAR(50) NOT NULL,
    detection_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'low',
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_penalties (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    penalty_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    data JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_global_xp ON users(global_xp);
CREATE INDEX IF NOT EXISTS idx_game_progress_discord_id ON game_progress(discord_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_game_id ON game_progress(game_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild_id ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_discord_id ON guild_members(discord_id);
CREATE INDEX IF NOT EXISTS idx_neighborhood_plots_neighborhood_id ON neighborhood_plots(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_neighborhood_plots_guild_id ON neighborhood_plots(guild_id);
CREATE INDEX IF NOT EXISTS idx_lore_entries_category ON lore_entries(category);
CREATE INDEX IF NOT EXISTS idx_lore_entries_hidden ON lore_entries(hidden);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_discord_id ON user_achievements(discord_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_name ON game_sessions(game_name);
CREATE INDEX IF NOT EXISTS idx_game_sessions_state ON game_sessions(state);
CREATE INDEX IF NOT EXISTS idx_user_badges_discord_id ON user_badges(discord_id);
CREATE INDEX IF NOT EXISTS idx_user_titles_discord_id ON user_titles(discord_id);

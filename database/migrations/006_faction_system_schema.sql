-- Faction System Schema Migration (PostgreSQL)
-- This migration creates the database structure for the faction system with character lineage tracking

-- Player faction tracking
CREATE TABLE IF NOT EXISTS player_factions (
    discord_id BIGINT PRIMARY KEY REFERENCES users(discord_id),
    current_faction VARCHAR(20) DEFAULT 'Human', -- Human, AI, Nature
    faction_purity DECIMAL(3,2) DEFAULT 1.00, -- 0.00 to 1.00 (pure to hybrid)
    faction_history JSONB DEFAULT '[]', -- Array of faction changes with timestamps
    switched_from_character BIGINT, -- Character ID they switched from (if applicable)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player characters (for generational gameplay)
CREATE TABLE IF NOT EXISTS player_characters (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id), -- The Discord user owning this character
    original_creator BIGINT REFERENCES users(discord_id), -- The original Discord user who created the lineage
    character_name VARCHAR(100),
    birth_faction VARCHAR(20), -- Faction at birth
    current_faction VARCHAR(20), -- Current faction (can change through events)
    birth_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    age_years INTEGER DEFAULT 0,
    life_stage VARCHAR(20) DEFAULT 'adult', -- baby, child, teen, adult
    parent_1 BIGINT REFERENCES player_characters(id),
    parent_2 BIGINT REFERENCES player_characters(id),
    parent_3 BIGINT REFERENCES player_characters(id), -- For polyamory
    genetic_traits JSONB DEFAULT '{}', -- Inherited traits from parents
    is_active BOOLEAN DEFAULT TRUE, -- True if this is the character the user is currently playing
    is_alive BOOLEAN DEFAULT TRUE,
    death_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Faction-specific resources and costs
CREATE TABLE IF NOT EXISTS faction_resources (
    discord_id BIGINT PRIMARY KEY REFERENCES users(discord_id),
    -- Human resources
    food INTEGER DEFAULT 0,
    water INTEGER DEFAULT 0,
    -- AI/Machine resources
    energy INTEGER DEFAULT 0,
    data_fragments INTEGER DEFAULT 0,
    electricity INTEGER DEFAULT 0,
    -- Nature resources
    biomass INTEGER DEFAULT 0,
    organic_matter INTEGER DEFAULT 0,
    -- Universal resources
    currency INTEGER DEFAULT 0,
    building_materials INTEGER DEFAULT 0,
    rare_artifacts INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily resource consumption tracking
CREATE TABLE IF NOT EXISTS resource_consumption_log (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    character_id BIGINT REFERENCES player_characters(id),
    consumption_date DATE DEFAULT CURRENT_DATE,
    faction VARCHAR(20),
    resources_consumed JSONB, -- {food: 10, water: 5, etc.}
    auto_deducted BOOLEAN DEFAULT TRUE,
    UNIQUE(discord_id, consumption_date)
);

-- Faction switching events (for tracking and anti-cheat)
CREATE TABLE IF NOT EXISTS faction_switches (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    from_faction VARCHAR(20),
    to_faction VARCHAR(20),
    switch_reason VARCHAR(50), -- 'character_switch', 'event', 'admin', 'marriage'
    character_id BIGINT REFERENCES player_characters(id),
    switched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}' -- Additional context about the switch
);

-- Faction achievements and titles
CREATE TABLE IF NOT EXISTS faction_achievements (
    id SERIAL PRIMARY KEY,
    achievement_type VARCHAR(50) NOT NULL, -- faction_purist, hybrid_master, faction_switcher, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL, -- What's needed to earn this
    rewards JSONB DEFAULT '{}', -- XP, currency, titles, badges
    faction_specific VARCHAR(20), -- NULL for universal, or specific faction
    rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
    active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(achievement_type, name)
);

-- User faction achievements
CREATE TABLE IF NOT EXISTS user_faction_achievements (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    achievement_id INTEGER REFERENCES faction_achievements(id),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress JSONB DEFAULT '{}', -- Current progress toward achievement
    
    UNIQUE(discord_id, achievement_id)
);

-- Faction events and special occurrences
CREATE TABLE IF NOT EXISTS faction_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- faction_war, hybrid_birth, faction_celebration, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    affected_factions JSONB DEFAULT '[]', -- Array of factions involved
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    event_data JSONB DEFAULT '{}', -- Event-specific data
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default faction achievements
INSERT INTO faction_achievements (achievement_type, name, description, requirements, rewards, faction_specific, rarity) VALUES
('faction_purist', 'Human Purist', 'Maintain 100% Human purity for 30 days', '{"faction": "Human", "purity": 1.0, "duration_days": 30}', '{"xp": 2000, "title": "Human Purist", "badge": "human_pure"}', 'Human', 'uncommon'),
('faction_purist', 'AI Ascended', 'Maintain 100% AI purity for 30 days', '{"faction": "AI", "purity": 1.0, "duration_days": 30}', '{"xp": 2000, "title": "AI Ascended", "badge": "ai_ascended"}', 'AI', 'uncommon'),
('faction_purist', 'Nature\'s Chosen', 'Maintain 100% Nature purity for 30 days', '{"faction": "Nature", "purity": 1.0, "duration_days": 30}', '{"xp": 2000, "title": "Nature\'s Chosen", "badge": "nature_harmony"}', 'Nature', 'uncommon'),
('hybrid_master', 'Hybrid Master', 'Experience all three factions through character lineage', '{"factions_experienced": ["Human", "AI", "Nature"]}', '{"xp": 5000, "title": "Hybrid Master", "badge": "hybrid"}', NULL, 'rare'),
('faction_switcher', 'Faction Explorer', 'Switch factions 5 times', '{"faction_switches": 5}', '{"xp": 1500, "title": "Faction Explorer", "badge": "explorer"}', NULL, 'common'),
('faction_switcher', 'Faction Nomad', 'Switch factions 20 times', '{"faction_switches": 20}', '{"xp": 5000, "title": "Faction Nomad", "badge": "nomad"}', NULL, 'rare'),
('character_lineage', 'Dynasty Builder', 'Create a lineage of 5 generations', '{"generations": 5}', '{"xp": 10000, "title": "Dynasty Builder", "badge": "dynasty"}', NULL, 'epic'),
('character_lineage', 'Ancestor', 'Be the original creator of a 3-generation lineage', '{"lineage_depth": 3, "is_original": true}', '{"xp": 7500, "title": "Ancestor", "badge": "ancestor"}', NULL, 'rare'),
('faction_balance', 'Harmony Seeker', 'Maintain balanced faction purity (0.3-0.7) for 60 days', '{"purity_range": [0.3, 0.7], "duration_days": 60}', '{"xp": 3000, "title": "Harmony Seeker", "badge": "harmony"}', NULL, 'uncommon')
ON CONFLICT (achievement_type, name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_factions_current ON player_factions(current_faction);
CREATE INDEX IF NOT EXISTS idx_player_factions_purity ON player_factions(faction_purity);
CREATE INDEX IF NOT EXISTS idx_player_characters_discord ON player_characters(discord_id);
CREATE INDEX IF NOT EXISTS idx_player_characters_creator ON player_characters(original_creator);
CREATE INDEX IF NOT EXISTS idx_player_characters_active ON player_characters(is_active);
CREATE INDEX IF NOT EXISTS idx_player_characters_faction ON player_characters(current_faction);
CREATE INDEX IF NOT EXISTS idx_player_characters_parents ON player_characters(parent_1, parent_2, parent_3);
CREATE INDEX IF NOT EXISTS idx_faction_resources_discord ON faction_resources(discord_id);
CREATE INDEX IF NOT EXISTS idx_resource_consumption_date ON resource_consumption_log(consumption_date);
CREATE INDEX IF NOT EXISTS idx_resource_consumption_discord ON resource_consumption_log(discord_id);
CREATE INDEX IF NOT EXISTS idx_faction_switches_discord ON faction_switches(discord_id);
CREATE INDEX IF NOT EXISTS idx_faction_switches_date ON faction_switches(switched_at);
CREATE INDEX IF NOT EXISTS idx_faction_achievements_type ON faction_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_faction_achievements_faction ON faction_achievements(faction_specific);
CREATE INDEX IF NOT EXISTS idx_user_faction_achievements_discord ON user_faction_achievements(discord_id);
CREATE INDEX IF NOT EXISTS idx_faction_events_type ON faction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_faction_events_time ON faction_events(start_time, end_time);

-- Migration 002: Social Simulation System Tables
-- Creates tables for factions, families, housing, and arena systems

-- Player faction tracking
CREATE TABLE IF NOT EXISTS player_factions (
    discord_id BIGINT PRIMARY KEY REFERENCES users(discord_id),
    current_faction VARCHAR(20) DEFAULT 'Human', -- Human, AI, Nature
    faction_purity DECIMAL(3,2) DEFAULT 1.00, -- 1.00 = pure, <1.00 = hybrid
    faction_history JSONB DEFAULT '[]', -- Track faction changes
    switched_from_character BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Character lineage (for generational gameplay)
CREATE TABLE IF NOT EXISTS player_characters (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id), -- Current controller
    original_creator BIGINT REFERENCES users(discord_id), -- Who created this character
    character_name VARCHAR(100),
    birth_faction VARCHAR(20), -- Faction at birth
    current_faction VARCHAR(20), -- Can shift via children
    birth_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    age_years INTEGER DEFAULT 0, -- Increments over time
    life_stage VARCHAR(20) DEFAULT 'adult', -- baby, child, teen, adult, elder
    parent_1 BIGINT REFERENCES player_characters(id),
    parent_2 BIGINT REFERENCES player_characters(id),
    parent_3 BIGINT REFERENCES player_characters(id), -- For polyamory
    genetic_traits JSONB DEFAULT '{}', -- Inherited traits
    is_active BOOLEAN DEFAULT TRUE, -- Currently played character
    is_alive BOOLEAN DEFAULT TRUE,
    death_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marriages/partnerships
CREATE TABLE IF NOT EXISTS marriages (
    id SERIAL PRIMARY KEY,
    marriage_type VARCHAR(20) DEFAULT 'dyad', -- dyad, triad, quad (polyamory)
    status VARCHAR(20) DEFAULT 'active', -- active, divorced, widowed
    married_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    divorced_at TIMESTAMP,
    divorce_cost INTEGER, -- Resources paid for divorce
    UNIQUE(id)
);

-- Marriage participants (supports polyamory)
CREATE TABLE IF NOT EXISTS marriage_participants (
    id SERIAL PRIMARY KEY,
    marriage_id INTEGER REFERENCES marriages(id),
    character_id BIGINT REFERENCES player_characters(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    UNIQUE(marriage_id, character_id)
);

-- Affection Points system
CREATE TABLE IF NOT EXISTS relationship_affection (
    id SERIAL PRIMARY KEY,
    marriage_id INTEGER REFERENCES marriages(id),
    character_1 BIGINT REFERENCES player_characters(id),
    character_2 BIGINT REFERENCES player_characters(id),
    affection_points INTEGER DEFAULT 0,
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_interactions INTEGER DEFAULT 0,
    UNIQUE(marriage_id, character_1, character_2)
);

-- Marriage cooldowns
CREATE TABLE IF NOT EXISTS marriage_cooldowns (
    discord_id BIGINT PRIMARY KEY REFERENCES users(discord_id),
    last_marriage_date TIMESTAMP,
    can_remarry_at TIMESTAMP
);

-- Children (abstract until switched to)
CREATE TABLE IF NOT EXISTS children (
    id SERIAL PRIMARY KEY,
    character_id BIGINT UNIQUE REFERENCES player_characters(id),
    conception_method VARCHAR(50), -- natural, surrogate, algorithm, symbiosis
    conception_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    birth_date TIMESTAMP,
    faction_at_birth VARCHAR(20),
    hybrid_composition JSONB DEFAULT '{}', -- {Human: 0.5, AI: 0.5}
    gestation_complete BOOLEAN DEFAULT FALSE,
    
    -- Development tracking
    development_score INTEGER DEFAULT 0, -- Higher = better adult stats
    daily_care_streak INTEGER DEFAULT 0,
    neglect_count INTEGER DEFAULT 0,
    risk_of_death INTEGER DEFAULT 0, -- Increases with neglect
    
    -- Stats (develop over time)
    intelligence INTEGER DEFAULT 0,
    creativity INTEGER DEFAULT 0,
    resilience INTEGER DEFAULT 0,
    social_skill INTEGER DEFAULT 0,
    
    -- Resource tracking
    total_resources_invested INTEGER DEFAULT 0,
    
    switched_to BOOLEAN DEFAULT FALSE,
    switched_at TIMESTAMP
);

-- Daily care log
CREATE TABLE IF NOT EXISTS child_care_log (
    id SERIAL PRIMARY KEY,
    child_id BIGINT REFERENCES children(id),
    caregiver_id BIGINT REFERENCES users(discord_id),
    care_date DATE DEFAULT CURRENT_DATE,
    care_type VARCHAR(50), -- feed, educate, play, train_algorithm, nurture_growth
    quality INTEGER DEFAULT 1, -- 1-10 quality of care
    resources_spent INTEGER DEFAULT 0,
    UNIQUE(child_id, care_date, caregiver_id)
);

-- Surrogate center (for solo players or specific faction needs)
CREATE TABLE IF NOT EXISTS surrogate_requests (
    id SERIAL PRIMARY KEY,
    requester_id BIGINT REFERENCES users(discord_id),
    desired_faction VARCHAR(20),
    resources_paid INTEGER,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fulfilled BOOLEAN DEFAULT FALSE,
    child_id BIGINT REFERENCES children(id)
);

-- Residential plots (separate from Guild District)
CREATE TABLE IF NOT EXISTS residential_plots (
    id SERIAL PRIMARY KEY,
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    plot_number INTEGER NOT NULL,
    plot_size VARCHAR(20), -- small, medium, large, estate
    plot_tier INTEGER DEFAULT 1, -- Upgrade level (1-5)
    max_occupants INTEGER DEFAULT 2, -- Based on size/tier
    base_value INTEGER, -- Purchase price
    current_value INTEGER, -- Market value (changes)
    
    owner_character_id BIGINT REFERENCES player_characters(id),
    is_for_sale BOOLEAN DEFAULT FALSE,
    sale_price INTEGER,
    
    -- Maintenance
    monthly_maintenance_cost INTEGER,
    last_maintenance_paid TIMESTAMP,
    maintenance_overdue BOOLEAN DEFAULT FALSE,
    
    purchased_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(neighborhood_id, plot_number)
);

-- Co-habitation tracking
CREATE TABLE IF NOT EXISTS plot_occupants (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER REFERENCES residential_plots(id),
    character_id BIGINT REFERENCES player_characters(id),
    occupancy_type VARCHAR(20), -- owner, spouse, renter, roommate, child
    rent_amount INTEGER DEFAULT 0, -- 0 for owners/spouses
    moved_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    moved_out_at TIMESTAMP,
    UNIQUE(plot_id, character_id, moved_in_at)
);

-- Rent agreements
CREATE TABLE IF NOT EXISTS rent_agreements (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER REFERENCES residential_plots(id),
    renter_id BIGINT REFERENCES users(discord_id),
    landlord_id BIGINT REFERENCES users(discord_id),
    monthly_rent INTEGER,
    merchant_bonus_applied BOOLEAN DEFAULT FALSE,
    agreement_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    agreement_end TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Guild District Plots (Commercial)
CREATE TABLE IF NOT EXISTS guild_district_plots (
    id SERIAL PRIMARY KEY,
    plot_number INTEGER NOT NULL,
    plot_size VARCHAR(20), -- small, medium, large, commercial_estate
    plot_tier INTEGER DEFAULT 1, -- Upgrade level (1-5)
    guild_id INTEGER REFERENCES guilds(id),
    base_value INTEGER,
    current_value INTEGER,
    purchased_at TIMESTAMP,
    
    -- Building type on plot
    building_type VARCHAR(50), -- resource_mine, training_grounds, vault, command_center, workshop
    building_level INTEGER DEFAULT 1,
    
    -- Resource generation
    resource_output JSONB, -- {currency: 100, resources: {...}}
    last_collection TIMESTAMP,
    
    -- Maintenance
    monthly_maintenance INTEGER,
    last_maintenance TIMESTAMP,
    
    UNIQUE(plot_number)
);

-- Guild upgrades purchased
CREATE TABLE IF NOT EXISTS guild_upgrades (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id),
    upgrade_type VARCHAR(50), -- merchant_level, resource_boost, member_capacity
    upgrade_level INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    purchased_at TIMESTAMP
);

-- Guild resource generation log
CREATE TABLE IF NOT EXISTS guild_resource_generation (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id),
    plot_id INTEGER REFERENCES guild_district_plots(id),
    generation_date DATE DEFAULT CURRENT_DATE,
    resources_generated JSONB,
    collected_by BIGINT REFERENCES users(discord_id),
    collected_at TIMESTAMP
);

-- Arena competitions
CREATE TABLE IF NOT EXISTS arena_competitions (
    id SERIAL PRIMARY KEY,
    competition_type VARCHAR(50), -- individual_pvp, guild_pvp, practice, boss_raid
    name VARCHAR(100),
    description TEXT,
    
    -- Competition settings
    game_type VARCHAR(50), -- Which game is being played
    participants JSONB, -- {users: [], guilds: []}
    max_participants INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, active, completed
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    
    -- Rewards
    rewards JSONB,
    winners JSONB,
    
    -- Boss raid specific
    boss_health INTEGER,
    boss_current_health INTEGER,
    server_wide BOOLEAN DEFAULT FALSE
);

-- Arena leaderboard (daily practice XP)
CREATE TABLE IF NOT EXISTS arena_practice_log (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(discord_id),
    practice_date DATE DEFAULT CURRENT_DATE,
    xp_earned INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,
    UNIQUE(user_id, practice_date)
);

-- Arena match results
CREATE TABLE IF NOT EXISTS arena_matches (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES arena_competitions(id),
    match_type VARCHAR(20), -- 1v1, 2v2, guild_battle, boss_raid
    participants JSONB,
    winner_id BIGINT,
    match_data JSONB, -- Scores, stats, etc.
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player resources (faction-specific)
CREATE TABLE IF NOT EXISTS player_resources (
    discord_id BIGINT PRIMARY KEY REFERENCES users(discord_id),
    
    -- Universal
    currency INTEGER DEFAULT 0,
    
    -- Faction-specific living costs
    food INTEGER DEFAULT 0, -- Humans need
    energy INTEGER DEFAULT 0, -- AI need
    biomass INTEGER DEFAULT 0, -- Nature need
    electricity INTEGER DEFAULT 0, -- AI need
    water INTEGER DEFAULT 0, -- Humans/Nature need
    data_fragments INTEGER DEFAULT 0, -- AI need
    organic_matter INTEGER DEFAULT 0, -- Nature need
    
    -- Shared resources
    building_materials INTEGER DEFAULT 0,
    rare_artifacts INTEGER DEFAULT 0,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily resource consumption log
CREATE TABLE IF NOT EXISTS resource_consumption (
    id SERIAL PRIMARY KEY,
    character_id BIGINT REFERENCES player_characters(id),
    consumption_date DATE DEFAULT CURRENT_DATE,
    faction VARCHAR(20),
    resources_consumed JSONB,
    auto_deducted BOOLEAN DEFAULT TRUE,
    UNIQUE(character_id, consumption_date)
);

-- Game variety tracking
CREATE TABLE IF NOT EXISTS game_variety_log (
    discord_id BIGINT REFERENCES users(discord_id),
    game_type VARCHAR(50),
    times_played INTEGER DEFAULT 0,
    last_played TIMESTAMP,
    PRIMARY KEY (discord_id, game_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_factions_current_faction ON player_factions(current_faction);
CREATE INDEX IF NOT EXISTS idx_player_characters_discord_id ON player_characters(discord_id);
CREATE INDEX IF NOT EXISTS idx_player_characters_is_active ON player_characters(is_active);
CREATE INDEX IF NOT EXISTS idx_marriages_status ON marriages(status);
CREATE INDEX IF NOT EXISTS idx_marriage_participants_marriage_id ON marriage_participants(marriage_id);
CREATE INDEX IF NOT EXISTS idx_marriage_participants_character_id ON marriage_participants(character_id);
CREATE INDEX IF NOT EXISTS idx_relationship_affection_marriage_id ON relationship_affection(marriage_id);
CREATE INDEX IF NOT EXISTS idx_children_character_id ON children(character_id);
CREATE INDEX IF NOT EXISTS idx_children_switched_to ON children(switched_to);
CREATE INDEX IF NOT EXISTS idx_child_care_log_child_id ON child_care_log(child_id);
CREATE INDEX IF NOT EXISTS idx_child_care_log_care_date ON child_care_log(care_date);
CREATE INDEX IF NOT EXISTS idx_residential_plots_neighborhood_id ON residential_plots(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_residential_plots_owner_character_id ON residential_plots(owner_character_id);
CREATE INDEX IF NOT EXISTS idx_plot_occupants_plot_id ON plot_occupants(plot_id);
CREATE INDEX IF NOT EXISTS idx_plot_occupants_character_id ON plot_occupants(character_id);
CREATE INDEX IF NOT EXISTS idx_guild_district_plots_guild_id ON guild_district_plots(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_upgrades_guild_id ON guild_upgrades(guild_id);
CREATE INDEX IF NOT EXISTS idx_arena_competitions_status ON arena_competitions(status);
CREATE INDEX IF NOT EXISTS idx_arena_competitions_competition_type ON arena_competitions(competition_type);
CREATE INDEX IF NOT EXISTS idx_arena_practice_log_user_id ON arena_practice_log(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_practice_log_practice_date ON arena_practice_log(practice_date);
CREATE INDEX IF NOT EXISTS idx_arena_matches_competition_id ON arena_matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_resource_consumption_character_id ON resource_consumption(character_id);
CREATE INDEX IF NOT EXISTS idx_resource_consumption_consumption_date ON resource_consumption(consumption_date);
CREATE INDEX IF NOT EXISTS idx_game_variety_log_discord_id ON game_variety_log(discord_id);
CREATE INDEX IF NOT EXISTS idx_game_variety_log_game_type ON game_variety_log(game_type);

-- Add comments to document the tables
COMMENT ON TABLE player_factions IS 'Tracks player faction membership and purity levels';
COMMENT ON TABLE player_characters IS 'Character lineage for generational gameplay';
COMMENT ON TABLE marriages IS 'Marriage and partnership records';
COMMENT ON TABLE marriage_participants IS 'Links characters to marriages (supports polyamory)';
COMMENT ON TABLE relationship_affection IS 'Affection points between partners';
COMMENT ON TABLE children IS 'Abstract child entities until character switching';
COMMENT ON TABLE child_care_log IS 'Daily care actions for children';
COMMENT ON TABLE residential_plots IS 'Individual residential property in neighborhoods';
COMMENT ON TABLE plot_occupants IS 'Tracks who lives in residential plots';
COMMENT ON TABLE guild_district_plots IS 'Commercial plots owned by guilds';
COMMENT ON TABLE arena_competitions IS 'Competitions and events in The Crucible';
COMMENT ON TABLE arena_practice_log IS 'Daily practice session tracking';
COMMENT ON TABLE player_resources IS 'Faction-specific resource storage';
COMMENT ON TABLE resource_consumption IS 'Daily resource consumption tracking';
COMMENT ON TABLE game_variety_log IS 'Tracks game variety for bonus calculations';

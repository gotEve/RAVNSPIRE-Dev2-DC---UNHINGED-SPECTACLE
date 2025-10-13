-- Migration 001: Enhance existing tables with JSONB support
-- This migration adds JSONB columns to existing tables for flexible data storage

-- Enhance game_sessions table with flexible state storage
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS game_state JSONB;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS rewards_data JSONB;

-- Create indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_state ON game_sessions USING GIN (game_state);
CREATE INDEX IF NOT EXISTS idx_game_sessions_rewards_data ON game_sessions USING GIN (rewards_data);

-- Enhance lore_entries table to support codex structure
ALTER TABLE lore_entries ADD COLUMN IF NOT EXISTS entry_id VARCHAR(50);
ALTER TABLE lore_entries ADD COLUMN IF NOT EXISTS volume VARCHAR(50);
ALTER TABLE lore_entries ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE lore_entries ADD COLUMN IF NOT EXISTS discovered_by BIGINT[] DEFAULT '{}';
ALTER TABLE lore_entries ADD COLUMN IF NOT EXISTS discovery_count INTEGER DEFAULT 0;

-- Create indexes for new lore columns
CREATE INDEX IF NOT EXISTS idx_lore_entries_entry_id ON lore_entries(entry_id);
CREATE INDEX IF NOT EXISTS idx_lore_entries_volume ON lore_entries(volume);
CREATE INDEX IF NOT EXISTS idx_lore_entries_metadata ON lore_entries USING GIN (metadata);

-- Add unique constraint for entry_id
ALTER TABLE lore_entries ADD CONSTRAINT IF NOT EXISTS unique_entry_id UNIQUE (entry_id);

-- Create game balance configuration table
CREATE TABLE IF NOT EXISTS game_balance_config (
    id SERIAL PRIMARY KEY,
    game_type VARCHAR(50),
    scope VARCHAR(20) DEFAULT 'global', -- 'global' or 'local'
    config_data JSONB NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    updated_by BIGINT REFERENCES users(discord_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for game balance config
CREATE INDEX IF NOT EXISTS idx_game_balance_config_game_type ON game_balance_config(game_type);
CREATE INDEX IF NOT EXISTS idx_game_balance_config_scope ON game_balance_config(scope);
CREATE INDEX IF NOT EXISTS idx_game_balance_config_active ON game_balance_config(active);

-- Add faction support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_faction VARCHAR(20) DEFAULT 'Human';
ALTER TABLE users ADD COLUMN IF NOT EXISTS faction_purity DECIMAL(3,2) DEFAULT 1.00;

-- Create index for faction
CREATE INDEX IF NOT EXISTS idx_users_current_faction ON users(current_faction);

-- Enhance guilds table for Guild District
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS guild_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS faction_requirement VARCHAR(20);
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS headquarters_neighborhood INTEGER REFERENCES neighborhoods(id);
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS merchant_level INTEGER DEFAULT 1;

-- Create indexes for guild enhancements
CREATE INDEX IF NOT EXISTS idx_guilds_guild_type ON guilds(guild_type);
CREATE INDEX IF NOT EXISTS idx_guilds_faction_requirement ON guilds(faction_requirement);
CREATE INDEX IF NOT EXISTS idx_guilds_merchant_level ON guilds(merchant_level);

-- Add resource support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '{}';

-- Create index for user resources
CREATE INDEX IF NOT EXISTS idx_users_resources ON users USING GIN (resources);

-- Add global stats support
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_stats JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS variety_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_level VARCHAR(20) DEFAULT 'casual';

-- Create indexes for global stats
CREATE INDEX IF NOT EXISTS idx_users_global_stats ON users USING GIN (global_stats);
CREATE INDEX IF NOT EXISTS idx_users_variety_score ON users(variety_score);
CREATE INDEX IF NOT EXISTS idx_users_activity_level ON users(activity_level);

-- Add comment to document the changes
COMMENT ON TABLE game_balance_config IS 'Configuration for game reward balancing and special events';
COMMENT ON COLUMN lore_entries.entry_id IS 'Unique identifier from lore codex (e.g., ARC-001)';
COMMENT ON COLUMN lore_entries.volume IS 'Volume from lore codex (e.g., Volume I)';
COMMENT ON COLUMN lore_entries.metadata IS 'Additional metadata from codex (section, source, integrity, curator, released)';
COMMENT ON COLUMN users.current_faction IS 'Current faction: Human, AI, Nature';
COMMENT ON COLUMN users.faction_purity IS 'Faction purity level (1.00 = pure, <1.00 = hybrid)';
COMMENT ON COLUMN users.resources IS 'Faction-specific resources (food, energy, biomass, etc.)';
COMMENT ON COLUMN users.global_stats IS 'Global player statistics and activity tracking';
COMMENT ON COLUMN users.variety_score IS 'Measures diversity of player activities (0-100)';
COMMENT ON COLUMN users.activity_level IS 'Player activity level: casual, active, hardcore';

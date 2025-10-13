-- Guild District Schema Migration (PostgreSQL)
-- This migration creates the database structure for the Guild District system

-- Guild District Plots
CREATE TABLE IF NOT EXISTS guild_district_plots (
    id SERIAL PRIMARY KEY,
    plot_number INTEGER NOT NULL,
    plot_size VARCHAR(20) NOT NULL, -- small, medium, large, commercial_estate
    plot_tier INTEGER DEFAULT 1, -- Upgrade level (1-5)
    guild_id INTEGER REFERENCES guilds(id),
    base_value INTEGER NOT NULL,
    current_value INTEGER NOT NULL,
    purchased_at TIMESTAMP,
    
    -- Building type on plot
    building_type VARCHAR(50), -- resource_mine, training_grounds, vault, command_center, workshop
    building_level INTEGER DEFAULT 1,
    
    -- Resource generation
    resource_output JSONB DEFAULT '{}', -- {currency: 100, resources: {...}}
    last_collection TIMESTAMP,
    
    -- Maintenance
    monthly_maintenance INTEGER DEFAULT 0,
    last_maintenance TIMESTAMP,
    
    -- Plot status
    is_for_sale BOOLEAN DEFAULT FALSE,
    sale_price INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(plot_number)
);

-- Guild upgrades purchased
CREATE TABLE IF NOT EXISTS guild_upgrades (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id),
    upgrade_type VARCHAR(50) NOT NULL, -- merchant_level, resource_boost, member_capacity, plot_capacity
    upgrade_level INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cost INTEGER NOT NULL,
    
    UNIQUE(guild_id, upgrade_type)
);

-- Guild resource generation log
CREATE TABLE IF NOT EXISTS guild_resource_generation (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id),
    plot_id INTEGER REFERENCES guild_district_plots(id),
    generation_date DATE DEFAULT CURRENT_DATE,
    resources_generated JSONB NOT NULL,
    collected_by BIGINT REFERENCES users(discord_id),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(guild_id, plot_id, generation_date)
);

-- Guild District transactions (purchases, sales, upgrades)
CREATE TABLE IF NOT EXISTS guild_district_transactions (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id),
    transaction_type VARCHAR(50) NOT NULL, -- plot_purchase, plot_sale, upgrade_purchase, building_construction
    plot_id INTEGER REFERENCES guild_district_plots(id),
    amount INTEGER NOT NULL,
    currency_type VARCHAR(20) DEFAULT 'currency',
    description TEXT,
    processed_by BIGINT REFERENCES users(discord_id),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild District building types configuration
CREATE TABLE IF NOT EXISTS guild_building_types (
    id SERIAL PRIMARY KEY,
    building_type VARCHAR(50) UNIQUE NOT NULL,
    building_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_cost INTEGER NOT NULL,
    resource_output JSONB DEFAULT '{}',
    maintenance_cost INTEGER DEFAULT 0,
    max_level INTEGER DEFAULT 5,
    unlock_requirements JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default building types
INSERT INTO guild_building_types (building_type, building_name, description, base_cost, resource_output, maintenance_cost, max_level) VALUES
('resource_mine', 'Resource Mine', 'Generates basic resources for the guild', 1000, '{"currency": 50, "building_materials": 10}', 100, 5),
('training_grounds', 'Training Grounds', 'Provides XP bonuses for guild members', 1500, '{"xp_bonus": 0.1}', 150, 5),
('vault', 'Guild Vault', 'Stores and protects guild resources', 2000, '{"storage_capacity": 1000}', 200, 5),
('command_center', 'Command Center', 'Central hub for guild operations', 3000, '{"member_capacity": 5, "plot_capacity": 1}', 300, 5),
('workshop', 'Guild Workshop', 'Crafts special items and upgrades', 2500, '{"crafting_bonus": 0.2}', 250, 5)
ON CONFLICT (building_type) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guild_district_plots_guild_id ON guild_district_plots(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_district_plots_plot_number ON guild_district_plots(plot_number);
CREATE INDEX IF NOT EXISTS idx_guild_district_plots_building_type ON guild_district_plots(building_type);
CREATE INDEX IF NOT EXISTS idx_guild_upgrades_guild_id ON guild_upgrades(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_upgrades_type ON guild_upgrades(upgrade_type);
CREATE INDEX IF NOT EXISTS idx_guild_resource_generation_guild_id ON guild_resource_generation(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_resource_generation_date ON guild_resource_generation(generation_date);
CREATE INDEX IF NOT EXISTS idx_guild_district_transactions_guild_id ON guild_district_transactions(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_district_transactions_type ON guild_district_transactions(transaction_type);

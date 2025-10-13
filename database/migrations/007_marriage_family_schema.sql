-- Marriage and Family System Schema Migration (PostgreSQL)
-- This migration creates the database structure for the marriage and family system

-- Marriages (supports polyamory)
CREATE TABLE IF NOT EXISTS marriages (
    id SERIAL PRIMARY KEY,
    marriage_type VARCHAR(20) DEFAULT 'dyad', -- dyad, triad, quad
    status VARCHAR(20) DEFAULT 'active', -- active, divorced, annulled
    married_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    divorced_at TIMESTAMP,
    divorce_cost INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marriage participants (for polyamory support)
CREATE TABLE IF NOT EXISTS marriage_participants (
    id SERIAL PRIMARY KEY,
    marriage_id INTEGER REFERENCES marriages(id),
    character_id BIGINT REFERENCES player_characters(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    role VARCHAR(20) DEFAULT 'spouse', -- spouse, primary, secondary, tertiary
    UNIQUE(marriage_id, character_id)
);

-- Relationship affection points
CREATE TABLE IF NOT EXISTS relationship_affection (
    id SERIAL PRIMARY KEY,
    marriage_id INTEGER REFERENCES marriages(id),
    character_1 BIGINT REFERENCES player_characters(id),
    character_2 BIGINT REFERENCES player_characters(id),
    affection_points INTEGER DEFAULT 0,
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_interactions INTEGER DEFAULT 0,
    interaction_history JSONB DEFAULT '[]', -- Track interaction types and timestamps
    UNIQUE(marriage_id, character_1, character_2)
);

-- Children (abstract entities until switched to)
CREATE TABLE IF NOT EXISTS children (
    id SERIAL PRIMARY KEY,
    character_id BIGINT UNIQUE REFERENCES player_characters(id), -- Links to player_characters when switched
    conception_method VARCHAR(50), -- natural, surrogate, artificial
    conception_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    birth_date TIMESTAMP,
    faction_at_birth VARCHAR(20),
    hybrid_composition JSONB DEFAULT '{}', -- e.g., {human: 0.5, ai: 0.5}
    gestation_complete BOOLEAN DEFAULT FALSE,
    development_score INTEGER DEFAULT 0,
    daily_care_streak INTEGER DEFAULT 0,
    neglect_count INTEGER DEFAULT 0,
    risk_of_death INTEGER DEFAULT 0, -- 0-100, higher means more likely to die from neglect
    intelligence INTEGER DEFAULT 0,
    creativity INTEGER DEFAULT 0,
    resilience INTEGER DEFAULT 0,
    social_skill INTEGER DEFAULT 0,
    total_resources_invested INTEGER DEFAULT 0,
    switched_to BOOLEAN DEFAULT FALSE,
    switched_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marriage proposals
CREATE TABLE IF NOT EXISTS marriage_proposals (
    id SERIAL PRIMARY KEY,
    proposer_character_id BIGINT REFERENCES player_characters(id),
    target_character_id BIGINT REFERENCES player_characters(id),
    proposal_type VARCHAR(20) DEFAULT 'dyad', -- dyad, triad, quad
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, expired
    proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Family interactions and activities
CREATE TABLE IF NOT EXISTS family_interactions (
    id SERIAL PRIMARY KEY,
    marriage_id INTEGER REFERENCES marriages(id),
    interaction_type VARCHAR(50), -- date, gift, conversation, game, care, etc.
    participants JSONB NOT NULL, -- Array of character IDs involved
    interaction_data JSONB DEFAULT '{}', -- Specific data for the interaction
    affection_gained INTEGER DEFAULT 0,
    resources_spent INTEGER DEFAULT 0,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Child care activities
CREATE TABLE IF NOT EXISTS child_care_activities (
    id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(id),
    caregiver_character_id BIGINT REFERENCES player_characters(id),
    activity_type VARCHAR(50), -- feeding, playing, teaching, medical, etc.
    care_quality INTEGER DEFAULT 5, -- 1-10, affects development
    resources_spent INTEGER DEFAULT 0,
    development_impact INTEGER DEFAULT 0,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family achievements
CREATE TABLE IF NOT EXISTS family_achievements (
    id SERIAL PRIMARY KEY,
    achievement_type VARCHAR(50) NOT NULL, -- marriage_milestone, parenting, family_bonding, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL, -- What's needed to earn this
    rewards JSONB DEFAULT '{}', -- XP, currency, titles, badges
    rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
    active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(achievement_type, name)
);

-- User family achievements
CREATE TABLE IF NOT EXISTS user_family_achievements (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    achievement_id INTEGER REFERENCES family_achievements(id),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress JSONB DEFAULT '{}', -- Current progress toward achievement
    
    UNIQUE(discord_id, achievement_id)
);

-- Family statistics
CREATE TABLE IF NOT EXISTS family_statistics (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT REFERENCES users(discord_id),
    character_id BIGINT REFERENCES player_characters(id),
    stat_type VARCHAR(50) NOT NULL, -- marriages_count, children_raised, affection_earned, etc.
    stat_value INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(discord_id, character_id, stat_type)
);

-- Insert default family achievements
INSERT INTO family_achievements (achievement_type, name, description, requirements, rewards, rarity) VALUES
('marriage_milestone', 'First Love', 'Get married for the first time', '{"marriages": 1}', '{"xp": 500, "title": "Newlywed", "badge": "first_love"}', 'common'),
('marriage_milestone', 'Golden Anniversary', 'Stay married for 30 days', '{"marriage_duration_days": 30}', '{"xp": 2000, "title": "Devoted Partner", "badge": "golden_anniversary"}', 'uncommon'),
('marriage_milestone', 'Polyamory Pioneer', 'Be in a polyamorous relationship', '{"polyamory": true}', '{"xp": 1500, "title": "Polyamory Pioneer", "badge": "polyamory"}', 'uncommon'),
('parenting', 'New Parent', 'Have your first child', '{"children": 1}', '{"xp": 1000, "title": "New Parent", "badge": "new_parent"}', 'common'),
('parenting', 'Family Builder', 'Raise 3 children to adulthood', '{"children_raised": 3}', '{"xp": 5000, "title": "Family Builder", "badge": "family_builder"}', 'rare'),
('parenting', 'Dynasty Founder', 'Create a 5-generation lineage', '{"generations": 5}', '{"xp": 10000, "title": "Dynasty Founder", "badge": "dynasty"}', 'epic'),
('family_bonding', 'Affection Master', 'Reach 1000 affection points with a partner', '{"affection_points": 1000}', '{"xp": 2000, "title": "Affection Master", "badge": "affection_master"}', 'uncommon'),
('family_bonding', 'Perfect Parent', 'Maintain 30-day care streak for a child', '{"care_streak": 30}', '{"xp": 3000, "title": "Perfect Parent", "badge": "perfect_parent"}', 'rare'),
('family_bonding', 'Family Harmony', 'Have all family members with 500+ affection', '{"family_affection": 500}', '{"xp": 4000, "title": "Family Harmony", "badge": "harmony"}', 'rare'),
('family_bonding', 'Generational Wisdom', 'Switch to a child character', '{"character_switch": true}', '{"xp": 2500, "title": "Generational Wisdom", "badge": "wisdom"}', 'uncommon')
ON CONFLICT (achievement_type, name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marriages_status ON marriages(status);
CREATE INDEX IF NOT EXISTS idx_marriages_type ON marriages(marriage_type);
CREATE INDEX IF NOT EXISTS idx_marriage_participants_character ON marriage_participants(character_id);
CREATE INDEX IF NOT EXISTS idx_marriage_participants_marriage ON marriage_participants(marriage_id);
CREATE INDEX IF NOT EXISTS idx_relationship_affection_marriage ON relationship_affection(marriage_id);
CREATE INDEX IF NOT EXISTS idx_relationship_affection_characters ON relationship_affection(character_1, character_2);
CREATE INDEX IF NOT EXISTS idx_children_character ON children(character_id);
CREATE INDEX IF NOT EXISTS idx_children_switched ON children(switched_to);
CREATE INDEX IF NOT EXISTS idx_marriage_proposals_proposer ON marriage_proposals(proposer_character_id);
CREATE INDEX IF NOT EXISTS idx_marriage_proposals_target ON marriage_proposals(target_character_id);
CREATE INDEX IF NOT EXISTS idx_marriage_proposals_status ON marriage_proposals(status);
CREATE INDEX IF NOT EXISTS idx_family_interactions_marriage ON family_interactions(marriage_id);
CREATE INDEX IF NOT EXISTS idx_family_interactions_type ON family_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_child_care_activities_child ON child_care_activities(child_id);
CREATE INDEX IF NOT EXISTS idx_child_care_activities_caregiver ON child_care_activities(caregiver_character_id);
CREATE INDEX IF NOT EXISTS idx_family_achievements_type ON family_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_family_achievements_discord ON user_family_achievements(discord_id);
CREATE INDEX IF NOT EXISTS idx_family_statistics_discord ON family_statistics(discord_id);
CREATE INDEX IF NOT EXISTS idx_family_statistics_character ON family_statistics(character_id);

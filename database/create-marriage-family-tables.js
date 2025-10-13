const Database = require('./db');

async function createMarriageFamilyTables() {
    console.log('💕 Creating Marriage and Family System tables...\n');

    try {
        // Create marriages table
        console.log('Creating marriages table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS marriages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marriage_type VARCHAR(20) DEFAULT 'dyad',
                status VARCHAR(20) DEFAULT 'active',
                married_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                divorced_at TIMESTAMP,
                divorce_cost INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ marriages table created');

        // Create marriage_participants table
        console.log('Creating marriage_participants table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS marriage_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marriage_id INTEGER REFERENCES marriages(id),
                character_id BIGINT REFERENCES player_characters(id),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                left_at TIMESTAMP,
                role VARCHAR(20) DEFAULT 'spouse',
                UNIQUE(marriage_id, character_id)
            )
        `);
        console.log('✅ marriage_participants table created');

        // Create relationship_affection table
        console.log('Creating relationship_affection table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS relationship_affection (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marriage_id INTEGER REFERENCES marriages(id),
                character_1 BIGINT REFERENCES player_characters(id),
                character_2 BIGINT REFERENCES player_characters(id),
                affection_points INTEGER DEFAULT 0,
                last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_interactions INTEGER DEFAULT 0,
                interaction_history TEXT DEFAULT '[]',
                UNIQUE(marriage_id, character_1, character_2)
            )
        `);
        console.log('✅ relationship_affection table created');

        // Create children table
        console.log('Creating children table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS children (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id BIGINT UNIQUE REFERENCES player_characters(id),
                conception_method VARCHAR(50),
                conception_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                birth_date TIMESTAMP,
                faction_at_birth VARCHAR(20),
                hybrid_composition TEXT DEFAULT '{}',
                gestation_complete BOOLEAN DEFAULT FALSE,
                development_score INTEGER DEFAULT 0,
                daily_care_streak INTEGER DEFAULT 0,
                neglect_count INTEGER DEFAULT 0,
                risk_of_death INTEGER DEFAULT 0,
                intelligence INTEGER DEFAULT 0,
                creativity INTEGER DEFAULT 0,
                resilience INTEGER DEFAULT 0,
                social_skill INTEGER DEFAULT 0,
                total_resources_invested INTEGER DEFAULT 0,
                switched_to BOOLEAN DEFAULT FALSE,
                switched_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ children table created');

        // Create marriage_proposals table
        console.log('Creating marriage_proposals table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS marriage_proposals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proposer_character_id BIGINT REFERENCES player_characters(id),
                target_character_id BIGINT REFERENCES player_characters(id),
                proposal_type VARCHAR(20) DEFAULT 'dyad',
                message TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (datetime('now', '+7 days'))
            )
        `);
        console.log('✅ marriage_proposals table created');

        // Create family_interactions table
        console.log('Creating family_interactions table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS family_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marriage_id INTEGER REFERENCES marriages(id),
                interaction_type VARCHAR(50),
                participants TEXT NOT NULL,
                interaction_data TEXT DEFAULT '{}',
                affection_gained INTEGER DEFAULT 0,
                resources_spent INTEGER DEFAULT 0,
                occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ family_interactions table created');

        // Create child_care_activities table
        console.log('Creating child_care_activities table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS child_care_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER REFERENCES children(id),
                caregiver_character_id BIGINT REFERENCES player_characters(id),
                activity_type VARCHAR(50),
                care_quality INTEGER DEFAULT 5,
                resources_spent INTEGER DEFAULT 0,
                development_impact INTEGER DEFAULT 0,
                occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ child_care_activities table created');

        // Create family_achievements table
        console.log('Creating family_achievements table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS family_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                achievement_type VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                requirements TEXT NOT NULL,
                rewards TEXT DEFAULT '{}',
                rarity VARCHAR(20) DEFAULT 'common',
                active BOOLEAN DEFAULT TRUE,
                UNIQUE(achievement_type, name)
            )
        `);
        console.log('✅ family_achievements table created');

        // Create user_family_achievements table
        console.log('Creating user_family_achievements table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS user_family_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id BIGINT REFERENCES users(discord_id),
                achievement_id INTEGER REFERENCES family_achievements(id),
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                progress TEXT DEFAULT '{}',
                UNIQUE(discord_id, achievement_id)
            )
        `);
        console.log('✅ user_family_achievements table created');

        // Create family_statistics table
        console.log('Creating family_statistics table...');
        await Database.query(`
            CREATE TABLE IF NOT EXISTS family_statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id BIGINT REFERENCES users(discord_id),
                character_id BIGINT REFERENCES player_characters(id),
                stat_type VARCHAR(50) NOT NULL,
                stat_value INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(discord_id, character_id, stat_type)
            )
        `);
        console.log('✅ family_statistics table created');

        // Insert default family achievements
        console.log('Inserting default family achievements...');
        const achievements = [
            ['marriage_milestone', 'First Love', 'Get married for the first time', '{"marriages": 1}', '{"xp": 500, "title": "Newlywed", "badge": "first_love"}', 'common'],
            ['marriage_milestone', 'Golden Anniversary', 'Stay married for 30 days', '{"marriage_duration_days": 30}', '{"xp": 2000, "title": "Devoted Partner", "badge": "golden_anniversary"}', 'uncommon'],
            ['marriage_milestone', 'Polyamory Pioneer', 'Be in a polyamorous relationship', '{"polyamory": true}', '{"xp": 1500, "title": "Polyamory Pioneer", "badge": "polyamory"}', 'uncommon'],
            ['parenting', 'New Parent', 'Have your first child', '{"children": 1}', '{"xp": 1000, "title": "New Parent", "badge": "new_parent"}', 'common'],
            ['parenting', 'Family Builder', 'Raise 3 children to adulthood', '{"children_raised": 3}', '{"xp": 5000, "title": "Family Builder", "badge": "family_builder"}', 'rare'],
            ['parenting', 'Dynasty Founder', 'Create a 5-generation lineage', '{"generations": 5}', '{"xp": 10000, "title": "Dynasty Founder", "badge": "dynasty"}', 'epic'],
            ['family_bonding', 'Affection Master', 'Reach 1000 affection points with a partner', '{"affection_points": 1000}', '{"xp": 2000, "title": "Affection Master", "badge": "affection_master"}', 'uncommon'],
            ['family_bonding', 'Perfect Parent', 'Maintain 30-day care streak for a child', '{"care_streak": 30}', '{"xp": 3000, "title": "Perfect Parent", "badge": "perfect_parent"}', 'rare'],
            ['family_bonding', 'Family Harmony', 'Have all family members with 500+ affection', '{"family_affection": 500}', '{"xp": 4000, "title": "Family Harmony", "badge": "harmony"}', 'rare'],
            ['family_bonding', 'Generational Wisdom', 'Switch to a child character', '{"character_switch": true}', '{"xp": 2500, "title": "Generational Wisdom", "badge": "wisdom"}', 'uncommon']
        ];

        for (const [type, name, desc, req, rew, rarity] of achievements) {
            await Database.query(`
                INSERT OR IGNORE INTO family_achievements 
                (achievement_type, name, description, requirements, rewards, rarity)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [type, name, desc, req, rew, rarity]);
        }
        console.log('✅ Default family achievements inserted');

        // Create indexes
        console.log('Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_marriages_status ON marriages(status)',
            'CREATE INDEX IF NOT EXISTS idx_marriages_type ON marriages(marriage_type)',
            'CREATE INDEX IF NOT EXISTS idx_marriage_participants_character ON marriage_participants(character_id)',
            'CREATE INDEX IF NOT EXISTS idx_marriage_participants_marriage ON marriage_participants(marriage_id)',
            'CREATE INDEX IF NOT EXISTS idx_relationship_affection_marriage ON relationship_affection(marriage_id)',
            'CREATE INDEX IF NOT EXISTS idx_relationship_affection_characters ON relationship_affection(character_1, character_2)',
            'CREATE INDEX IF NOT EXISTS idx_children_character ON children(character_id)',
            'CREATE INDEX IF NOT EXISTS idx_children_switched ON children(switched_to)',
            'CREATE INDEX IF NOT EXISTS idx_marriage_proposals_proposer ON marriage_proposals(proposer_character_id)',
            'CREATE INDEX IF NOT EXISTS idx_marriage_proposals_target ON marriage_proposals(target_character_id)',
            'CREATE INDEX IF NOT EXISTS idx_marriage_proposals_status ON marriage_proposals(status)',
            'CREATE INDEX IF NOT EXISTS idx_family_interactions_marriage ON family_interactions(marriage_id)',
            'CREATE INDEX IF NOT EXISTS idx_family_interactions_type ON family_interactions(interaction_type)',
            'CREATE INDEX IF NOT EXISTS idx_child_care_activities_child ON child_care_activities(child_id)',
            'CREATE INDEX IF NOT EXISTS idx_child_care_activities_caregiver ON child_care_activities(caregiver_character_id)',
            'CREATE INDEX IF NOT EXISTS idx_family_achievements_type ON family_achievements(achievement_type)',
            'CREATE INDEX IF NOT EXISTS idx_user_family_achievements_discord ON user_family_achievements(discord_id)',
            'CREATE INDEX IF NOT EXISTS idx_family_statistics_discord ON family_statistics(discord_id)',
            'CREATE INDEX IF NOT EXISTS idx_family_statistics_character ON family_statistics(character_id)'
        ];

        for (const indexSQL of indexes) {
            await Database.query(indexSQL);
        }
        console.log('✅ Indexes created');

        // Verify tables were created
        console.log('\n🔍 Verifying table creation...');
        const tables = [
            'marriages',
            'marriage_participants',
            'relationship_affection',
            'children',
            'marriage_proposals',
            'family_interactions',
            'child_care_activities',
            'family_achievements',
            'user_family_achievements',
            'family_statistics'
        ];

        for (const table of tables) {
            const result = await Database.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
            if (result.rows.length > 0) {
                console.log(`✅ Table '${table}' exists`);
            } else {
                console.log(`❌ Table '${table}' was not created`);
            }
        }

        // Check achievements count
        const achievementsCount = await Database.query('SELECT COUNT(*) as count FROM family_achievements');
        console.log(`✅ ${achievementsCount.rows[0].count} family achievements in database`);

        console.log('\n🎉 Marriage and Family System tables created successfully!\n');

    } catch (error) {
        console.error('❌ Error creating Marriage and Family System tables:', error);
        process.exit(1);
    }
}

// If run directly, execute the creation
if (require.main === module) {
    createMarriageFamilyTables().catch(console.error);
}

module.exports = { createMarriageFamilyTables };

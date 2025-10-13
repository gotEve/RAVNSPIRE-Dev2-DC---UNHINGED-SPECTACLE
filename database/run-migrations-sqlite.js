// SQLite-specific Database Migration Runner
// Handles SQLite limitations like no IF NOT EXISTS in ALTER TABLE

const fs = require('fs');
const path = require('path');
const Database = require('./db');

class SQLiteMigrationRunner {
    constructor() {
        this.migrationsDir = path.join(__dirname, 'migrations');
        this.migrationsTable = 'schema_migrations';
    }

    async runMigrations() {
        console.log('🔄 Starting SQLite database migrations...\n');

        try {
            // Create migrations tracking table
            await this.createMigrationsTable();

            // Run SQLite-specific migrations
            await this.runSQLiteEnhancements();

            // Get list of migration files
            const migrationFiles = this.getMigrationFiles();
            console.log(`Found ${migrationFiles.length} migration files`);

            // Run each migration
            for (const file of migrationFiles) {
                if (file.includes('sqlite')) {
                    await this.runMigration(file);
                }
            }

            console.log('\n✅ All SQLite migrations completed successfully!');
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async createMigrationsTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await Database.query(query);
    }

    async runSQLiteEnhancements() {
        console.log('🔧 Running SQLite-specific enhancements...');

        // Enhance game_sessions table
        await this.addColumnIfNotExists('game_sessions', 'game_state', 'TEXT');
        await this.addColumnIfNotExists('game_sessions', 'rewards_data', 'TEXT');

        // Enhance lore_entries table
        await this.addColumnIfNotExists('lore_entries', 'entry_id', 'VARCHAR(50)');
        await this.addColumnIfNotExists('lore_entries', 'volume', 'VARCHAR(50)');
        await this.addColumnIfNotExists('lore_entries', 'metadata', 'TEXT');
        await this.addColumnIfNotExists('lore_entries', 'discovered_by', 'TEXT');
        await this.addColumnIfNotExists('lore_entries', 'discovery_count', 'INTEGER DEFAULT 0');

        // Enhance users table
        await this.addColumnIfNotExists('users', 'current_faction', 'VARCHAR(20) DEFAULT "Human"');
        await this.addColumnIfNotExists('users', 'faction_purity', 'DECIMAL(3,2) DEFAULT 1.00');
        await this.addColumnIfNotExists('users', 'resources', 'TEXT');
        await this.addColumnIfNotExists('users', 'global_stats', 'TEXT');
        await this.addColumnIfNotExists('users', 'variety_score', 'DECIMAL(5,2) DEFAULT 0');
        await this.addColumnIfNotExists('users', 'activity_level', 'VARCHAR(20) DEFAULT "casual"');

        // Enhance guilds table
        await this.addColumnIfNotExists('guilds', 'guild_type', 'VARCHAR(50) DEFAULT "general"');
        await this.addColumnIfNotExists('guilds', 'faction_requirement', 'VARCHAR(20)');
        await this.addColumnIfNotExists('guilds', 'headquarters_neighborhood', 'INTEGER');
        await this.addColumnIfNotExists('guilds', 'merchant_level', 'INTEGER DEFAULT 1');

        console.log('✅ SQLite enhancements completed');
    }

    async addColumnIfNotExists(tableName, columnName, columnDefinition) {
        try {
            // Check if column exists
            const tableInfo = await Database.query(`PRAGMA table_info(${tableName})`);
            const columnExists = tableInfo.rows.some(col => col.name === columnName);

            if (!columnExists) {
                await Database.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
                console.log(`  ✅ Added column ${columnName} to ${tableName}`);
            } else {
                console.log(`  ⏭️  Column ${columnName} already exists in ${tableName}`);
            }
        } catch (error) {
            console.error(`  ❌ Failed to add column ${columnName} to ${tableName}:`, error.message);
        }
    }

    getMigrationFiles() {
        if (!fs.existsSync(this.migrationsDir)) {
            return [];
        }

        return fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql') && file.includes('sqlite'))
            .sort();
    }

    async runMigration(filename) {
        const migrationPath = path.join(this.migrationsDir, filename);
        
        // Check if migration already ran
        const checkQuery = `SELECT * FROM ${this.migrationsTable} WHERE filename = ?`;
        const existing = await Database.query(checkQuery, [filename]);
        
        if (existing.rows.length > 0) {
            console.log(`⏭️  Skipping ${filename} (already executed)`);
            return;
        }

        console.log(`🔄 Running migration: ${filename}`);

        try {
            // Read and execute migration file
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            // Split by semicolon and execute each statement
            const statements = migrationSQL
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            for (const statement of statements) {
                if (statement.trim()) {
                    await Database.query(statement);
                }
            }

            // Record migration as completed
            const insertQuery = `INSERT INTO ${this.migrationsTable} (filename) VALUES (?)`;
            await Database.query(insertQuery, [filename]);

            console.log(`✅ Completed migration: ${filename}`);
        } catch (error) {
            console.error(`❌ Failed migration ${filename}:`, error);
            throw error;
        }
    }

    async createSocialSimulationTables() {
        console.log('🏗️ Creating social simulation tables...');

        const tables = [
            // Player faction tracking
            `CREATE TABLE IF NOT EXISTS player_factions (
                discord_id INTEGER PRIMARY KEY,
                current_faction VARCHAR(20) DEFAULT 'Human',
                faction_purity DECIMAL(3,2) DEFAULT 1.00,
                faction_history TEXT DEFAULT '[]',
                switched_from_character INTEGER,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Character lineage
            `CREATE TABLE IF NOT EXISTS player_characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id INTEGER,
                original_creator INTEGER,
                character_name VARCHAR(100),
                birth_faction VARCHAR(20),
                current_faction VARCHAR(20),
                birth_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                age_years INTEGER DEFAULT 0,
                life_stage VARCHAR(20) DEFAULT 'adult',
                parent_1 INTEGER,
                parent_2 INTEGER,
                parent_3 INTEGER,
                genetic_traits TEXT DEFAULT '{}',
                is_active BOOLEAN DEFAULT 1,
                is_alive BOOLEAN DEFAULT 1,
                death_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Marriages
            `CREATE TABLE IF NOT EXISTS marriages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marriage_type VARCHAR(20) DEFAULT 'dyad',
                status VARCHAR(20) DEFAULT 'active',
                married_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                divorced_at DATETIME,
                divorce_cost INTEGER
            )`,

            // Marriage participants
            `CREATE TABLE IF NOT EXISTS marriage_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marriage_id INTEGER,
                character_id INTEGER,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                left_at DATETIME,
                UNIQUE(marriage_id, character_id)
            )`,

            // Relationship affection
            `CREATE TABLE IF NOT EXISTS relationship_affection (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marriage_id INTEGER,
                character_1 INTEGER,
                character_2 INTEGER,
                affection_points INTEGER DEFAULT 0,
                last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_interactions INTEGER DEFAULT 0,
                UNIQUE(marriage_id, character_1, character_2)
            )`,

            // Children
            `CREATE TABLE IF NOT EXISTS children (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id INTEGER UNIQUE,
                conception_method VARCHAR(50),
                conception_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                birth_date DATETIME,
                faction_at_birth VARCHAR(20),
                hybrid_composition TEXT DEFAULT '{}',
                gestation_complete BOOLEAN DEFAULT 0,
                development_score INTEGER DEFAULT 0,
                daily_care_streak INTEGER DEFAULT 0,
                neglect_count INTEGER DEFAULT 0,
                risk_of_death INTEGER DEFAULT 0,
                intelligence INTEGER DEFAULT 0,
                creativity INTEGER DEFAULT 0,
                resilience INTEGER DEFAULT 0,
                social_skill INTEGER DEFAULT 0,
                total_resources_invested INTEGER DEFAULT 0,
                switched_to BOOLEAN DEFAULT 0,
                switched_at DATETIME
            )`,

            // Game balance config
            `CREATE TABLE IF NOT EXISTS game_balance_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_type VARCHAR(50),
                scope VARCHAR(20) DEFAULT 'global',
                config_data TEXT NOT NULL,
                active BOOLEAN DEFAULT 1,
                updated_by INTEGER,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Player resources
            `CREATE TABLE IF NOT EXISTS player_resources (
                discord_id INTEGER PRIMARY KEY,
                currency INTEGER DEFAULT 0,
                food INTEGER DEFAULT 0,
                energy INTEGER DEFAULT 0,
                biomass INTEGER DEFAULT 0,
                electricity INTEGER DEFAULT 0,
                water INTEGER DEFAULT 0,
                data_fragments INTEGER DEFAULT 0,
                organic_matter INTEGER DEFAULT 0,
                building_materials INTEGER DEFAULT 0,
                rare_artifacts INTEGER DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Game variety log
            `CREATE TABLE IF NOT EXISTS game_variety_log (
                discord_id INTEGER,
                game_type VARCHAR(50),
                times_played INTEGER DEFAULT 0,
                last_played DATETIME,
                PRIMARY KEY (discord_id, game_type)
            )`
        ];

        for (const tableSQL of tables) {
            try {
                await Database.query(tableSQL);
                console.log(`  ✅ Created table: ${tableSQL.split(' ')[5]}`);
            } catch (error) {
                console.error(`  ❌ Failed to create table:`, error.message);
            }
        }

        console.log('✅ Social simulation tables created');
    }
}

// Run migrations if called directly
if (require.main === module) {
    const runner = new SQLiteMigrationRunner();
    runner.runMigrations()
        .then(() => runner.createSocialSimulationTables())
        .then(() => {
            console.log('Migration process completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration process failed:', error);
            process.exit(1);
        });
}

module.exports = SQLiteMigrationRunner;

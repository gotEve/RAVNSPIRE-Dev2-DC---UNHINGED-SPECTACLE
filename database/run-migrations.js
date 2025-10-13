// Database Migration Runner
// Runs migrations in order to update the database schema

const fs = require('fs');
const path = require('path');
const Database = require('./db');

class MigrationRunner {
    constructor() {
        this.migrationsDir = path.join(__dirname, 'migrations');
        this.migrationsTable = 'schema_migrations';
    }

    async runMigrations() {
        console.log('🔄 Starting database migrations...\n');

        try {
            // Create migrations tracking table
            await this.createMigrationsTable();

            // Get list of migration files
            const migrationFiles = this.getMigrationFiles();
            console.log(`Found ${migrationFiles.length} migration files`);

            // Run each migration
            for (const file of migrationFiles) {
                await this.runMigration(file);
            }

            console.log('\n✅ All migrations completed successfully!');
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async createMigrationsTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await Database.query(query);
    }

    getMigrationFiles() {
        if (!fs.existsSync(this.migrationsDir)) {
            return [];
        }

        return fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Run in alphabetical order
    }

    async runMigration(filename) {
        const migrationPath = path.join(this.migrationsDir, filename);
        
        // Check if migration already ran
        const checkQuery = `SELECT * FROM ${this.migrationsTable} WHERE filename = $1`;
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
            const insertQuery = `INSERT INTO ${this.migrationsTable} (filename) VALUES ($1)`;
            await Database.query(insertQuery, [filename]);

            console.log(`✅ Completed migration: ${filename}`);
        } catch (error) {
            console.error(`❌ Failed migration ${filename}:`, error);
            throw error;
        }
    }

    async getMigrationStatus() {
        try {
            const query = `SELECT * FROM ${this.migrationsTable} ORDER BY executed_at`;
            const result = await Database.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting migration status:', error);
            return [];
        }
    }

    async rollbackMigration(filename) {
        console.log(`🔄 Rolling back migration: ${filename}`);
        
        // Remove from migrations table
        const deleteQuery = `DELETE FROM ${this.migrationsTable} WHERE filename = $1`;
        await Database.query(deleteQuery, [filename]);
        
        console.log(`✅ Rolled back migration: ${filename}`);
    }
}

// Run migrations if called directly
if (require.main === module) {
    const runner = new MigrationRunner();
    runner.runMigrations().then(() => {
        console.log('Migration process completed');
        process.exit(0);
    }).catch(error => {
        console.error('Migration process failed:', error);
        process.exit(1);
    });
}

module.exports = MigrationRunner;

// Import Lore Codex Script
// Imports entries from ravnspire_codex_2025_10_12.json into the database

const fs = require('fs');
const path = require('path');
const Database = require('./db');

class LoreCodexImporter {
    constructor() {
        this.codexPath = path.join(__dirname, '../ravnspire_codex_2025_10_12.json');
    }

    async importCodex() {
        console.log('📚 Starting Lore Codex Import...\n');

        try {
            // Check if codex file exists
            if (!fs.existsSync(this.codexPath)) {
                throw new Error(`Codex file not found: ${this.codexPath}`);
            }

            // Read and parse codex
            const codexData = JSON.parse(fs.readFileSync(this.codexPath, 'utf8'));
            console.log(`Found ${Object.keys(codexData).length} volumes in codex`);

            let totalEntries = 0;
            let importedEntries = 0;
            let skippedEntries = 0;

            // Process each volume
            for (const [volumeName, volumeData] of Object.entries(codexData)) {
                console.log(`\n📖 Processing ${volumeName}...`);
                
                if (!volumeData.entries || !Array.isArray(volumeData.entries)) {
                    console.log(`⚠️  No entries found in ${volumeName}`);
                    continue;
                }

                for (const entry of volumeData.entries) {
                    totalEntries++;
                    
                    try {
                        const result = await this.importEntry(entry, volumeName, volumeData.released);
                        
                        if (result.imported) {
                            importedEntries++;
                            console.log(`  ✅ Imported: ${entry.title} (${entry.entry_id})`);
                        } else {
                            skippedEntries++;
                            console.log(`  ⏭️  Skipped: ${entry.title} (${entry.entry_id}) - ${result.reason}`);
                        }
                    } catch (error) {
                        console.error(`  ❌ Failed to import ${entry.title}: ${error.message}`);
                    }
                }
            }

            console.log('\n📊 Import Summary:');
            console.log(`  Total entries processed: ${totalEntries}`);
            console.log(`  Successfully imported: ${importedEntries}`);
            console.log(`  Skipped: ${skippedEntries}`);
            console.log(`  Failed: ${totalEntries - importedEntries - skippedEntries}`);

            if (importedEntries > 0) {
                console.log('\n🎉 Lore codex import completed successfully!');
            } else {
                console.log('\n⚠️  No new entries were imported.');
            }

        } catch (error) {
            console.error('❌ Lore codex import failed:', error);
            throw error;
        }
    }

    async importEntry(entry, volumeName, volumeReleased) {
        // Validate required fields
        if (!entry.entry_id || !entry.title || !entry.content) {
            return {
                imported: false,
                reason: 'Missing required fields (entry_id, title, or content)'
            };
        }

        // Check if entry already exists
        const existing = await Database.query(
            'SELECT id FROM lore_entries WHERE entry_id = $1',
            [entry.entry_id]
        );

        if (existing.rows.length > 0) {
            return {
                imported: false,
                reason: 'Entry already exists'
            };
        }

        // Prepare metadata
        const metadata = {
            section: entry.section || null,
            source: entry.source || null,
            integrity: entry.integrity || null,
            curator: entry.curator || null,
            released: entry.released !== undefined ? entry.released : volumeReleased
        };

        // Determine category from section
        const category = this.determineCategory(entry.section);

        // Insert entry
        await Database.query(`
            INSERT INTO lore_entries (
                entry_id, volume, title, content, category, 
                metadata, discovered_by, discovery_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            entry.entry_id,
            volumeName,
            entry.title,
            entry.content,
            category,
            JSON.stringify(metadata),
            JSON.stringify([]), // Empty discovered_by array
            0 // Initial discovery count
        ]);

        return {
            imported: true,
            reason: 'Successfully imported'
        };
    }

    determineCategory(section) {
        if (!section) return 'general';
        
        const sectionLower = section.toLowerCase();
        
        if (sectionLower.includes('archive')) return 'archive';
        if (sectionLower.includes('human')) return 'human-logs';
        if (sectionLower.includes('ai') || sectionLower.includes('machine')) return 'ai-logs';
        if (sectionLower.includes('nature')) return 'nature-logs';
        if (sectionLower.includes('character')) return 'characters';
        if (sectionLower.includes('location')) return 'locations';
        if (sectionLower.includes('event')) return 'events';
        if (sectionLower.includes('timeline')) return 'timeline';
        if (sectionLower.includes('item')) return 'items';
        if (sectionLower.includes('faction')) return 'factions';
        
        return 'general';
    }

    async getImportStatus() {
        try {
            const result = await Database.query(`
                SELECT 
                    volume,
                    COUNT(*) as total_entries,
                    COUNT(CASE WHEN metadata->>'released' = 'true' THEN 1 END) as released_entries,
                    COUNT(CASE WHEN discovery_count > 0 THEN 1 END) as discovered_entries
                FROM lore_entries 
                WHERE volume IS NOT NULL
                GROUP BY volume
                ORDER BY volume
            `);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting import status:', error);
            return [];
        }
    }

    async printImportStatus() {
        console.log('\n📊 Current Lore Database Status:');
        console.log('================================');
        
        const status = await this.getImportStatus();
        
        if (status.length === 0) {
            console.log('No lore entries found in database.');
            return;
        }

        for (const volume of status) {
            console.log(`\n📖 ${volume.volume}:`);
            console.log(`  Total entries: ${volume.total_entries}`);
            console.log(`  Released: ${volume.released_entries}`);
            console.log(`  Discovered: ${volume.discovered_entries}`);
        }

        // Get total counts
        const totals = await Database.query(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(CASE WHEN metadata->>'released' = 'true' THEN 1 END) as released_entries,
                COUNT(CASE WHEN discovery_count > 0 THEN 1 END) as discovered_entries
            FROM lore_entries
        `);
        
        if (totals.rows.length > 0) {
            const total = totals.rows[0];
            console.log(`\n🎯 Overall Totals:`);
            console.log(`  Total entries: ${total.total_entries}`);
            console.log(`  Released entries: ${total.released_entries}`);
            console.log(`  Discovered entries: ${total.discovered_entries}`);
        }
    }
}

// Run import if called directly
if (require.main === module) {
    const importer = new LoreCodexImporter();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--status')) {
        importer.printImportStatus().then(() => {
            process.exit(0);
        }).catch(error => {
            console.error('Error getting status:', error);
            process.exit(1);
        });
    } else {
        importer.importCodex().then(() => {
            process.exit(0);
        }).catch(error => {
            console.error('Import failed:', error);
            process.exit(1);
        });
    }
}

module.exports = LoreCodexImporter;

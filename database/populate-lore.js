const Database = require('./db');

async function populateLore() {
    console.log('Populating Ravnspire lore database...');
    
    try {
        // Clear existing lore entries
        await Database.query('DELETE FROM lore_entries');
        
        const loreEntries = [
            {
                title: 'The Founding of Ravnspire',
                content: 'In the year 1247, the great city of Ravnspire was founded by the legendary hero Aeliana the Wise. She discovered the ancient crystal formations that would become the city\'s foundation while exploring the Whispering Woods. The city was built around these mystical crystals, which provide both light and magical energy to its inhabitants. Aeliana established the first Council of Elders and created the laws that still govern the city today.',
                category: 'history',
                tags: ['founding', 'Aeliana', 'crystals', 'council']
            },
            {
                title: 'The Whispering Woods',
                content: 'The Whispering Woods is a mysterious forest located to the north of Ravnspire. Ancient trees tower hundreds of feet high, and their leaves shimmer with an otherworldly glow. Travelers report hearing whispers in the wind that seem to speak of forgotten secrets. The woods are home to the rare Moonlight Deer, creatures that only appear during the full moon. Many adventurers have ventured into the woods seeking the legendary Crystal of Echoes, but few have returned.',
                category: 'locations',
                tags: ['forest', 'mystery', 'Moonlight Deer', 'Crystal of Echoes']
            },
            {
                title: 'Aeliana the Wise',
                content: 'Aeliana the Wise was the founder and first ruler of Ravnspire. Born in the distant kingdom of Valdris, she was known for her exceptional wisdom and magical abilities. She could commune with the ancient crystals and was said to have visions of the future. Aeliana established the Academy of Mystical Arts and personally trained the first generation of crystal mages. Her final act was to seal herself within the Great Crystal at the city\'s center, where she continues to watch over Ravnspire.',
                category: 'characters',
                tags: ['founder', 'ruler', 'magic', 'crystal mage', 'Academy']
            },
            {
                title: 'The Great Crystal',
                content: 'The Great Crystal is the heart of Ravnspire, located in the center of the city\'s main square. This massive crystal formation stands over 100 feet tall and pulses with a soft blue light. It is said to contain the essence of Aeliana the Wise and serves as the primary source of magical energy for the entire city. The crystal responds to the emotions of the citizens, glowing brighter during times of celebration and dimming during periods of sorrow.',
                category: 'locations',
                tags: ['crystal', 'center', 'magic', 'Aeliana', 'energy']
            },
            {
                title: 'The Crystal Wars',
                content: 'The Crystal Wars were a series of conflicts that occurred between 1350 and 1365, when neighboring kingdoms sought to claim Ravnspire\'s crystal resources. The wars began when King Thorne of the Ironlands attempted to invade the city. The defenders, led by Captain Marcus the Bold, used the city\'s crystal magic to create impenetrable barriers. The conflict ended when Aeliana\'s spirit appeared from the Great Crystal and banished the invaders with a wave of pure light.',
                category: 'events',
                tags: ['war', 'invasion', 'King Thorne', 'Captain Marcus', 'defense']
            },
            {
                title: 'The Academy of Mystical Arts',
                content: 'The Academy of Mystical Arts is the premier institution for magical education in Ravnspire. Founded by Aeliana herself, the academy teaches students how to harness the power of the city\'s crystals. The curriculum includes crystal manipulation, elemental magic, and the ancient art of spirit communication. The academy is located in a magnificent building made entirely of crystal, with classrooms that float in mid-air. Only the most gifted students are accepted, and graduation requires passing the Trial of the Crystals.',
                category: 'locations',
                tags: ['academy', 'magic', 'education', 'crystals', 'Trial of the Crystals']
            },
            {
                title: 'Captain Marcus the Bold',
                content: 'Captain Marcus the Bold was the legendary defender of Ravnspire during the Crystal Wars. Originally a simple blacksmith, he discovered his natural talent for crystal magic when the city was under attack. Marcus developed the technique of "Crystal Armor," which allows warriors to encase themselves in protective crystal formations. His leadership and bravery inspired the city\'s defenders to victory. After the wars, he became the first Master of the Crystal Guard and established the city\'s defense protocols.',
                category: 'characters',
                tags: ['defender', 'blacksmith', 'Crystal Armor', 'Master', 'Crystal Guard']
            },
            {
                title: 'The Moonlight Deer',
                content: 'The Moonlight Deer are mystical creatures that inhabit the Whispering Woods. These ethereal beings have coats that shimmer like starlight and antlers that glow with a soft silver radiance. They only appear during the full moon and are said to be the guardians of the forest\'s deepest secrets. Legend tells that those who can approach a Moonlight Deer without startling it will be granted a vision of their destiny. The deer are extremely rare and are considered sacred by the people of Ravnspire.',
                category: 'characters',
                tags: ['deer', 'mystical', 'Whispering Woods', 'full moon', 'guardians']
            },
            {
                title: 'The Trial of the Crystals',
                content: 'The Trial of the Crystals is the final test that students must pass to graduate from the Academy of Mystical Arts. This ancient ritual requires students to navigate a maze of crystal formations while demonstrating mastery of various magical techniques. The trial tests not only magical ability but also wisdom, courage, and compassion. Those who pass are granted the title of Crystal Mage and receive a personal crystal that will serve as their magical focus for life. The trial has never been failed by a truly worthy student.',
                category: 'events',
                tags: ['trial', 'graduation', 'Academy', 'Crystal Mage', 'ritual']
            },
            {
                title: 'The Crystal Guard',
                content: 'The Crystal Guard is Ravnspire\'s elite military force, established by Captain Marcus after the Crystal Wars. These warriors are trained in both traditional combat and crystal magic, making them formidable defenders of the city. Each guard is equipped with a crystal weapon that can channel magical energy. The guard is led by the Master of the Crystal Guard, a position that has been held by only the most skilled warriors. They patrol the city and its borders, ensuring the safety of all citizens.',
                category: 'organizations',
                tags: ['military', 'defense', 'crystal weapons', 'Master', 'patrol']
            }
        ];

        for (const lore of loreEntries) {
            await Database.query(`
                INSERT INTO lore_entries (title, content, category, tags)
                VALUES ($1, $2, $3, $4)
            `, [lore.title, lore.content, lore.category, JSON.stringify(lore.tags)]);
        }

        console.log(`✅ Successfully populated ${loreEntries.length} lore entries`);
        
        // Verify the entries
        const result = await Database.query('SELECT COUNT(*) FROM lore_entries');
        console.log(`📊 Total lore entries in database: ${result.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error populating lore:', error);
        throw error;
    }
}

if (require.main === module) {
    populateLore().catch(error => {
        console.error('Population failed:', error);
        process.exit(1);
    });
}

module.exports = { populateLore };

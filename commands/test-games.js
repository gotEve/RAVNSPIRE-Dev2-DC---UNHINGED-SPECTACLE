const { SlashCommandBuilder } = require('discord.js');
const gameRegistry = require('../games/GameRegistry');
const Database = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-games')
        .setDescription('Test the games system'),
    cooldown: 5,
    async execute(interaction) {
        try {
            // Test database connection
            await Database.query('SELECT NOW()');
            
            // Test lore entries
            const loreResult = await Database.query('SELECT COUNT(*) FROM lore_entries');
            const loreCount = loreResult.rows[0].count;
            
                // Test game creation
                const availableGames = gameRegistry.getAllGames();
                const gameInstances = [];
                
                for (const gameInfo of availableGames) {
                    const GameClass = gameInfo.class;
                    const gameInstance = new GameClass();
                    await gameInstance.initialize(interaction.user.id, { singlePlayer: true });
                    gameInstances.push(gameInstance);
                }
            
            const embed = {
                title: '🎮 Games System Test',
                description: 'Testing the games system functionality...',
                color: 0x00ff00,
                fields: [
                    { name: 'Database Connection', value: '✅ Connected', inline: true },
                    { name: 'Lore Entries', value: `${loreCount} entries found`, inline: true },
                        { name: 'Games Loaded', value: `${availableGames.length} games`, inline: true },
                        { name: 'Game Instances', value: `${gameInstances.length} initialized`, inline: true },
                        { name: 'Available Games', value: availableGames.map(g => g.name).join(', '), inline: false },
                    { name: 'Admin Commands', value: '/lore-manage (Admin only)', inline: false }
                ],
                footer: { text: 'Use /games-play to start playing!' }
            };
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Test games error:', error);
            await interaction.reply({
                content: `❌ Test failed: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

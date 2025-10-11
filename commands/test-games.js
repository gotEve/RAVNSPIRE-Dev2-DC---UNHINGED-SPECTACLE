const { SlashCommandBuilder } = require('discord.js');
const TetrisGame = require('../games/types/tetris/TetrisGame');
const TicTacToeGame = require('../games/types/tictactoe/TicTacToeGame');
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
            const tetrisGame = new TetrisGame();
            await tetrisGame.initialize(interaction.user.id);
            
            const tictactoeGame = new TicTacToeGame();
            await tictactoeGame.initialize(interaction.user.id, { singlePlayer: true });
            
            const embed = {
                title: '🎮 Games System Test',
                description: 'Testing the games system functionality...',
                color: 0x00ff00,
                fields: [
                    { name: 'Database Connection', value: '✅ Connected', inline: true },
                    { name: 'Lore Entries', value: `${loreCount} entries found`, inline: true },
                    { name: 'Tetris Game', value: '✅ Initialized', inline: true },
                    { name: 'TicTacToe Game', value: '✅ Initialized', inline: true },
                    { name: 'Available Games', value: 'Tetris, TicTacToe', inline: false },
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

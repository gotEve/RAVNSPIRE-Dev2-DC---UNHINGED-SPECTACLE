const { SlashCommandBuilder } = require('discord.js');
const TetrisGame = require('../../games/types/tetris/TetrisGame');
const TicTacToeGame = require('../../games/types/tictactoe/TicTacToeGame');
const gameSessionManager = require('../../games/engine/GameSession');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games-play')
        .setDescription('Start playing a game')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('The game to play')
                .setRequired(true)
                .addChoices(
                    { name: 'Tetris', value: 'tetris' },
                    { name: 'Tic Tac Toe', value: 'tictactoe' }
                ))
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Game mode (for Tic Tac Toe)')
                .setRequired(false)
                .addChoices(
                    { name: 'Single Player (vs AI)', value: 'single' },
                    { name: 'Multiplayer (vs Player)', value: 'multiplayer' }
                )),
    cooldown: 10,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const gameType = interaction.options.getString('game');
            const mode = interaction.options.getString('mode') || 'single';

            // Check if user already has an active game session
            const existingSession = await gameSessionManager.getUserActiveSession(userId);
            if (existingSession) {
                return await interaction.reply({
                    content: 'You already have an active game session. Please finish or abandon it first using `/games-quit`.',
                    ephemeral: true
                });
            }

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            // Create game instance based on type
            let gameInstance;
            switch (gameType) {
                case 'tetris':
                    gameInstance = new TetrisGame();
                    break;
                case 'tictactoe':
                    gameInstance = new TicTacToeGame();
                    break;
                default:
                    return await interaction.reply({
                        content: 'Game type not supported yet.',
                        ephemeral: true
                    });
            }

            // Start the game
            const gameState = await gameInstance.startGame(userId, {
                mode: mode === 'single' ? { singlePlayer: true } : { singlePlayer: false }
            });

            // Create session
            await gameSessionManager.createSession(gameInstance);

            // Send initial game state
            await interaction.reply({
                embeds: [gameState.embed],
                components: gameState.components
            });

        } catch (error) {
            console.error('Error in games-play command:', error);
            await interaction.reply({
                content: `There was an error starting the game: ${error.message}`,
                ephemeral: true
            });
        }
    },
};

const { SlashCommandBuilder } = require('discord.js');
const gameRegistry = require('../../games/GameRegistry');
const gameSessionManager = require('../../games/engine/GameSession');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

// Build the command dynamically based on available games
function buildCommand() {
    const command = new SlashCommandBuilder()
        .setName('games-play')
        .setDescription('Start playing a game');

    // Add game choices dynamically
    const gameChoices = gameRegistry.getDiscordChoices();
    command.addStringOption(option =>
        option.setName('game')
            .setDescription('The game to play')
            .setRequired(true)
            .addChoices(...gameChoices)
    );

    // Add mode option for games that support it
    command.addStringOption(option =>
        option.setName('mode')
            .setDescription('Game mode (for multiplayer games)')
            .setRequired(false)
            .addChoices(
                { name: 'Single Player (vs AI)', value: 'single' },
                { name: 'Multiplayer (vs Player)', value: 'multiplayer' }
            )
    );

    return command;
}

module.exports = {
    data: buildCommand(),
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

            // Create game instance using registry
            const GameClass = gameRegistry.getGameClass(gameType);
            if (!GameClass) {
                return await interaction.reply({
                    content: 'Game type not found.',
                    ephemeral: true
                });
            }

            const gameInstance = new GameClass();

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

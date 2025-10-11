const { SlashCommandBuilder } = require('discord.js');
const gameConfig = require('../../config/gameConfig');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('View available games and start playing')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available games')),
    cooldown: 5,
    async execute(interaction) {
        try {
            const games = gameConfig.games;
            const gameList = Object.values(games);

            if (gameList.length === 0) {
                const embed = EmbedBuilderUtil.createInfoEmbed(
                    'No Games Available',
                    'There are currently no games available. Check back later!'
                );
                return await interaction.reply({ embeds: [embed] });
            }

            const embed = EmbedBuilderUtil.createBaseEmbed(
                '🎮 Available Games',
                'Choose a game to start playing!'
            );

            // Add game information
            gameList.forEach(game => {
                const duration = Math.floor(game.duration / 60); // Convert to minutes
                const players = game.minPlayers === game.maxPlayers 
                    ? game.minPlayers.toString() 
                    : `${game.minPlayers}-${game.maxPlayers}`;

                embed.addFields({
                    name: game.name,
                    value: `${game.description}\n**Duration:** ${duration} min | **Players:** ${players} | **Category:** ${game.category}`,
                    inline: false
                });
            });

            // Create game selection menu
            const selectMenu = ButtonBuilderUtil.createGameSelection(gameList);

            await interaction.reply({
                embeds: [embed],
                components: [selectMenu]
            });

        } catch (error) {
            console.error('Error in games list command:', error);
            await interaction.reply({
                content: 'There was an error retrieving the game list.',
                ephemeral: true
            });
        }
    },
};

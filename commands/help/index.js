const { SlashCommandBuilder } = require('discord.js');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with bot commands and features')
        .addStringOption(option =>
            option.setName('section')
                .setDescription('Specific help section')
                .setRequired(false)
                .addChoices(
                    { name: 'Games', value: 'games' },
                    { name: 'Profile', value: 'profile' },
                    { name: 'Guild', value: 'guild' },
                    { name: 'Neighborhood', value: 'neighborhood' },
                    { name: 'Lore', value: 'lore' },
                    { name: 'Achievements', value: 'achievements' },
                    { name: 'Community', value: 'community' }
                )),
    cooldown: 5,
    async execute(interaction) {
        try {
            const section = interaction.options.getString('section');

            if (section) {
                // Show specific section help
                await this.showSectionHelp(interaction, section);
            } else {
                // Show main help menu
                await this.showMainHelp(interaction);
            }

        } catch (error) {
            console.error('Error in help command:', error);
            await interaction.reply({
                content: 'There was an error retrieving help information.',
                ephemeral: true
            });
        }
    },

    async showMainHelp(interaction) {
        const embed = EmbedBuilderUtil.createBaseEmbed(
            '🆘 Ravnspire Bot Help',
            'Welcome to the Ravnspire community bot! Use the buttons below to navigate to specific help sections.'
        );

        embed.addFields(
            {
                name: '🎮 Games',
                value: 'Play trivia, adventures, and puzzles to earn XP and achievements',
                inline: true
            },
            {
                name: '👤 Profile',
                value: 'Manage your profile, badges, titles, and view statistics',
                inline: true
            },
            {
                name: '🏰 Guild',
                value: 'Create or join guilds, manage members, and participate in guild activities',
                inline: true
            },
            {
                name: '🏘️ Neighborhood',
                value: 'Join neighborhoods, contribute to buildings, and participate in community events',
                inline: true
            },
            {
                name: '📚 Lore',
                value: 'Discover and explore the rich lore of the Ravnspire universe',
                inline: true
            },
            {
                name: '🏆 Achievements',
                value: 'Track your progress and unlock achievements across all activities',
                inline: true
            },
            {
                name: '🌟 Community',
                value: 'Participate in community events, challenges, and social activities',
                inline: true
            }
        );

        embed.addFields({
            name: 'Quick Start',
            value: '1. Use `/profile` to set up your profile\n2. Try `/games` to start playing\n3. Use `/guild create` to start a guild\n4. Check `/achievements` to see what you can unlock',
            inline: false
        });

        const components = ButtonBuilderUtil.createHelpNavigation();

        await interaction.reply({
            embeds: [embed],
            components: components
        });
    },

    async showSectionHelp(interaction, section) {
        const helpData = this.getSectionHelpData(section);
        
        const embed = EmbedBuilderUtil.createBaseEmbed(
            helpData.title,
            helpData.description
        );

        // Add commands for this section
        if (helpData.commands && helpData.commands.length > 0) {
            const commandList = helpData.commands.map(cmd => 
                `**/${cmd.name}** - ${cmd.description}`
            ).join('\n');

            embed.addFields({
                name: 'Commands',
                value: commandList,
                inline: false
            });
        }

        // Add tips if available
        if (helpData.tips && helpData.tips.length > 0) {
            const tipsList = helpData.tips.map((tip, index) => 
                `${index + 1}. ${tip}`
            ).join('\n');

            embed.addFields({
                name: 'Tips',
                value: tipsList,
                inline: false
            });
        }

        // Add back button
        const backButton = new (require('discord.js')).ActionRowBuilder()
            .addComponents(
                new (require('discord.js')).ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Back to Main Help')
                    .setStyle(require('discord.js').ButtonStyle.Secondary)
                    .setEmoji('⬅️')
            );

        await interaction.reply({
            embeds: [embed],
            components: [backButton]
        });
    },

    getSectionHelpData(section) {
        const helpData = {
            games: {
                title: '🎮 Games Help',
                description: 'Learn about the available games and how to play them.',
                commands: [
                    { name: 'games', description: 'View available games and start playing' },
                    { name: 'games-play', description: 'Start a specific game with options' },
                    { name: 'games-leaderboard', description: 'View leaderboards for games' },
                    { name: 'games-stats', description: 'View your game statistics' }
                ],
                tips: [
                    'Choose your difficulty wisely - harder difficulties give more rewards',
                    'Maintain streaks for bonus points and achievements',
                    'Try different categories to find your strengths',
                    'Check leaderboards to see how you compare to others'
                ]
            },
            profile: {
                title: '👤 Profile Help',
                description: 'Manage your profile, badges, and view your statistics.',
                commands: [
                    { name: 'profile', description: 'View your or another user\'s profile' },
                    { name: 'profile-edit', description: 'Edit your bio or equip titles' },
                    { name: 'profile-badges', description: 'View and manage your badges' },
                    { name: 'profile-stats', description: 'View detailed statistics' }
                ],
                tips: [
                    'Complete achievements to unlock new titles and badges',
                    'You can equip up to 3 badges at once',
                    'Your profile shows your progress across all activities',
                    'Use titles to show off your accomplishments'
                ]
            },
            guild: {
                title: '🏰 Guild Help',
                description: 'Create and manage guilds, invite members, and participate in guild activities.',
                commands: [
                    { name: 'guild create', description: 'Create a new guild' },
                    { name: 'guild info', description: 'View guild information' },
                    { name: 'guild invite', description: 'Invite a user to your guild' },
                    { name: 'guild join', description: 'Join a guild' },
                    { name: 'guild leave', description: 'Leave your current guild' },
                    { name: 'guild roles', description: 'Manage member roles' },
                    { name: 'guild leaderboard', description: 'View guild rankings' }
                ],
                tips: [
                    'Guild owners can promote members to officers',
                    'Guild activities contribute to guild XP and level',
                    'Higher level guilds get better bonuses',
                    'Guild members can participate in guild wars and competitions'
                ]
            },
            neighborhood: {
                title: '🏘️ Neighborhood Help',
                description: 'Join neighborhoods, contribute to community buildings, and participate in events.',
                commands: [
                    { name: 'neighborhood info', description: 'View neighborhood information' },
                    { name: 'neighborhood join', description: 'Join a neighborhood' },
                    { name: 'neighborhood leave', description: 'Leave your neighborhood' },
                    { name: 'neighborhood buildings', description: 'View community buildings' },
                    { name: 'neighborhood contribute', description: 'Contribute resources to buildings' },
                    { name: 'neighborhood events', description: 'View neighborhood events' },
                    { name: 'neighborhood vote', description: 'Vote on neighborhood decisions' }
                ],
                tips: [
                    'Neighborhoods have limited plots - join early to secure a spot',
                    'Contributing to buildings benefits all neighborhood members',
                    'Vote on neighborhood decisions to shape the community',
                    'Neighborhoods can be attacked - contribute to defenses'
                ]
            },
            lore: {
                title: '📚 Lore Help',
                description: 'Discover and explore the rich lore of the Ravnspire universe.',
                commands: [
                    { name: 'lore search', description: 'Search for lore entries' },
                    { name: 'lore category', description: 'Browse lore by category' },
                    { name: 'lore view', description: 'View a specific lore entry' },
                    { name: 'lore discover', description: 'Check your lore discovery progress' }
                ],
                tips: [
                    'Some lore is hidden and must be unlocked through gameplay',
                    'Lore entries are organized by categories like characters, locations, and events',
                    'Completing achievements can unlock new lore entries',
                    'Use the search function to find specific information'
                ]
            },
            achievements: {
                title: '🏆 Achievements Help',
                description: 'Track your progress and unlock achievements across all activities.',
                commands: [
                    { name: 'achievements', description: 'View your unlocked achievements' },
                    { name: 'achievements-progress', description: 'Track progress toward locked achievements' },
                    { name: 'achievements-recent', description: 'View recently unlocked achievements' }
                ],
                tips: [
                    'Achievements come in different rarities with better rewards',
                    'Some achievements are hidden and must be discovered',
                    'Check your progress regularly to see what you\'re close to unlocking',
                    'Achievements can unlock titles, badges, and lore entries'
                ]
            },
            community: {
                title: '🌟 Community Help',
                description: 'Participate in community events, challenges, and social activities.',
                commands: [
                    { name: 'community events', description: 'View active and upcoming events' },
                    { name: 'community bulletin', description: 'View community announcements' },
                    { name: 'community stats', description: 'View server-wide statistics' },
                    { name: 'community challenges', description: 'View daily and weekly challenges' }
                ],
                tips: [
                    'Participate in community events for exclusive rewards',
                    'Check the bulletin regularly for important announcements',
                    'Complete daily and weekly challenges for bonus XP',
                    'Community stats show the overall server activity'
                ]
            }
        };

        return helpData[section] || {
            title: '❓ Unknown Section',
            description: 'The requested help section was not found.',
            commands: [],
            tips: []
        };
    }
};

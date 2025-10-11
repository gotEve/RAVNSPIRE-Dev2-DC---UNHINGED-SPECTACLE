const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

class ButtonBuilderUtil {
    static createHelpNavigation() {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_games')
                    .setLabel('Games')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎮'),
                new ButtonBuilder()
                    .setCustomId('help_profile')
                    .setLabel('Profile')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('help_guild')
                    .setLabel('Guild')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏰'),
                new ButtonBuilder()
                    .setCustomId('help_neighborhood')
                    .setLabel('Neighborhood')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏘️'),
                new ButtonBuilder()
                    .setCustomId('help_lore')
                    .setLabel('Lore')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📚')
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_achievements')
                    .setLabel('Achievements')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('help_community')
                    .setLabel('Community')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌟'),
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️')
            );

        return [row, row2];
    }

    static createGameSelection(games) {
        const options = games.map(game => ({
            label: game.name,
            description: game.description,
            value: game.name.toLowerCase()
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('game_select')
            .setPlaceholder('Choose a game to play...')
            .addOptions(options);

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    static createGameControls() {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('game_quit')
                    .setLabel('Quit Game')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('game_hint')
                    .setLabel('Hint')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💡'),
                new ButtonBuilder()
                    .setCustomId('game_skip')
                    .setLabel('Skip')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏭️')
            );

        return row;
    }

    static createTriviaAnswers(answers) {
        const row = new ActionRowBuilder();
        
        answers.forEach((answer, index) => {
            const button = new ButtonBuilder()
                .setCustomId(`trivia_answer_${index}`)
                .setLabel(answer)
                .setStyle(ButtonStyle.Primary);
            
            row.addComponents(button);
        });

        return row;
    }

    static createGuildManagement() {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guild_invite')
                    .setLabel('Invite Member')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('guild_kick')
                    .setLabel('Kick Member')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('👢'),
                new ButtonBuilder()
                    .setCustomId('guild_promote')
                    .setLabel('Promote')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⬆️'),
                new ButtonBuilder()
                    .setCustomId('guild_demote')
                    .setLabel('Demote')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬇️')
            );

        return row;
    }

    static createNeighborhoodActions() {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('neighborhood_join')
                    .setLabel('Join Neighborhood')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏘️'),
                new ButtonBuilder()
                    .setCustomId('neighborhood_contribute')
                    .setLabel('Contribute')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setCustomId('neighborhood_vote')
                    .setLabel('Vote')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗳️'),
                new ButtonBuilder()
                    .setCustomId('neighborhood_defense')
                    .setLabel('Defense')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🛡️')
            );

        return row;
    }

    static createProfileActions() {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('profile_edit')
                    .setLabel('Edit Profile')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId('profile_badges')
                    .setLabel('Badges')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('profile_stats')
                    .setLabel('Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('profile_achievements')
                    .setLabel('Achievements')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎖️')
            );

        return row;
    }

    static createLoreNavigation(lore, hasNext = false, hasPrev = false) {
        const row = new ActionRowBuilder();

        if (hasPrev) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`lore_prev_${lore.id}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️')
            );
        }

        if (hasNext) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`lore_next_${lore.id}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('➡️')
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`lore_back_${lore.id}`)
                .setLabel('Back to Search')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔍')
        );

        return row;
    }

    static createConfirmation(action, id) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_${action}_${id}`)
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`cancel_${action}_${id}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        return row;
    }

    static createPagination(currentPage, totalPages, prefix) {
        const row = new ActionRowBuilder();

        if (currentPage > 1) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`${prefix}_page_${currentPage - 1}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️')
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${prefix}_page_info`)
                .setLabel(`${currentPage}/${totalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        );

        if (currentPage < totalPages) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`${prefix}_page_${currentPage + 1}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('➡️')
            );
        }

        return row;
    }
}

module.exports = ButtonBuilderUtil;

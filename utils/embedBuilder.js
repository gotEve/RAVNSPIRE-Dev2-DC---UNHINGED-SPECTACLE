const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

class EmbedBuilderUtil {
    static createBaseEmbed(title, description = '') {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(config.colors.primary)
            .setTimestamp();
    }

    static createSuccessEmbed(title, description = '') {
        return new EmbedBuilder()
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setColor(config.colors.success)
            .setTimestamp();
    }

    static createErrorEmbed(title, description = '') {
        return new EmbedBuilder()
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setColor(config.colors.error)
            .setTimestamp();
    }

    static createWarningEmbed(title, description = '') {
        return new EmbedBuilder()
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setColor(config.colors.warning)
            .setTimestamp();
    }

    static createInfoEmbed(title, description = '') {
        return new EmbedBuilder()
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setColor(config.colors.info)
            .setTimestamp();
    }

    static createAchievementEmbed(achievement, user) {
        const rarity = achievement.rarity || 'common';
        const rarityConfig = config.achievements.rarities[rarity] || config.achievements.rarities.common;
        
        return new EmbedBuilder()
            .setTitle(`🏆 Achievement Unlocked!`)
            .setDescription(`**${achievement.name}**\n${achievement.description}`)
            .addFields(
                { name: 'Category', value: achievement.category, inline: true },
                { name: 'Rarity', value: rarity, inline: true },
                { name: 'User', value: `<@${user.id}>`, inline: true }
            )
            .setColor(rarityConfig.color)
            .setTimestamp();
    }

    static createProfileEmbed(user, profile, stats) {
        const embed = new EmbedBuilder()
            .setTitle(`👤 ${user.username}'s Profile`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(config.colors.primary)
            .setTimestamp();

        // Basic info
        embed.addFields(
            { name: 'Level', value: this.calculateLevel(stats.global_xp).toString(), inline: true },
            { name: 'Global XP', value: stats.global_xp.toString(), inline: true },
            { name: 'Currency', value: stats.currency.toString(), inline: true }
        );

        // Profile info
        if (profile) {
            if (profile.bio) {
                embed.addFields({ name: 'Bio', value: profile.bio, inline: false });
            }
            if (profile.equipped_title) {
                embed.addFields({ name: 'Title', value: profile.equipped_title, inline: true });
            }
        }

        // Game stats
        if (stats.games_played > 0) {
            embed.addFields(
                { name: 'Games Played', value: stats.games_played.toString(), inline: true },
                { name: 'Games Won', value: stats.games_won.toString(), inline: true },
                { name: 'Win Rate', value: `${Math.round((stats.games_won / stats.games_played) * 100)}%`, inline: true }
            );
        }

        return embed;
    }

    static createGameEmbed(game, description) {
        return new EmbedBuilder()
            .setTitle(`🎮 ${game.name}`)
            .setDescription(description)
            .addFields(
                { name: 'Category', value: game.category, inline: true },
                { name: 'Duration', value: `${game.duration}s`, inline: true },
                { name: 'Players', value: `${game.minPlayers}-${game.maxPlayers}`, inline: true }
            )
            .setColor(config.colors.primary)
            .setTimestamp();
    }

    static createGuildEmbed(guild, members = []) {
        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${guild.name}`)
            .setDescription(guild.description || 'No description available')
            .addFields(
                { name: 'Level', value: guild.level.toString(), inline: true },
                { name: 'XP', value: guild.xp.toString(), inline: true },
                { name: 'Resources', value: guild.resources.toString(), inline: true },
                { name: 'Members', value: members.length.toString(), inline: true }
            )
            .setColor(config.colors.guild)
            .setTimestamp();

        if (members.length > 0) {
            const memberList = members.slice(0, 10).map(member => 
                `• ${member.username} (${member.role})`
            ).join('\n');
            embed.addFields({ name: 'Members', value: memberList, inline: false });
        }

        return embed;
    }

    static createNeighborhoodEmbed(neighborhood, plots = [], buildings = []) {
        const embed = new EmbedBuilder()
            .setTitle(`🏘️ ${neighborhood.name}`)
            .setDescription(neighborhood.description || 'No description available')
            .addFields(
                { name: 'Defense Level', value: neighborhood.defense_level.toString(), inline: true },
                { name: 'Resources', value: neighborhood.resources.toString(), inline: true },
                { name: 'Plots', value: `${plots.length}/${neighborhood.max_plots}`, inline: true }
            )
            .setColor(config.colors.neighborhood)
            .setTimestamp();

        if (buildings.length > 0) {
            const buildingList = buildings.map(building => 
                `• ${building.building_type} (Level ${building.level})`
            ).join('\n');
            embed.addFields({ name: 'Buildings', value: buildingList, inline: false });
        }

        return embed;
    }

    static createLoreEmbed(lore) {
        const embed = new EmbedBuilder()
            .setTitle(`📚 ${lore.title}`)
            .setDescription(lore.content)
            .addFields(
                { name: 'Category', value: lore.category, inline: true },
                { name: 'Tags', value: lore.tags.join(', ') || 'None', inline: true }
            )
            .setColor(config.colors.lore)
            .setTimestamp();

        if (lore.hidden) {
            embed.setFooter({ text: '🔒 Hidden Lore Entry' });
        }

        return embed;
    }

    static createLeaderboardEmbed(title, entries, type = 'global') {
        const embed = new EmbedBuilder()
            .setTitle(`🏆 ${title}`)
            .setColor(config.colors.primary)
            .setTimestamp();

        if (entries.length === 0) {
            embed.setDescription('No entries found.');
            return embed;
        }

        const leaderboard = entries.map((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return `${medal} ${entry.username} - ${entry.value}`;
        }).join('\n');

        embed.setDescription(leaderboard);
        return embed;
    }

    static calculateLevel(xp) {
        // Simple level calculation: every 100 XP = 1 level
        return Math.floor(xp / 100) + 1;
    }

    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

module.exports = EmbedBuilderUtil;

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../../database/db');
const FactionManager = require('../../utils/factionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faction')
        .setDescription('Manage your faction and character lineage')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current faction and character information')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to view faction info for (optional)')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View your faction switching history')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('switch')
                .setDescription('Switch to a different character (if you have children)')
                .addIntegerOption(option =>
                    option
                        .setName('character_id')
                        .setDescription('ID of the character to switch to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-character')
                .setDescription('Create a new character (your first character)')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for your character')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('faction')
                        .setDescription('Starting faction for your character')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Human', value: 'Human' },
                            { name: 'AI/Machine', value: 'AI' },
                            { name: 'Nature', value: 'Nature' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('resources')
                .setDescription('View your faction-specific resources')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('lineage')
                .setDescription('View your character lineage and family tree')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('achievements')
                .setDescription('View your faction-related achievements')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'view':
                    await handleView(interaction, userId);
                    break;
                case 'history':
                    await handleHistory(interaction, userId);
                    break;
                case 'switch':
                    await handleSwitch(interaction, userId);
                    break;
                case 'create-character':
                    await handleCreateCharacter(interaction, userId);
                    break;
                case 'resources':
                    await handleResources(interaction, userId);
                    break;
                case 'lineage':
                    await handleLineage(interaction, userId);
                    break;
                case 'achievements':
                    await handleAchievements(interaction, userId);
                    break;
            }

        } catch (error) {
            console.error('Faction command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleView(interaction, userId) {
    const targetUser = interaction.options.getUser('user');
    const targetUserId = targetUser ? targetUser.id : userId;

    // Get faction information
    const factionInfo = await FactionManager.getFactionInfo(targetUserId);
    
    if (!factionInfo) {
        return await interaction.reply({
            content: '❌ No faction information found. Use `/faction create-character` to get started.',
            ephemeral: true
        });
    }

    // Get current character
    const currentCharacter = await FactionManager.getCurrentCharacter(targetUserId);
    
    // Get faction resources
    const resources = await FactionManager.getFactionResources(targetUserId);

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ Faction Information${targetUser ? ` - ${targetUser.username}` : ''}`)
        .setColor(getFactionColor(factionInfo.current_faction))
        .setTimestamp();

    let description = `**Current Faction:** ${factionInfo.current_faction}\n`;
    description += `**Faction Purity:** ${(factionInfo.faction_purity * 100).toFixed(1)}%\n`;
    
    if (currentCharacter) {
        description += `**Active Character:** ${currentCharacter.character_name}\n`;
        description += `**Character Age:** ${currentCharacter.age_years} years\n`;
        description += `**Life Stage:** ${currentCharacter.life_stage}\n`;
        description += `**Birth Faction:** ${currentCharacter.birth_faction}\n`;
    }

    embed.setDescription(description);

    // Add faction-specific information
    if (factionInfo.current_faction === 'Human') {
        embed.addFields(
            { name: '🏠 Human Traits', value: '• Natural leadership\n• Community building\n• Traditional values', inline: true },
            { name: '📊 Resources', value: `Food: ${resources.food}\nWater: ${resources.water}`, inline: true }
        );
    } else if (factionInfo.current_faction === 'AI') {
        embed.addFields(
            { name: '🤖 AI Traits', value: '• Logical thinking\n• Efficiency focus\n• Data processing', inline: true },
            { name: '📊 Resources', value: `Energy: ${resources.energy}\nData Fragments: ${resources.data_fragments}`, inline: true }
        );
    } else if (factionInfo.current_faction === 'Nature') {
        embed.addFields(
            { name: '🌿 Nature Traits', value: '• Harmony with environment\n• Growth and renewal\n• Natural cycles', inline: true },
            { name: '📊 Resources', value: `Biomass: ${resources.biomass}\nOrganic Matter: ${resources.organic_matter}`, inline: true }
        );
    }

    // Add universal resources
    embed.addFields(
        { name: '💰 Universal Resources', value: `Currency: ${resources.currency}\nBuilding Materials: ${resources.building_materials}\nRare Artifacts: ${resources.rare_artifacts}`, inline: false }
    );

    await interaction.reply({ embeds: [embed] });
}

async function handleHistory(interaction, userId) {
    const factionHistory = await FactionManager.getFactionHistory(userId);
    
    if (!factionHistory || factionHistory.length === 0) {
        return await interaction.reply({
            content: '❌ No faction switching history found.',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📜 Faction History')
        .setColor('#2B2D31')
        .setTimestamp();

    let historyText = '';
    factionHistory.forEach((switchEvent, index) => {
        const date = new Date(switchEvent.switched_at).toLocaleDateString();
        historyText += `${index + 1}. **${switchEvent.from_faction}** → **${switchEvent.to_faction}**\n`;
        historyText += `   Date: ${date}\n`;
        historyText += `   Reason: ${switchEvent.switch_reason}\n\n`;
    });

    embed.setDescription(historyText);

    await interaction.reply({ embeds: [embed] });
}

async function handleSwitch(interaction, userId) {
    const characterId = interaction.options.getInteger('character_id');

    try {
        const switchResult = await FactionManager.switchToCharacter(userId, characterId);
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 Character Switch Successful!')
            .setDescription(`You have successfully switched to **${switchResult.characterName}**!`)
            .addFields(
                { name: 'New Faction', value: switchResult.newFaction, inline: true },
                { name: 'Character Age', value: `${switchResult.characterAge} years`, inline: true },
                { name: 'Life Stage', value: switchResult.lifeStage, inline: true }
            )
            .setColor(getFactionColor(switchResult.newFaction))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleCreateCharacter(interaction, userId) {
    const characterName = interaction.options.getString('name');
    const faction = interaction.options.getString('faction');

    try {
        const characterResult = await FactionManager.createCharacter(userId, characterName, faction);
        
        const embed = new EmbedBuilder()
            .setTitle('✨ Character Created!')
            .setDescription(`Welcome to Ravnspire, **${characterName}**!`)
            .addFields(
                { name: 'Character ID', value: characterResult.characterId.toString(), inline: true },
                { name: 'Starting Faction', value: faction, inline: true },
                { name: 'Faction Purity', value: '100%', inline: true }
            )
            .setColor(getFactionColor(faction))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleResources(interaction, userId) {
    const resources = await FactionManager.getFactionResources(userId);
    const factionInfo = await FactionManager.getFactionInfo(userId);

    if (!factionInfo) {
        return await interaction.reply({
            content: '❌ No faction information found. Use `/faction create-character` to get started.',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📊 Faction Resources')
        .setColor(getFactionColor(factionInfo.current_faction))
        .setTimestamp();

    let resourceText = '';

    // Faction-specific resources
    if (factionInfo.current_faction === 'Human') {
        resourceText += '**🏠 Human Resources:**\n';
        resourceText += `• Food: ${resources.food}\n`;
        resourceText += `• Water: ${resources.water}\n\n`;
    } else if (factionInfo.current_faction === 'AI') {
        resourceText += '**🤖 AI Resources:**\n';
        resourceText += `• Energy: ${resources.energy}\n`;
        resourceText += `• Data Fragments: ${resources.data_fragments}\n`;
        resourceText += `• Electricity: ${resources.electricity}\n\n`;
    } else if (factionInfo.current_faction === 'Nature') {
        resourceText += '**🌿 Nature Resources:**\n';
        resourceText += `• Biomass: ${resources.biomass}\n`;
        resourceText += `• Organic Matter: ${resources.organic_matter}\n\n`;
    }

    // Universal resources
    resourceText += '**💰 Universal Resources:**\n';
    resourceText += `• Currency: ${resources.currency}\n`;
    resourceText += `• Building Materials: ${resources.building_materials}\n`;
    resourceText += `• Rare Artifacts: ${resources.rare_artifacts}\n`;

    embed.setDescription(resourceText);

    await interaction.reply({ embeds: [embed] });
}

async function handleLineage(interaction, userId) {
    const lineage = await FactionManager.getCharacterLineage(userId);
    
    if (!lineage || lineage.length === 0) {
        return await interaction.reply({
            content: '❌ No character lineage found. Use `/faction create-character` to get started.',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🌳 Character Lineage')
        .setColor('#2B2D31')
        .setTimestamp();

    let lineageText = '';
    lineage.forEach((character, index) => {
        const isActive = character.is_active ? '👑' : '👤';
        const isAlive = character.is_alive ? '❤️' : '💀';
        
        lineageText += `${isActive} ${isAlive} **${character.character_name}**\n`;
        lineageText += `   ID: ${character.id} | Age: ${character.age_years} years\n`;
        lineageText += `   Faction: ${character.current_faction} | Stage: ${character.life_stage}\n`;
        
        if (character.parent_1 || character.parent_2) {
            lineageText += `   Parents: ${character.parent_1 || 'Unknown'}, ${character.parent_2 || 'Unknown'}\n`;
        }
        
        lineageText += '\n';
    });

    embed.setDescription(lineageText);

    await interaction.reply({ embeds: [embed] });
}

async function handleAchievements(interaction, userId) {
    const achievements = await FactionManager.getFactionAchievements(userId);
    
    if (!achievements || achievements.length === 0) {
        return await interaction.reply({
            content: '❌ No faction achievements earned yet. Keep playing to unlock achievements!',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🏆 Faction Achievements')
        .setColor('#FFD700')
        .setTimestamp();

    let achievementText = '';
    achievements.forEach(achievement => {
        const rarityEmoji = {
            'common': '⚪',
            'uncommon': '🟢',
            'rare': '🔵',
            'epic': '🟣',
            'legendary': '🟡'
        };
        
        achievementText += `${rarityEmoji[achievement.rarity] || '⚪'} **${achievement.name}**\n`;
        achievementText += `   ${achievement.description}\n\n`;
    });

    embed.setDescription(achievementText);

    await interaction.reply({ embeds: [embed] });
}

function getFactionColor(faction) {
    switch (faction) {
        case 'Human': return '#FF6B6B';
        case 'AI': return '#4ECDC4';
        case 'Nature': return '#45B7D1';
        default: return '#2B2D31';
    }
}

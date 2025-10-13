const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../../database/db');
const FamilyManager = require('../../utils/familyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('children')
        .setDescription('Manage children and family planning')
        .addSubcommand(subcommand =>
            subcommand
                .setName('attempt')
                .setDescription('Attempt to conceive a child with your spouse')
                .addUserOption(option =>
                    option
                        .setName('partner')
                        .setDescription('Your spouse to attempt conception with')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('method')
                        .setDescription('Conception method')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Natural', value: 'natural' },
                            { name: 'Surrogate', value: 'surrogate' },
                            { name: 'Artificial', value: 'artificial' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('care')
                .setDescription('Provide daily care for a child')
                .addIntegerOption(option =>
                    option
                        .setName('child_id')
                        .setDescription('ID of the child to care for')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('activity')
                        .setDescription('Type of care activity')
                        .setRequired(true)
                        .addChoices(
                            { name: '🍼 Feeding', value: 'feeding' },
                            { name: '🎮 Playing', value: 'playing' },
                            { name: '📚 Teaching', value: 'teaching' },
                            { name: '🏥 Medical Care', value: 'medical' },
                            { name: '🛏️ Bedtime', value: 'bedtime' },
                            { name: '🎨 Creative Activity', value: 'creative' },
                            { name: '🏃 Physical Activity', value: 'physical' },
                            { name: '💬 Conversation', value: 'conversation' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('quality')
                        .setDescription('Quality of care (1-10)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View status of a specific child')
                .addIntegerOption(option =>
                    option
                        .setName('child_id')
                        .setDescription('ID of the child to view')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all your children')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('switch')
                .setDescription('Switch to playing as an adult child (PERMANENT)')
                .addIntegerOption(option =>
                    option
                        .setName('child_id')
                        .setDescription('ID of the child to switch to')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'attempt':
                    await handleAttempt(interaction, userId);
                    break;
                case 'care':
                    await handleCare(interaction, userId);
                    break;
                case 'status':
                    await handleStatus(interaction, userId);
                    break;
                case 'list':
                    await handleList(interaction, userId);
                    break;
                case 'switch':
                    await handleSwitch(interaction, userId);
                    break;
            }

        } catch (error) {
            console.error('Children command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleAttempt(interaction, userId) {
    const partner = interaction.options.getUser('partner');
    const method = interaction.options.getString('method') || 'natural';

    try {
        const conceptionResult = await FamilyManager.attemptConception(userId, partner.id, method);
        
        const embed = new EmbedBuilder()
            .setTitle('👶 Conception Attempt')
            .setDescription(`You and ${partner.username} have attempted to conceive a child!`)
            .addFields(
                { name: 'Method', value: method, inline: true },
                { name: 'Success', value: conceptionResult.success ? '✅ Yes' : '❌ No', inline: true },
                { name: 'Affection Required', value: `${conceptionResult.requiredAffection}`, inline: true }
            )
            .setColor(conceptionResult.success ? '#00FF00' : '#FF0000')
            .setTimestamp();

        if (conceptionResult.success) {
            embed.addFields(
                { name: 'Child ID', value: conceptionResult.childId.toString(), inline: true },
                { name: 'Gestation Period', value: `${conceptionResult.gestationDays} days`, inline: true },
                { name: 'Faction at Birth', value: conceptionResult.factionAtBirth, inline: true }
            );
        } else {
            embed.addFields(
                { name: 'Current Affection', value: `${conceptionResult.currentAffection}`, inline: true },
                { name: 'Tip', value: 'Increase your affection points through interactions!', inline: false }
            );
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleCare(interaction, userId) {
    const childId = interaction.options.getInteger('child_id');
    const activity = interaction.options.getString('activity');
    const quality = interaction.options.getInteger('quality') || 5;

    try {
        const careResult = await FamilyManager.provideChildCare(userId, childId, activity, quality);
        
        const activityEmojis = {
            'feeding': '🍼',
            'playing': '🎮',
            'teaching': '📚',
            'medical': '🏥',
            'bedtime': '🛏️',
            'creative': '🎨',
            'physical': '🏃',
            'conversation': '💬'
        };

        const activityNames = {
            'feeding': 'Feeding',
            'playing': 'Playing',
            'teaching': 'Teaching',
            'medical': 'Medical Care',
            'bedtime': 'Bedtime',
            'creative': 'Creative Activity',
            'physical': 'Physical Activity',
            'conversation': 'Conversation'
        };

        const embed = new EmbedBuilder()
            .setTitle(`${activityEmojis[activity]} Child Care Complete!`)
            .setDescription(`You provided ${activityNames[activity]} for your child!`)
            .addFields(
                { name: 'Child ID', value: childId.toString(), inline: true },
                { name: 'Activity', value: activityNames[activity], inline: true },
                { name: 'Care Quality', value: `${quality}/10`, inline: true },
                { name: 'Development Impact', value: `+${careResult.developmentImpact}`, inline: true },
                { name: 'Care Streak', value: `${careResult.careStreak} days`, inline: true },
                { name: 'Resources Spent', value: `${careResult.resourcesSpent}`, inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleStatus(interaction, userId) {
    const childId = interaction.options.getInteger('child_id');

    try {
        const childStatus = await FamilyManager.getChildStatus(userId, childId);
        
        const embed = new EmbedBuilder()
            .setTitle(`👶 Child Status - ID: ${childId}`)
            .setColor('#FFD700')
            .setTimestamp();

        let description = `**Child ID:** ${childStatus.id}\n`;
        description += `**Status:** ${childStatus.gestationComplete ? 'Born' : 'Gestating'}\n`;
        description += `**Faction at Birth:** ${childStatus.factionAtBirth}\n`;
        description += `**Development Score:** ${childStatus.developmentScore}\n`;
        description += `**Care Streak:** ${childStatus.dailyCareStreak} days\n`;
        description += `**Neglect Count:** ${childStatus.neglectCount}\n`;
        description += `**Risk of Death:** ${childStatus.riskOfDeath}%\n`;

        if (childStatus.gestationComplete) {
            description += `**Birth Date:** <t:${Math.floor(new Date(childStatus.birthDate).getTime() / 1000)}:F>\n`;
            description += `**Intelligence:** ${childStatus.intelligence}\n`;
            description += `**Creativity:** ${childStatus.creativity}\n`;
            description += `**Resilience:** ${childStatus.resilience}\n`;
            description += `**Social Skill:** ${childStatus.socialSkill}\n`;
        } else {
            description += `**Conception Date:** <t:${Math.floor(new Date(childStatus.conceptionDate).getTime() / 1000)}:F>\n`;
            description += `**Gestation Progress:** ${childStatus.gestationProgress}%\n`;
        }

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleList(interaction, userId) {
    try {
        const children = await FamilyManager.getUserChildren(userId);
        
        if (!children || children.length === 0) {
            return await interaction.reply({
                content: '❌ You have no children.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('👶 Your Children')
            .setColor('#FFD700')
            .setTimestamp();

        let description = '';
        children.forEach((child, index) => {
            const status = child.gestationComplete ? 'Born' : 'Gestating';
            const statusEmoji = child.gestationComplete ? '👶' : '🤰';
            
            description += `**${index + 1}. ${statusEmoji} Child ID: ${child.id}**\n`;
            description += `Status: ${status}\n`;
            description += `Faction: ${child.factionAtBirth}\n`;
            description += `Development: ${child.developmentScore}\n`;
            description += `Care Streak: ${child.dailyCareStreak} days\n`;
            description += `Risk: ${child.riskOfDeath}%\n\n`;
        });

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleSwitch(interaction, userId) {
    const childId = interaction.options.getInteger('child_id');

    try {
        const switchResult = await FamilyManager.switchToChild(userId, childId);
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 Character Switch Complete!')
            .setDescription(`You are now playing as your child character!`)
            .addFields(
                { name: 'Child ID', value: childId.toString(), inline: true },
                { name: 'Character Name', value: switchResult.characterName, inline: true },
                { name: 'Faction', value: switchResult.faction, inline: true },
                { name: 'Age', value: `${switchResult.age} years`, inline: true },
                { name: 'Life Stage', value: switchResult.lifeStage, inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        embed.addFields({
            name: '⚠️ Important',
            value: 'This switch is PERMANENT. You cannot switch back to your previous character.',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        await interaction.reply({
            content: `❌ ${error.message}`,
            ephemeral: true
        });
    }
}

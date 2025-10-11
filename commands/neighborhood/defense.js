const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../utils/buttonBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('neighborhood-defense')
        .setDescription('Manage neighborhood defense')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View neighborhood defense status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('contribute')
                .setDescription('Contribute to neighborhood defense')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of resources to contribute')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('attack')
                .setDescription('Attack another neighborhood')
                .addStringOption(option =>
                    option.setName('target')
                        .setDescription('Target neighborhood name')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Attack type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Raid', value: 'raid' },
                            { name: 'Siege', value: 'siege' },
                            { name: 'Sabotage', value: 'sabotage' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View defense history')),
    cooldown: 10,
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);

            if (subcommand === 'status') {
                await this.viewDefenseStatus(interaction);
            } else if (subcommand === 'contribute') {
                await this.contributeDefense(interaction);
            } else if (subcommand === 'attack') {
                await this.attackNeighborhood(interaction);
            } else if (subcommand === 'history') {
                await this.viewDefenseHistory(interaction);
            }

        } catch (error) {
            console.error('Error in neighborhood-defense command:', error);
            await interaction.reply({
                content: 'There was an error processing your request.',
                ephemeral: true
            });
        }
    },

    async viewDefenseStatus(interaction) {
        const userId = interaction.user.id;

        // Get user's neighborhood
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to view defense status.',
                ephemeral: true
            });
        }

        const neighborhoodQuery = `
            SELECT n.* FROM neighborhoods n
            JOIN neighborhood_plots np ON n.id = np.neighborhood_id
            WHERE np.guild_id = $1
        `;
        const neighborhoodResult = await Database.query(neighborhoodQuery, [userGuild.id]);
        const neighborhood = neighborhoodResult.rows[0];

        if (!neighborhood) {
            return await interaction.reply({
                content: 'Your guild is not in a neighborhood.',
                ephemeral: true
            });
        }

        // Get defense buildings
        const buildingsQuery = `
            SELECT * FROM neighborhood_buildings
            WHERE neighborhood_id = $1 AND building_type = 'defense_tower'
        `;
        const buildingsResult = await Database.query(buildingsQuery, [neighborhood.id]);
        const defenseBuildings = buildingsResult.rows;

        // Calculate total defense strength
        let totalDefense = neighborhood.defense_level * 100; // Base defense
        defenseBuildings.forEach(building => {
            totalDefense += building.level * 50; // Each defense tower level adds 50 defense
        });

        // Get recent attacks
        const recentAttacksQuery = `
            SELECT * FROM neighborhood_defense_logs
            WHERE neighborhood_id = $1
            ORDER BY timestamp DESC
            LIMIT 5
        `;
        const recentAttacksResult = await Database.query(recentAttacksQuery, [neighborhood.id]);
        const recentAttacks = recentAttacksResult.rows;

        const embed = EmbedBuilderUtil.createBaseEmbed(
            `🛡️ Defense Status - ${neighborhood.name}`,
            `Protect your neighborhood from attacks!`
        );

        embed.addFields(
            { name: 'Defense Level', value: neighborhood.defense_level.toString(), inline: true },
            { name: 'Total Defense', value: totalDefense.toString(), inline: true },
            { name: 'Defense Towers', value: defenseBuildings.length.toString(), inline: true }
        );

        if (defenseBuildings.length > 0) {
            const buildingList = defenseBuildings.map(building => 
                `• Defense Tower Level ${building.level} (${building.level * 50} defense)`
            ).join('\n');

            embed.addFields({
                name: 'Defense Buildings',
                value: buildingList,
                inline: false
            });
        }

        if (recentAttacks.length > 0) {
            const attackList = recentAttacks.map(attack => {
                const attackTime = new Date(attack.timestamp);
                const result = attack.result === 'defended' ? '✅' : 
                             attack.result === 'breached' ? '❌' : '⚠️';
                return `${result} ${attack.attack_type} - <t:${Math.floor(attackTime.getTime() / 1000)}:R>`;
            }).join('\n');

            embed.addFields({
                name: 'Recent Attacks',
                value: attackList,
                inline: false
            });
        }

        embed.addFields({
            name: 'Defense Tips',
            value: '• Contribute resources to build defense towers\n• Higher level towers provide more defense\n• Coordinate with other guilds for better protection\n• Monitor attack history to identify threats',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async contributeDefense(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');

        // Get user's guild and neighborhood
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to contribute to defense.',
                ephemeral: true
            });
        }

        const neighborhoodQuery = `
            SELECT n.* FROM neighborhoods n
            JOIN neighborhood_plots np ON n.id = np.neighborhood_id
            WHERE np.guild_id = $1
        `;
        const neighborhoodResult = await Database.query(neighborhoodQuery, [userGuild.id]);
        const neighborhood = neighborhoodResult.rows[0];

        if (!neighborhood) {
            return await interaction.reply({
                content: 'Your guild is not in a neighborhood.',
                ephemeral: true
            });
        }

        // Check if user has enough resources
        const user = await Database.getUser(userId);
        if (user.currency < amount) {
            return await interaction.reply({
                content: `You don't have enough currency. You have ${user.currency} currency.`,
                ephemeral: true
            });
        }

        // Deduct currency from user
        await Database.updateUserCurrency(userId, -amount);

        // Add to neighborhood resources
        const updateNeighborhoodQuery = `
            UPDATE neighborhoods 
            SET resources = resources + $1
            WHERE id = $2
        `;
        await Database.query(updateNeighborhoodQuery, [amount, neighborhood.id]);

        // Log contribution
        const contributionQuery = `
            INSERT INTO neighborhood_contributions (
                neighborhood_id, guild_id, amount, contribution_type
            ) VALUES ($1, $2, $3, 'defense')
        `;
        await Database.query(contributionQuery, [neighborhood.id, userGuild.id, amount]);

        const embed = EmbedBuilderUtil.createSuccessEmbed(
            'Defense Contribution!',
            `You have contributed ${amount} resources to neighborhood defense.`
        );

        embed.addFields(
            { name: 'Contribution', value: `${amount} resources`, inline: true },
            { name: 'Neighborhood', value: neighborhood.name, inline: true },
            { name: 'Guild', value: userGuild.name, inline: true }
        );

        embed.addFields({
            name: 'Defense Impact',
            value: `Your contribution helps strengthen the neighborhood's defenses against attacks. Consider building defense towers for permanent protection!`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async attackNeighborhood(interaction) {
        const userId = interaction.user.id;
        const targetName = interaction.options.getString('target');
        const attackType = interaction.options.getString('type');

        // Get user's guild and neighborhood
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to attack neighborhoods.',
                ephemeral: true
            });
        }

        // Check if user has permission (owner or officer)
        if (userGuild.role !== 'owner' && userGuild.role !== 'officer') {
            return await interaction.reply({
                content: 'Only guild owners and officers can initiate attacks.',
                ephemeral: true
            });
        }

        const neighborhoodQuery = `
            SELECT n.* FROM neighborhoods n
            JOIN neighborhood_plots np ON n.id = np.neighborhood_id
            WHERE np.guild_id = $1
        `;
        const neighborhoodResult = await Database.query(neighborhoodQuery, [userGuild.id]);
        const attackerNeighborhood = neighborhoodResult.rows[0];

        if (!attackerNeighborhood) {
            return await interaction.reply({
                content: 'Your guild is not in a neighborhood.',
                ephemeral: true
            });
        }

        // Get target neighborhood
        const targetQuery = 'SELECT * FROM neighborhoods WHERE name = $1';
        const targetResult = await Database.query(targetQuery, [targetName]);
        const targetNeighborhood = targetResult.rows[0];

        if (!targetNeighborhood) {
            return await interaction.reply({
                content: 'Target neighborhood not found.',
                ephemeral: true
            });
        }

        if (targetNeighborhood.id === attackerNeighborhood.id) {
            return await interaction.reply({
                content: 'You cannot attack your own neighborhood.',
                ephemeral: true
            });
        }

        // Calculate attack and defense strengths
        const attackStrength = this.calculateAttackStrength(attackerNeighborhood, attackType);
        const defenseStrength = this.calculateDefenseStrength(targetNeighborhood);

        // Simulate attack
        const attackResult = this.simulateAttack(attackStrength, defenseStrength, attackType);

        // Log attack
        const attackLogQuery = `
            INSERT INTO neighborhood_defense_logs (
                neighborhood_id, attack_type, attacker_info, defense_strength,
                attack_strength, result, damage_taken, resources_lost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await Database.query(attackLogQuery, [
            targetNeighborhood.id,
            attackType,
            JSON.stringify({ guild: userGuild.name, neighborhood: attackerNeighborhood.name }),
            defenseStrength,
            attackStrength,
            attackResult.result,
            attackResult.damage,
            attackResult.resourcesLost
        ]);

        // Apply attack consequences
        if (attackResult.result !== 'defended') {
            const updateTargetQuery = `
                UPDATE neighborhoods 
                SET resources = GREATEST(0, resources - $1),
                    defense_level = GREATEST(1, defense_level - $2)
                WHERE id = $3
            `;
            await Database.query(updateTargetQuery, [
                attackResult.resourcesLost,
                attackResult.damage,
                targetNeighborhood.id
            ]);
        }

        const embed = EmbedBuilderUtil.createBaseEmbed(
            `⚔️ Attack Result - ${attackType.charAt(0).toUpperCase() + attackType.slice(1)}`,
            `Attack on ${targetName} completed!`
        );

        embed.addFields(
            { name: 'Attacker', value: `${userGuild.name} (${attackerNeighborhood.name})`, inline: true },
            { name: 'Target', value: targetName, inline: true },
            { name: 'Attack Type', value: attackType.charAt(0).toUpperCase() + attackType.slice(1), inline: true },
            { name: 'Attack Strength', value: attackStrength.toString(), inline: true },
            { name: 'Defense Strength', value: defenseStrength.toString(), inline: true },
            { name: 'Result', value: attackResult.result.charAt(0).toUpperCase() + attackResult.result.slice(1), inline: true }
        );

        if (attackResult.result !== 'defended') {
            embed.addFields(
                { name: 'Damage Dealt', value: attackResult.damage.toString(), inline: true },
                { name: 'Resources Stolen', value: attackResult.resourcesLost.toString(), inline: true }
            );
        }

        await interaction.reply({ embeds: [embed] });
    },

    async viewDefenseHistory(interaction) {
        const userId = interaction.user.id;

        // Get user's neighborhood
        const userGuild = await Database.getUserGuild(userId);
        if (!userGuild) {
            return await interaction.reply({
                content: 'You must be a member of a guild to view defense history.',
                ephemeral: true
            });
        }

        const neighborhoodQuery = `
            SELECT n.* FROM neighborhoods n
            JOIN neighborhood_plots np ON n.id = np.neighborhood_id
            WHERE np.guild_id = $1
        `;
        const neighborhoodResult = await Database.query(neighborhoodQuery, [userGuild.id]);
        const neighborhood = neighborhoodResult.rows[0];

        if (!neighborhood) {
            return await interaction.reply({
                content: 'Your guild is not in a neighborhood.',
                ephemeral: true
            });
        }

        // Get defense history
        const historyQuery = `
            SELECT * FROM neighborhood_defense_logs
            WHERE neighborhood_id = $1
            ORDER BY timestamp DESC
            LIMIT 10
        `;
        const historyResult = await Database.query(historyQuery, [neighborhood.id]);
        const history = historyResult.rows;

        if (history.length === 0) {
            const embed = EmbedBuilderUtil.createInfoEmbed(
                'No Defense History',
                `No attacks have been recorded for **${neighborhood.name}**.`
            );
            return await interaction.reply({ embeds: [embed] });
        }

        const embed = EmbedBuilderUtil.createBaseEmbed(
            `🛡️ Defense History - ${neighborhood.name}`,
            `Record of attacks and defenses`
        );

        history.forEach(attack => {
            const attackTime = new Date(attack.timestamp);
            const attackerInfo = JSON.parse(attack.attacker_info);
            const result = attack.result === 'defended' ? '✅ Defended' : 
                         attack.result === 'breached' ? '❌ Breached' : '⚠️ Partial';
            
            embed.addFields({
                name: `${attack.attack_type.charAt(0).toUpperCase() + attack.attack_type.slice(1)} - <t:${Math.floor(attackTime.getTime() / 1000)}:R>`,
                value: `**Attacker:** ${attackerInfo.guild} (${attackerInfo.neighborhood})\n**Result:** ${result}\n**Attack:** ${attack.attack_strength} vs **Defense:** ${attack.defense_strength}${attack.damage_taken > 0 ? `\n**Damage:** ${attack.damage_taken}` : ''}${attack.resources_lost > 0 ? `\n**Resources Lost:** ${attack.resources_lost}` : ''}`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    },

    calculateAttackStrength(neighborhood, attackType) {
        let baseStrength = neighborhood.defense_level * 50; // Use defense level as base
        
        const attackMultipliers = {
            raid: 1.2,      // Quick, high damage
            siege: 0.8,     // Slow, sustained damage
            sabotage: 1.5   // High damage, but risky
        };
        
        return Math.floor(baseStrength * attackMultipliers[attackType]);
    },

    calculateDefenseStrength(neighborhood) {
        // Get defense buildings
        const buildingsQuery = `
            SELECT * FROM neighborhood_buildings
            WHERE neighborhood_id = $1 AND building_type = 'defense_tower'
        `;
        // This would need to be awaited in a real implementation
        // For now, we'll use a simplified calculation
        return neighborhood.defense_level * 100;
    },

    simulateAttack(attackStrength, defenseStrength, attackType) {
        const totalStrength = attackStrength + defenseStrength;
        const attackChance = attackStrength / totalStrength;
        
        const random = Math.random();
        
        if (random < attackChance * 0.3) {
            // Complete breach
            return {
                result: 'breached',
                damage: Math.floor(attackStrength / 100),
                resourcesLost: Math.floor(attackStrength / 50)
            };
        } else if (random < attackChance * 0.7) {
            // Partial success
            return {
                result: 'partial',
                damage: Math.floor(attackStrength / 200),
                resourcesLost: Math.floor(attackStrength / 100)
            };
        } else {
            // Defended
            return {
                result: 'defended',
                damage: 0,
                resourcesLost: 0
            };
        }
    }
};

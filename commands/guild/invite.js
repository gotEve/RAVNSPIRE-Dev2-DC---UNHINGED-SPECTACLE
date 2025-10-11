const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database/db');
const EmbedBuilderUtil = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild-invite')
        .setDescription('Invite a user to your guild')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to invite')
                .setRequired(true)),
    cooldown: 10,
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const targetUser = interaction.options.getUser('user');

            // Ensure user exists in database
            await Database.createUser(userId, interaction.user.username);
            await Database.createUser(targetUser.id, targetUser.username);

            // Check if user is in a guild
            const userGuild = await Database.getUserGuild(userId);
            if (!userGuild) {
                return await interaction.reply({
                    content: 'You are not a member of any guild. Create or join a guild first.',
                    ephemeral: true
                });
            }

            // Check if user has permission to invite (owner or officer)
            if (userGuild.role !== 'owner' && userGuild.role !== 'officer') {
                return await interaction.reply({
                    content: 'You do not have permission to invite members. Only owners and officers can invite members.',
                    ephemeral: true
                });
            }

            // Check if target user is already in a guild
            const targetGuild = await Database.getUserGuild(targetUser.id);
            if (targetGuild) {
                return await interaction.reply({
                    content: `${targetUser.username} is already a member of **${targetGuild.name}**.`,
                    ephemeral: true
                });
            }

            // Check guild member limit
            const members = await Database.getGuildMembers(userGuild.id);
            const maxMembers = 50; // From config
            if (members.length >= maxMembers) {
                return await interaction.reply({
                    content: `Your guild has reached the maximum member limit of ${maxMembers}.`,
                    ephemeral: true
                });
            }

            // Add the user to the guild
            await Database.addGuildMember(userGuild.id, targetUser.id, 'member');

            const embed = EmbedBuilderUtil.createSuccessEmbed(
                'Member Invited!',
                `Successfully invited ${targetUser.username} to **${userGuild.name}**!`
            );

            embed.addFields(
                { name: 'New Member', value: `<@${targetUser.id}>`, inline: true },
                { name: 'Guild', value: userGuild.name, inline: true },
                { name: 'Role', value: 'Member', inline: true }
            );

            embed.addFields({
                name: 'Welcome Message',
                value: `Welcome to the guild, ${targetUser.username}! Use \`/guild info\` to learn more about your new guild.`,
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

            // Try to send a DM to the invited user
            try {
                const dmEmbed = EmbedBuilderUtil.createInfoEmbed(
                    'Guild Invitation',
                    `You have been invited to join **${userGuild.name}**!`
                );

                dmEmbed.addFields(
                    { name: 'Guild', value: userGuild.name, inline: true },
                    { name: 'Invited by', value: `<@${userId}>`, inline: true },
                    { name: 'Description', value: userGuild.description || 'No description available', inline: false }
                );

                dmEmbed.addFields({
                    name: 'Next Steps',
                    value: '• Use `/guild info` to view guild details\n• Use `/guild leave` if you want to leave\n• Start participating in guild activities!',
                    inline: false
                });

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log(`Could not send DM to ${targetUser.username}:`, dmError.message);
            }

        } catch (error) {
            console.error('Error in guild-invite command:', error);
            await interaction.reply({
                content: 'There was an error inviting the user to your guild.',
                ephemeral: true
            });
        }
    },
};

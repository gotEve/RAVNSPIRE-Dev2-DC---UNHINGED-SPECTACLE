const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDescription("Provides information about the user.")
        .addUserOption(option =>
            option.setName("target")
                .setDescription("The user to get information about")
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser("target") || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        
        const embed = new EmbedBuilder()
            .setTitle(`User Info: ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: "Username", value: user.username, inline: true },
                { name: "ID", value: user.id, inline: true },
                { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setColor(0x0099FF)
            .setTimestamp();

        if (member) {
            embed.addFields(
                { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: "Roles", value: member.roles.cache.size.toString(), inline: true }
            );
        }

        await interaction.reply({ embeds: [embed] });
    },
};

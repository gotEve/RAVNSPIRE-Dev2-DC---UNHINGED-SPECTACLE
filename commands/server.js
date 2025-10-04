const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Provides information about the server."),
    async execute(interaction) {
        const guild = interaction.guild;
        
        const embed = new EmbedBuilder()
            .setTitle(`Server Info: ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: "Members", value: guild.memberCount.toString(), inline: true },
                { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: "Owner", value: `<@${guild.ownerId}>`, inline: true }
            )
            .setColor(0x0099FF)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

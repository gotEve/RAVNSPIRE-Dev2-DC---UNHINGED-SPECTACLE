const { EmbedBuilder } = require('discord.js');
const Database = require('../../database/db');

module.exports = {
    name: 'guild-district-buttons',
    
    async handleButton(interaction) {
        const customId = interaction.customId;

        if (customId.startsWith('sell_plot_confirm_')) {
            await handlePlotSaleConfirm(interaction);
        } else if (customId.startsWith('sell_plot_cancel_')) {
            await handlePlotSaleCancel(interaction);
        }
    }
};

async function handlePlotSaleConfirm(interaction) {
    const plotId = parseInt(interaction.customId.split('_')[3]);
    const userId = interaction.user.id;

    try {
        // Get the plot and verify ownership
        const plot = await Database.query(
            'SELECT gdp.*, g.name as guild_name FROM guild_district_plots gdp JOIN guilds g ON gdp.guild_id = g.id WHERE gdp.id = $1',
            [plotId]
        );

        if (plot.rows.length === 0) {
            return await interaction.reply({
                content: '❌ Plot not found.',
                ephemeral: true
            });
        }

        const plotData = plot.rows[0];

        // Check if user has permission
        const memberRole = await Database.query(
            'SELECT role FROM guild_members WHERE guild_id = $1 AND discord_id = $2',
            [plotData.guild_id, userId]
        );

        if (memberRole.rows.length === 0 || !['owner', 'officer'].includes(memberRole.rows[0].role)) {
            return await interaction.reply({
                content: '❌ You don\'t have permission to sell this plot.',
                ephemeral: true
            });
        }

        // Calculate sell value
        const sellValue = Math.floor(plotData.current_value * 0.7);

        // Sell the plot (set guild_id to null)
        await Database.query(
            'UPDATE guild_district_plots SET guild_id = NULL, building_type = NULL, building_level = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [plotId]
        );

        // Log the transaction
        await Database.query(
            'INSERT INTO guild_district_transactions (guild_id, transaction_type, plot_id, amount, description, processed_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [plotData.guild_id, 'plot_sale', plotId, sellValue, `Sold plot #${plotData.plot_number}`, userId]
        );

        const embed = new EmbedBuilder()
            .setTitle('🏪 Plot Sold Successfully!')
            .setDescription(`**Plot #${plotData.plot_number}** has been sold for ${sellValue.toLocaleString()} currency.\n\n` +
                           `The plot is now available for other guilds to purchase.`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

    } catch (error) {
        console.error('Plot sale confirmation error:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing the sale.',
            ephemeral: true
        });
    }
}

async function handlePlotSaleCancel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('❌ Sale Cancelled')
        .setDescription('The plot sale has been cancelled.')
        .setColor('#FF0000')
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
}

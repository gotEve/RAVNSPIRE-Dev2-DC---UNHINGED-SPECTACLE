// Load environment variables
require('dotenv').config();

// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Import configuration and database
const config = require('./config/config');
const Database = require('./database/db');

// Get token from environment variable
const token = config.bot.token;

if (!token) {
    console.error('DISCORD_TOKEN environment variable is required!');
    console.error('Please create a .env file with your bot token.');
    process.exit(1);
}

// Create a new client instance with necessary intents
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// Create collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Recursively load commands from subdirectories
function loadCommands(dir) {
    const commandsPath = path.join(__dirname, dir);
    if (!fs.existsSync(commandsPath)) return;
    
    const commandFiles = fs.readdirSync(commandsPath, { withFileTypes: true });
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file.name);
        
        if (file.isDirectory()) {
            // Recursively load from subdirectories
            loadCommands(path.join(dir, file.name));
        } else if (file.name.endsWith('.js')) {
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`Loaded command: ${command.data.name}`);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

// Load all commands
loadCommands('commands');

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    
    // Test database connection
    try {
        await Database.query('SELECT NOW()');
        console.log('Database connection established');
    } catch (error) {
        console.error('Database connection failed:', error);
    }
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    // Cooldown handling
    const { cooldowns } = client;

    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const defaultCooldownDuration = 3;
    const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
            const expiredTimestamp = Math.round(expirationTime / 1000);
            return interaction.reply({ 
                content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, 
                ephemeral: true 
            });
        }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // Execute command
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = {
            content: 'There was an error while executing this command!',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Handle button interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    // Handle help system navigation
    if (interaction.customId.startsWith('help_')) {
        const section = interaction.customId.replace('help_', '');
        // This will be implemented in the help system
        await interaction.reply({ content: `Help section: ${section}`, ephemeral: true });
        return;
    }

    // Handle game interactions
    if (interaction.customId.startsWith('game_')) {
        // This will be implemented in the games system
        await interaction.reply({ content: 'Game interaction handled', ephemeral: true });
        return;
    }
});

// Handle select menu interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    // Handle help system submenu navigation
    if (interaction.customId.startsWith('help_select_')) {
        const section = interaction.customId.replace('help_select_', '');
        const value = interaction.values[0];
        // This will be implemented in the help system
        await interaction.reply({ content: `Help: ${section} - ${value}`, ephemeral: true });
        return;
    }
});

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await Database.close();
    client.destroy();
    process.exit(0);
});

// Log in to Discord with your client's token
client.login(token);
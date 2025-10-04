// Load environment variables
require("dotenv").config();

// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

// Get token from environment variable
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error("DISCORD_TOKEN environment variable is required!");
    console.error("Please create a .env file with your bot token.");
    process.exit(1);
}

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Create a collection to store commands
client.commands = new Collection();

// Load command files
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true });
        } else {
            await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
        }
    }
});

// Log in to Discord with your client's token
client.login(token);

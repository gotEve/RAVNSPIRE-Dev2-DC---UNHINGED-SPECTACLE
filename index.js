// Load environment variables
require('dotenv').config();

// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');

// Get token from environment variable
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('DISCORD_TOKEN environment variable is required!');
    console.error('Please create a .env file with your bot token.');
    process.exit(1);
}

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);

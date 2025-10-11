// Deployment script for hosting platforms
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

// Load commands recursively
function loadCommands(dir, commands = new Collection()) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            loadCommands(filePath, commands);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.set(command.data.name, command);
            }
        }
    }
    
    return commands;
}

async function deployCommands() {
    const client = new Client({ 
        intents: [GatewayIntentBits.Guilds] 
    });
    
    try {
        console.log('🚀 Starting command deployment...');
        
        await client.login(process.env.DISCORD_TOKEN);
        console.log('✅ Logged in to Discord');
        
        // Load all commands
        const commands = loadCommands('./commands');
        console.log(`📋 Loaded ${commands.size} commands`);
        
        // Deploy commands
        const commandData = Array.from(commands.values()).map(command => command.data.toJSON());
        
        if (process.env.GUILD_ID) {
            // Guild-specific deployment (faster for development)
            console.log('🎯 Deploying to guild...');
            await client.application.commands.set(commandData, process.env.GUILD_ID);
            console.log('✅ Guild commands deployed');
        } else {
            // Global deployment (slower, but works everywhere)
            console.log('🌍 Deploying globally...');
            await client.application.commands.set(commandData);
            console.log('✅ Global commands deployed');
        }
        
        console.log('🎉 Deployment completed successfully!');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    } finally {
        client.destroy();
    }
}

// Run deployment
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };

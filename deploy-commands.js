﻿const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

const commands = [];

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
        } else if (file.name.endsWith(".js")) {
            const command = require(filePath);
            if ("data" in command && "execute" in command) {
                commands.push(command.data.toJSON());
                console.log(`Loaded command: ${command.data.name}`);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

// Load all commands
loadCommands("commands");

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Register commands globally (takes up to 1 hour to propagate)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();

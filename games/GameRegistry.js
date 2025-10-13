// Game Registry - Automatically discovers and manages available games
const fs = require('fs');
const path = require('path');

class GameRegistry {
    constructor() {
        this.games = new Map();
        this.loadGames();
    }

    // Load all available games from the games/types directory
    loadGames() {
        const gamesDir = path.join(__dirname, 'types');
        
        if (!fs.existsSync(gamesDir)) {
            console.warn('Games directory not found:', gamesDir);
            return;
        }

        const gameDirs = fs.readdirSync(gamesDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const gameDir of gameDirs) {
            try {
                const gamePath = path.join(gamesDir, gameDir, `${gameDir.charAt(0).toUpperCase() + gameDir.slice(1)}Game.js`);
                
                if (fs.existsSync(gamePath)) {
                    const GameClass = require(gamePath);
                    const gameInstance = new GameClass();
                    
                    // Get game metadata
                    const metadata = gameInstance.getMetadata();
                    
                    this.games.set(metadata.id, {
                        id: metadata.id,
                        name: metadata.name,
                        description: metadata.description,
                        category: metadata.category,
                        minPlayers: metadata.minPlayers,
                        maxPlayers: metadata.maxPlayers,
                        duration: metadata.duration,
                        class: GameClass,
                        instance: gameInstance
                    });
                    
                    console.log(`Loaded game: ${metadata.name} (${metadata.id})`);
                }
            } catch (error) {
                console.error(`Failed to load game from ${gameDir}:`, error);
            }
        }
    }

    // Get all available games
    getAllGames() {
        return Array.from(this.games.values());
    }

    // Get a specific game by ID
    getGame(gameId) {
        return this.games.get(gameId);
    }

    // Get game class for instantiation
    getGameClass(gameId) {
        const game = this.games.get(gameId);
        return game ? game.class : null;
    }

    // Check if a game exists
    hasGame(gameId) {
        return this.games.has(gameId);
    }

    // Get games formatted for Discord choices
    getDiscordChoices() {
        return this.getAllGames().map(game => ({
            name: game.name,
            value: game.id
        }));
    }

    // Reload games (useful for development)
    reload() {
        this.games.clear();
        this.loadGames();
    }
}

// Create singleton instance
const gameRegistry = new GameRegistry();

module.exports = gameRegistry;

// Tic Tac Toe game implementation
const GameBase = require('../../engine/GameBase');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedBuilderUtil = require('../../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../../utils/buttonBuilder');

class TicTacToeGame extends GameBase {
    constructor() {
        super('tictactoe', {
            name: 'Tic Tac Toe',
            description: 'The classic paper-and-pencil game for two players',
            category: 'strategy',
            minPlayers: 1,
            maxPlayers: 2,
            duration: 300, // 5 minutes
            gridSize: 3,
            rewards: {
                xp: 50,
                currency: 25,
                bonus: {
                    win: { xp: 75, currency: 35 },
                    draw: { xp: 25, currency: 15 }
                }
            }
        });
        
        this.grid = [];
        this.players = [];
        this.currentPlayer = 0;
        this.gamePhase = 'waiting'; // waiting, playing, finished
        this.winner = null;
        this.moves = 0;
        this.maxMoves = 9;
        
        this.initializeGrid();
    }

    async initialize(userId, options = {}) {
        this.players = [userId];
        this.currentPlayer = 0;
        this.gamePhase = 'waiting';
        this.winner = null;
        this.moves = 0;
        this.initializeGrid();
        
        // If it's a single player game, add AI opponent
        if (options.singlePlayer) {
            this.players.push('AI');
            this.gamePhase = 'playing';
        }
    }

    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < this.config.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.config.gridSize; x++) {
                this.grid[y][x] = null;
            }
        }
    }

    async addPlayer(userId) {
        if (this.players.length >= this.config.maxPlayers) {
            throw new Error('Game is full');
        }
        
        if (this.players.includes(userId)) {
            throw new Error('Player already in game');
        }
        
        this.players.push(userId);
        
        if (this.players.length === this.config.maxPlayers) {
            this.gamePhase = 'playing';
        }
        
        return this.players.length;
    }

    async getGameState() {
        if (this.gamePhase === 'waiting') {
            return this.getWaitingState();
        } else if (this.gamePhase === 'playing') {
            return this.getPlayingState();
        } else {
            return this.getFinishedState();
        }
    }

    getWaitingState() {
        const embed = EmbedBuilderUtil.createBaseEmbed(
            '🎮 Tic Tac Toe - Waiting for Players',
            `Waiting for players to join... (${this.players.length}/${this.config.maxPlayers})`
        );

        embed.addFields({
            name: 'Current Players',
            value: this.players.map((playerId, index) => 
                `${index + 1}. ${playerId === 'AI' ? '🤖 AI' : `<@${playerId}>`}`
            ).join('\n'),
            inline: false
        });

        embed.addFields({
            name: 'How to Join',
            value: 'Use the "Join Game" button below to join this match!',
            inline: false
        });

        const joinButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tictactoe_join')
                    .setLabel('Join Game')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🤝')
            );

        return {
            embed,
            components: [joinButton]
        };
    }

    getPlayingState() {
        const currentPlayerName = this.players[this.currentPlayer] === 'AI' ? 
            '🤖 AI' : `<@${this.players[this.currentPlayer]}>`;
        
        const embed = EmbedBuilderUtil.createBaseEmbed(
            '🎮 Tic Tac Toe - Game in Progress',
            `Current turn: ${currentPlayerName}`
        );

        // Create grid display
        const gridDisplay = this.createGridDisplay();
        embed.addFields({
            name: 'Game Board',
            value: gridDisplay,
            inline: false
        });

        embed.addFields(
            { name: 'Moves', value: `${this.moves}/${this.maxMoves}`, inline: true },
            { name: 'Current Player', value: currentPlayerName, inline: true }
        );

        // Add player info
        const playerInfo = this.players.map((playerId, index) => {
            const symbol = index === 0 ? '❌' : '⭕';
            const name = playerId === 'AI' ? '🤖 AI' : `<@${playerId}>`;
            return `${symbol} ${name}`;
        }).join('\n');

        embed.addFields({
            name: 'Players',
            value: playerInfo,
            inline: false
        });

        // Create game board buttons
        const gameBoard = this.createGameBoard();

        return {
            embed,
            components: gameBoard
        };
    }

    getFinishedState() {
        const embed = EmbedBuilderUtil.createBaseEmbed(
            '🎮 Tic Tac Toe - Game Finished',
            this.getGameResultMessage()
        );

        // Create final grid display
        const gridDisplay = this.createGridDisplay();
        embed.addFields({
            name: 'Final Board',
            value: gridDisplay,
            inline: false
        });

        embed.addFields(
            { name: 'Total Moves', value: this.moves.toString(), inline: true },
            { name: 'Winner', value: this.getWinnerDisplay(), inline: true }
        );

        const newGameButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tictactoe_newgame')
                    .setLabel('New Game')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
            );

        return {
            embed,
            components: [newGameButton]
        };
    }

    createGridDisplay() {
        const symbols = ['❌', '⭕'];
        let display = '';
        
        for (let y = 0; y < this.config.gridSize; y++) {
            for (let x = 0; x < this.config.gridSize; x++) {
                if (this.grid[y][x] === null) {
                    display += '⬜';
                } else {
                    display += symbols[this.grid[y][x]];
                }
            }
            display += '\n';
        }
        
        return display;
    }

    createGameBoard() {
        const rows = [];
        
        for (let y = 0; y < this.config.gridSize; y++) {
            const row = new ActionRowBuilder();
            
            for (let x = 0; x < this.config.gridSize; x++) {
                const button = new ButtonBuilder()
                    .setCustomId(`tictactoe_${y}_${x}`)
                    .setLabel(this.getCellLabel(y, x))
                    .setStyle(this.getCellStyle(y, x));
                
                if (this.grid[y][x] !== null) {
                    button.setDisabled(true);
                }
                
                row.addComponents(button);
            }
            
            rows.push(row);
        }
        
        return rows;
    }

    getCellLabel(y, x) {
        if (this.grid[y][x] === null) {
            return '⬜';
        }
        const symbols = ['❌', '⭕'];
        return symbols[this.grid[y][x]];
    }

    getCellStyle(y, x) {
        if (this.grid[y][x] === null) {
            return ButtonStyle.Secondary;
        }
        return this.grid[y][x] === 0 ? ButtonStyle.Danger : ButtonStyle.Primary;
    }

    async processInput(input) {
        if (this.gamePhase !== 'playing') {
            return { error: 'Game is not in playing state' };
        }

        if (input === 'tictactoe_join') {
            return { error: 'Cannot join during gameplay' };
        }

        if (input === 'tictactoe_newgame') {
            await this.initialize(this.players[0], { singlePlayer: this.players.includes('AI') });
            return await this.getGameState();
        }

        // Handle AI turn
        if (this.players[this.currentPlayer] === 'AI') {
            return await this.handleAITurn();
        }

        // Handle player move
        const moveMatch = input.match(/tictactoe_(\d)_(\d)/);
        if (moveMatch) {
            const y = parseInt(moveMatch[1]);
            const x = parseInt(moveMatch[2]);
            return await this.makeMove(y, x);
        }

        return { error: 'Invalid input' };
    }

    async makeMove(y, x, playerId = null) {
        // Validate move
        if (y < 0 || y >= this.config.gridSize || x < 0 || x >= this.config.gridSize) {
            return { error: 'Invalid position' };
        }

        if (this.grid[y][x] !== null) {
            return { error: 'Position already taken' };
        }

        // Check if it's the player's turn
        if (playerId && this.players[this.currentPlayer] !== playerId) {
            return { error: 'Not your turn' };
        }

        // Make the move
        this.grid[y][x] = this.currentPlayer;
        this.moves++;

        // Check for win
        if (this.checkWin(y, x)) {
            this.winner = this.currentPlayer;
            this.gamePhase = 'finished';
            await this.addScore(this.currentPlayer === 0 ? 100 : 0); // Only first player gets score
            return await this.getGameState();
        }

        // Check for draw
        if (this.moves >= this.maxMoves) {
            this.gamePhase = 'finished';
            this.winner = null; // Draw
            return await this.getGameState();
        }

        // Switch players
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;

        return await this.getGameState();
    }

    async handleAITurn() {
        // Simple AI: try to win, then block, then random
        const move = this.getAIMove();
        return await this.makeMove(move.y, move.x);
    }

    getAIMove() {
        // Try to win
        for (let y = 0; y < this.config.gridSize; y++) {
            for (let x = 0; x < this.config.gridSize; x++) {
                if (this.grid[y][x] === null) {
                    this.grid[y][x] = this.currentPlayer;
                    if (this.checkWin(y, x)) {
                        this.grid[y][x] = null;
                        return { y, x };
                    }
                    this.grid[y][x] = null;
                }
            }
        }

        // Try to block opponent
        const opponent = (this.currentPlayer + 1) % 2;
        for (let y = 0; y < this.config.gridSize; y++) {
            for (let x = 0; x < this.config.gridSize; x++) {
                if (this.grid[y][x] === null) {
                    this.grid[y][x] = opponent;
                    if (this.checkWin(y, x)) {
                        this.grid[y][x] = null;
                        return { y, x };
                    }
                    this.grid[y][x] = null;
                }
            }
        }

        // Random move
        const availableMoves = [];
        for (let y = 0; y < this.config.gridSize; y++) {
            for (let x = 0; x < this.config.gridSize; x++) {
                if (this.grid[y][x] === null) {
                    availableMoves.push({ y, x });
                }
            }
        }

        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    checkWin(y, x) {
        const player = this.grid[y][x];
        
        // Check row
        let count = 0;
        for (let i = 0; i < this.config.gridSize; i++) {
            if (this.grid[y][i] === player) count++;
        }
        if (count === this.config.gridSize) return true;

        // Check column
        count = 0;
        for (let i = 0; i < this.config.gridSize; i++) {
            if (this.grid[i][x] === player) count++;
        }
        if (count === this.config.gridSize) return true;

        // Check diagonal (top-left to bottom-right)
        if (y === x) {
            count = 0;
            for (let i = 0; i < this.config.gridSize; i++) {
                if (this.grid[i][i] === player) count++;
            }
            if (count === this.config.gridSize) return true;
        }

        // Check diagonal (top-right to bottom-left)
        if (y + x === this.config.gridSize - 1) {
            count = 0;
            for (let i = 0; i < this.config.gridSize; i++) {
                if (this.grid[i][this.config.gridSize - 1 - i] === player) count++;
            }
            if (count === this.config.gridSize) return true;
        }

        return false;
    }

    getGameResultMessage() {
        if (this.winner === null) {
            return "It's a draw! Well played by both players!";
        } else {
            const winnerName = this.players[this.winner] === 'AI' ? 
                '🤖 AI' : `<@${this.players[this.winner]}>`;
            return `${winnerName} wins! Congratulations!`;
        }
    }

    getWinnerDisplay() {
        if (this.winner === null) {
            return 'Draw';
        } else {
            const symbols = ['❌', '⭕'];
            const winnerName = this.players[this.winner] === 'AI' ? 
                '🤖 AI' : `<@${this.players[this.winner]}>`;
            return `${symbols[this.winner]} ${winnerName}`;
        }
    }

    async endGame(reason = 'completed') {
        this.state = 'completed';
        this.endTime = new Date();
        
        const embed = EmbedBuilderUtil.createBaseEmbed(
            '🎮 Tic Tac Toe - Game Complete!',
            this.getGameResultMessage()
        );

        embed.addFields(
            { name: 'Total Moves', value: this.moves.toString(), inline: true },
            { name: 'Duration', value: this.getFormattedDuration(), inline: true },
            { name: 'Winner', value: this.getWinnerDisplay(), inline: true }
        );

        // Calculate rewards
        const gameResult = {
            score: this.score,
            moves: this.moves,
            winner: this.winner,
            completed: reason === 'completed',
            gameType: 'tictactoe',
            players: this.players.length
        };

        return {
            embed,
            components: [],
            gameResult,
            completed: true
        };
    }
}

module.exports = TicTacToeGame;

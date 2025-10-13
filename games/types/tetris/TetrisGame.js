// Tetris game implementation
const GameBase = require('../../engine/GameBase');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedBuilderUtil = require('../../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../../utils/buttonBuilder');

class TetrisGame extends GameBase {
    constructor() {
        super('tetris', {
            name: 'Tetris',
            description: 'A classic falling block puzzle game',
            category: 'puzzle',
            minPlayers: 1,
            maxPlayers: 1,
            duration: 600, // 10 minutes
            gridWidth: 10,
            gridHeight: 20,
            rewards: {
                xp: 75,
                currency: 40,
                bonus: {
                    highScore: { xp: 100, currency: 50 },
                    levelBonus: { xp: 25, currency: 15 }
                }
            }
        });
        
        this.grid = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.piecePosition = { x: 4, y: 0 };
        this.level = 1;
        this.linesCleared = 0;
        this.dropTime = 1000; // milliseconds
        this.lastDrop = Date.now();
        this.gameOver = false;
        this.paused = false;
        
        // Tetris pieces (Tetrominoes)
        this.pieces = {
            I: { shape: [[1,1,1,1]], color: '🔵' },
            O: { shape: [[1,1],[1,1]], color: '🟡' },
            T: { shape: [[0,1,0],[1,1,1]], color: '🟣' },
            S: { shape: [[0,1,1],[1,1,0]], color: '🟢' },
            Z: { shape: [[1,1,0],[0,1,1]], color: '🔴' },
            J: { shape: [[1,0,0],[1,1,1]], color: '🟠' },
            L: { shape: [[0,0,1],[1,1,1]], color: '🔵' }
        };
        
        this.pieceNames = Object.keys(this.pieces);
    }

    async initialize(userId, options = {}) {
        this.initializeGrid();
        this.currentPiece = this.getRandomPiece();
        this.nextPiece = this.getRandomPiece();
        this.piecePosition = { x: 4, y: 0 };
        this.level = 1;
        this.linesCleared = 0;
        this.dropTime = 1000;
        this.lastDrop = Date.now();
        this.gameOver = false;
        this.paused = false;
    }

    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < this.config.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.config.gridWidth; x++) {
                this.grid[y][x] = 0;
            }
        }
    }

    getRandomPiece() {
        const pieceName = this.pieceNames[Math.floor(Math.random() * this.pieceNames.length)];
        return {
            name: pieceName,
            shape: this.pieces[pieceName].shape,
            color: this.pieces[pieceName].color
        };
    }

    async getGameState() {
        if (this.gameOver) {
            return await this.endGame('completed');
        }

        // Auto-drop piece
        const now = Date.now();
        if (now - this.lastDrop >= this.dropTime && !this.paused) {
            await this.movePiece('down');
            this.lastDrop = now;
        }

        const embed = EmbedBuilderUtil.createBaseEmbed(
            `🎮 Tetris - Level ${this.level}`,
            `Clear lines to increase your score and level!`
        );

        // Create grid display
        const gridDisplay = this.createGridDisplay();
        embed.addFields({
            name: 'Game Board',
            value: gridDisplay,
            inline: false
        });

        // Add game info
        embed.addFields(
            { name: 'Score', value: this.score.toString(), inline: true },
            { name: 'Level', value: this.level.toString(), inline: true },
            { name: 'Lines Cleared', value: this.linesCleared.toString(), inline: true },
            { name: 'Next Piece', value: this.nextPiece.color, inline: true }
        );

        // Add controls info
        embed.addFields({
            name: 'Controls',
            value: '⬅️ Move Left | ➡️ Move Right | ⬇️ Soft Drop | 🔄 Rotate | ⏸️ Pause',
            inline: false
        });

        // Create control buttons
        const controls = this.createControlButtons();

        return {
            embed,
            components: [controls]
        };
    }

    createGridDisplay() {
        let display = '';
        
        // Create a copy of the grid with the current piece
        const displayGrid = this.grid.map(row => [...row]);
        
        // Place current piece on display grid
        if (this.currentPiece && !this.gameOver) {
            const piece = this.currentPiece;
            for (let y = 0; y < piece.shape.length; y++) {
                for (let x = 0; x < piece.shape[y].length; x++) {
                    if (piece.shape[y][x]) {
                        const gridY = this.piecePosition.y + y;
                        const gridX = this.piecePosition.x + x;
                        if (gridY >= 0 && gridY < this.config.gridHeight && 
                            gridX >= 0 && gridX < this.config.gridWidth) {
                            displayGrid[gridY][gridX] = piece.color;
                        }
                    }
                }
            }
        }

        // Convert to display string
        for (let y = 0; y < this.config.gridHeight; y++) {
            for (let x = 0; x < this.config.gridWidth; x++) {
                if (displayGrid[y][x] === 0) {
                    display += '⬛';
                } else {
                    display += displayGrid[y][x];
                }
            }
            display += '\n';
        }

        return display;
    }

    createControlButtons() {
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tetris_left')
                    .setLabel('⬅️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('tetris_rotate')
                    .setLabel('🔄')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('tetris_right')
                    .setLabel('➡️')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tetris_down')
                    .setLabel('⬇️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('tetris_pause')
                    .setLabel(this.paused ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('tetris_quit')
                    .setLabel('❌')
                    .setStyle(ButtonStyle.Danger)
            );

        return [row1, row2];
    }

    async processInput(input) {
        if (this.gameOver) {
            return { error: 'Game is over' };
        }

        switch (input) {
            case 'tetris_left':
                await this.movePiece('left');
                break;
            case 'tetris_right':
                await this.movePiece('right');
                break;
            case 'tetris_down':
                await this.movePiece('down');
                break;
            case 'tetris_rotate':
                await this.rotatePiece();
                break;
            case 'tetris_pause':
                this.paused = !this.paused;
                break;
            case 'tetris_quit':
                this.gameOver = true;
                return await this.endGame('abandoned');
        }

        return await this.getGameState();
    }

    async movePiece(direction) {
        if (this.paused || this.gameOver) return;

        const newPosition = { ...this.piecePosition };
        
        switch (direction) {
            case 'left':
                newPosition.x--;
                break;
            case 'right':
                newPosition.x++;
                break;
            case 'down':
                newPosition.y++;
                break;
        }

        if (this.isValidPosition(newPosition)) {
            this.piecePosition = newPosition;
            
            if (direction === 'down') {
                // Check if piece has landed
                if (!this.isValidPosition({ x: newPosition.x, y: newPosition.y + 1 })) {
                    await this.placePiece();
                }
            }
        } else if (direction === 'down') {
            // Piece has landed
            await this.placePiece();
        }
    }

    async rotatePiece() {
        if (this.paused || this.gameOver) return;

        const rotatedShape = this.rotateMatrix(this.currentPiece.shape);
        const originalShape = this.currentPiece.shape;
        
        this.currentPiece.shape = rotatedShape;
        
        if (!this.isValidPosition(this.piecePosition)) {
            // Try wall kicks
            const kicks = [
                { x: -1, y: 0 },
                { x: 1, y: 0 },
                { x: 0, y: -1 },
                { x: -1, y: -1 },
                { x: 1, y: -1 }
            ];
            
            let kickWorked = false;
            for (const kick of kicks) {
                const kickPosition = {
                    x: this.piecePosition.x + kick.x,
                    y: this.piecePosition.y + kick.y
                };
                
                if (this.isValidPosition(kickPosition)) {
                    this.piecePosition = kickPosition;
                    kickWorked = true;
                    break;
                }
            }
            
            if (!kickWorked) {
                this.currentPiece.shape = originalShape;
            }
        }
    }

    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = [];
        
        for (let i = 0; i < cols; i++) {
            rotated[i] = [];
            for (let j = 0; j < rows; j++) {
                rotated[i][j] = matrix[rows - 1 - j][i];
            }
        }
        
        return rotated;
    }

    isValidPosition(position) {
        const piece = this.currentPiece;
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const gridX = position.x + x;
                    const gridY = position.y + y;
                    
                    // Check boundaries
                    if (gridX < 0 || gridX >= this.config.gridWidth || 
                        gridY >= this.config.gridHeight) {
                        return false;
                    }
                    
                    // Check collision with placed pieces
                    if (gridY >= 0 && this.grid[gridY][gridX] !== 0) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    async placePiece() {
        const piece = this.currentPiece;
        
        // Place piece on grid
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const gridY = this.piecePosition.y + y;
                    const gridX = this.piecePosition.x + x;
                    
                    if (gridY >= 0) {
                        this.grid[gridY][gridX] = piece.color;
                    }
                }
            }
        }
        
        // Check for completed lines
        const linesCleared = await this.clearLines();
        this.linesCleared += linesCleared;
        
        // Calculate score
        const lineScore = this.calculateLineScore(linesCleared);
        await this.addScore(lineScore);
        
        // Level up
        if (this.linesCleared >= this.level * 10) {
            this.level++;
            this.dropTime = Math.max(100, this.dropTime - 50); // Faster dropping
        }
        
        // Spawn next piece
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getRandomPiece();
        this.piecePosition = { x: 4, y: 0 };
        
        // Check game over
        if (!this.isValidPosition(this.piecePosition)) {
            this.gameOver = true;
        }
    }

    async clearLines() {
        let linesCleared = 0;
        
        for (let y = this.config.gridHeight - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== 0)) {
                // Remove the line
                this.grid.splice(y, 1);
                // Add empty line at top
                this.grid.unshift(new Array(this.config.gridWidth).fill(0));
                linesCleared++;
                y++; // Check the same line again
            }
        }
        
        return linesCleared;
    }

    calculateLineScore(linesCleared) {
        const baseScore = [0, 40, 100, 300, 1200]; // Standard Tetris scoring
        return baseScore[linesCleared] * this.level;
    }

    async endGame(reason = 'completed') {
        this.state = 'completed';
        this.endTime = new Date();
        
        const embed = EmbedBuilderUtil.createBaseEmbed(
            '🎮 Tetris - Game Over!',
            `Great job playing Tetris!`
        );

        embed.addFields(
            { name: 'Final Score', value: this.score.toString(), inline: true },
            { name: 'Level Reached', value: this.level.toString(), inline: true },
            { name: 'Lines Cleared', value: this.linesCleared.toString(), inline: true },
            { name: 'Duration', value: this.getFormattedDuration(), inline: true }
        );

        if (reason === 'completed') {
            embed.addFields({
                name: '🏆 Well Played!',
                value: 'You cleared lines and reached a high level!',
                inline: false
            });
        }

        // Calculate rewards
        const gameResult = {
            score: this.score,
            level: this.level,
            linesCleared: this.linesCleared,
            completed: reason === 'completed',
            gameType: 'tetris'
        };

        return {
            embed,
            components: [],
            gameResult,
            completed: true
        };
    }
}

module.exports = TetrisGame;

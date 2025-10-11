// Trivia game implementation with lore integration
const GameBase = require('../../engine/GameBase');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedBuilderUtil = require('../../../utils/embedBuilder');
const ButtonBuilderUtil = require('../../../utils/buttonBuilder');
const Database = require('../../../database/db');

class TriviaGame extends GameBase {
    constructor() {
        super('trivia', {
            name: 'Trivia Challenge',
            description: 'Test your knowledge of Ravnspire lore and general knowledge',
            duration: 300, // 5 minutes
            questionsPerGame: 10,
            categories: ['lore', 'history', 'locations', 'characters', 'events', 'general', 'science', 'geography'],
            difficulty: ['easy', 'medium', 'hard']
        });
        
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.correctAnswers = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.category = 'general';
        this.difficulty = 'medium';
    }

    async initialize(userId, options = {}) {
        this.category = options.category || 'general';
        this.difficulty = options.difficulty || 'medium';
        this.questions = await this.loadQuestions();
        this.currentQuestionIndex = 0;
        this.correctAnswers = 0;
        this.streak = 0;
        this.maxStreak = 0;
        
        if (this.questions.length === 0) {
            throw new Error('No questions available for the selected category and difficulty');
        }
    }

    async loadQuestions() {
        const questions = [];
        
        // Load lore-based questions if category is lore-related
        if (['lore', 'history', 'locations', 'characters', 'events'].includes(this.category)) {
            const loreQuestions = await this.loadLoreQuestions();
            questions.push(...loreQuestions);
        }
        
        // Load general knowledge questions
        const generalQuestions = this.loadGeneralQuestions();
        questions.push(...generalQuestions);
        
        // Shuffle and select questions
        const shuffled = this.shuffleArray([...questions]);
        return shuffled.slice(0, this.config.questionsPerGame);
    }

    async loadLoreQuestions() {
        try {
            // Get lore entries from database
            const result = await Database.query(`
                SELECT id, title, content, category, tags
                FROM lore_entries 
                WHERE hidden = false 
                AND category = $1
                ORDER BY RANDOM()
                LIMIT 5
            `, [this.category]);

            const questions = [];
            
            for (const lore of result.rows) {
                const question = this.generateLoreQuestion(lore);
                if (question) {
                    questions.push(question);
                }
            }
            
            return questions;
        } catch (error) {
            console.error('Error loading lore questions:', error);
            return [];
        }
    }

    generateLoreQuestion(lore) {
        const content = lore.content;
        const title = lore.title;
        
        // Generate different types of questions based on lore content
        const questionTypes = [
            () => this.generateFactQuestion(lore),
            () => this.generateLocationQuestion(lore),
            () => this.generateCharacterQuestion(lore),
            () => this.generateEventQuestion(lore)
        ];
        
        // Try each question type until we get a valid one
        for (const generateQuestion of questionTypes) {
            try {
                const question = generateQuestion();
                if (question) return question;
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    generateFactQuestion(lore) {
        // Extract key facts from lore content
        const facts = this.extractFacts(lore.content);
        if (facts.length === 0) return null;
        
        const fact = facts[Math.floor(Math.random() * facts.length)];
        const wrongAnswers = this.generateWrongAnswers(fact.answer, lore.category);
        
        return {
            question: fact.question,
            answers: this.shuffleArray([fact.answer, ...wrongAnswers]),
            correct: 0,
            explanation: `This information comes from the lore entry: "${lore.title}"`,
            loreId: lore.id,
            category: 'lore'
        };
    }

    generateLocationQuestion(lore) {
        if (lore.category !== 'locations') return null;
        
        const locationName = lore.title;
        const description = lore.content;
        
        // Extract location details
        const details = this.extractLocationDetails(description);
        if (details.length === 0) return null;
        
        const detail = details[Math.floor(Math.random() * details.length)];
        const wrongAnswers = this.generateWrongAnswers(detail.answer, 'locations');
        
        return {
            question: `According to the lore, ${detail.question} in ${locationName}?`,
            answers: this.shuffleArray([detail.answer, ...wrongAnswers]),
            correct: 0,
            explanation: `This information comes from the lore about ${locationName}: "${lore.title}"`,
            loreId: lore.id,
            category: 'lore'
        };
    }

    generateCharacterQuestion(lore) {
        if (lore.category !== 'characters') return null;
        
        const characterName = lore.title;
        const description = lore.content;
        
        // Extract character details
        const details = this.extractCharacterDetails(description);
        if (details.length === 0) return null;
        
        const detail = details[Math.floor(Math.random() * details.length)];
        const wrongAnswers = this.generateWrongAnswers(detail.answer, 'characters');
        
        return {
            question: `According to the lore, ${detail.question} about ${characterName}?`,
            answers: this.shuffleArray([detail.answer, ...wrongAnswers]),
            correct: 0,
            explanation: `This information comes from the lore about ${characterName}: "${lore.title}"`,
            loreId: lore.id,
            category: 'lore'
        };
    }

    generateEventQuestion(lore) {
        if (lore.category !== 'events') return null;
        
        const eventName = lore.title;
        const description = lore.content;
        
        // Extract event details
        const details = this.extractEventDetails(description);
        if (details.length === 0) return null;
        
        const detail = details[Math.floor(Math.random() * details.length)];
        const wrongAnswers = this.generateWrongAnswers(detail.answer, 'events');
        
        return {
            question: `According to the lore, ${detail.question} during ${eventName}?`,
            answers: this.shuffleArray([detail.answer, ...wrongAnswers]),
            correct: 0,
            explanation: `This information comes from the lore about ${eventName}: "${lore.title}"`,
            loreId: lore.id,
            category: 'lore'
        };
    }

    extractFacts(content) {
        // Simple fact extraction - in a real implementation, this would be more sophisticated
        const facts = [];
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed.length > 20 && trimmed.length < 100) {
                // Create a question from the sentence
                const words = trimmed.split(' ');
                if (words.length > 5) {
                    const keyWord = words[Math.floor(Math.random() * words.length)];
                    const question = `What is mentioned about "${keyWord}" in this lore?`;
                    facts.push({
                        question,
                        answer: trimmed.substring(0, 50) + '...'
                    });
                }
            }
        }
        
        return facts;
    }

    extractLocationDetails(content) {
        const details = [];
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed.includes('located') || trimmed.includes('found') || trimmed.includes('situated')) {
                details.push({
                    question: 'where is it located',
                    answer: trimmed.substring(0, 60) + '...'
                });
            }
        }
        
        return details;
    }

    extractCharacterDetails(content) {
        const details = [];
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed.includes('known for') || trimmed.includes('famous for') || trimmed.includes('renowned')) {
                details.push({
                    question: 'what are they known for',
                    answer: trimmed.substring(0, 60) + '...'
                });
            }
        }
        
        return details;
    }

    extractEventDetails(content) {
        const details = [];
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed.includes('happened') || trimmed.includes('occurred') || trimmed.includes('took place')) {
                details.push({
                    question: 'what happened',
                    answer: trimmed.substring(0, 60) + '...'
                });
            }
        }
        
        return details;
    }

    generateWrongAnswers(correctAnswer, category) {
        const wrongAnswers = [];
        
        // Generate contextually appropriate wrong answers
        const wrongOptions = {
            lore: ['This information is not mentioned in the lore', 'The lore contradicts this', 'This detail is unclear in the records', 'The lore is silent on this matter'],
            locations: ['In the northern mountains', 'Near the eastern sea', 'In the southern desert', 'Within the western forest'],
            characters: ['They were known for their wisdom', 'They were famous for their courage', 'They were renowned for their magic', 'They were celebrated for their leadership'],
            events: ['The event was peaceful', 'The event was chaotic', 'The event was mysterious', 'The event was legendary']
        };
        
        const options = wrongOptions[category] || wrongOptions.lore;
        const shuffled = this.shuffleArray([...options]);
        
        return shuffled.slice(0, 3);
    }

    loadGeneralQuestions() {
        // Fallback general knowledge questions
        const generalQuestions = {
            easy: [
                {
                    question: "What is the capital of France?",
                    answers: ["Paris", "London", "Berlin", "Madrid"],
                    correct: 0,
                    explanation: "Paris is the capital and largest city of France.",
                    category: 'general'
                },
                {
                    question: "What is 2 + 2?",
                    answers: ["3", "4", "5", "6"],
                    correct: 1,
                    explanation: "2 + 2 equals 4.",
                    category: 'general'
                }
            ],
            medium: [
                {
                    question: "Who painted the Mona Lisa?",
                    answers: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
                    correct: 2,
                    explanation: "Leonardo da Vinci painted the Mona Lisa in the early 16th century.",
                    category: 'general'
                }
            ],
            hard: [
                {
                    question: "What is the smallest country in the world?",
                    answers: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
                    correct: 1,
                    explanation: "Vatican City is the smallest country in the world by both area and population.",
                    category: 'general'
                }
            ]
        };

        const difficultyQuestions = generalQuestions[this.difficulty] || generalQuestions.easy;
        return difficultyQuestions;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async getGameState() {
        if (this.currentQuestionIndex >= this.questions.length) {
            return await this.endGame('completed');
        }

        const question = this.questions[this.currentQuestionIndex];
        const progress = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
        
        const embed = EmbedBuilderUtil.createBaseEmbed(
            `🎯 Trivia Challenge - Question ${progress}`,
            `**Category:** ${this.category.charAt(0).toUpperCase() + this.category.slice(1)}\n**Difficulty:** ${this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1)}`
        );

        embed.addFields({
            name: 'Question',
            value: question.question,
            inline: false
        });

        // Add score info
        embed.addFields(
            { name: 'Score', value: this.score.toString(), inline: true },
            { name: 'Correct', value: `${this.correctAnswers}/${this.currentQuestionIndex}`, inline: true },
            { name: 'Streak', value: this.streak.toString(), inline: true }
        );

        // Create answer buttons
        const answerRow = ButtonBuilderUtil.createTriviaAnswers(question.answers);

        return {
            embed,
            components: [answerRow]
        };
    }

    async processInput(input) {
        if (this.state !== 'playing') {
            throw new Error('Game is not currently active');
        }

        const question = this.questions[this.currentQuestionIndex];
        const answerIndex = parseInt(input.replace('trivia_answer_', ''));
        
        if (answerIndex === question.correct) {
            // Correct answer
            this.correctAnswers++;
            this.streak++;
            this.maxStreak = Math.max(this.maxStreak, this.streak);
            
            // Calculate score based on difficulty and streak
            let points = 10;
            if (this.difficulty === 'medium') points = 15;
            if (this.difficulty === 'hard') points = 20;
            
            // Lore bonus - extra points for lore questions
            if (question.category === 'lore' && question.loreId) {
                points += 5;
                // Record lore discovery
                await this.recordLoreDiscovery(question.loreId);
            }
            
            // Streak bonus
            if (this.streak >= 3) points += 5;
            if (this.streak >= 5) points += 10;
            
            await this.addScore(points);
            
            const embed = EmbedBuilderUtil.createSuccessEmbed(
                'Correct! ✅',
                `**Answer:** ${question.answers[question.correct]}\n\n${question.explanation}`
            );
            
            embed.addFields(
                { name: 'Points Earned', value: points.toString(), inline: true },
                { name: 'Streak', value: this.streak.toString(), inline: true }
            );

            // Add lore discovery notification
            if (question.category === 'lore' && question.loreId) {
                embed.addFields({
                    name: '📚 Lore Discovered!',
                    value: 'You\'ve learned something new about the world of Ravnspire!',
                    inline: false
                });
            }

            this.currentQuestionIndex++;
            
            return {
                embed,
                components: [],
                nextQuestion: true
            };
        } else {
            // Wrong answer
            this.streak = 0;
            
            const embed = EmbedBuilderUtil.createErrorEmbed(
                'Incorrect! ❌',
                `**Correct Answer:** ${question.answers[question.correct]}\n\n${question.explanation}`
            );
            
            embed.addFields(
                { name: 'Your Answer', value: question.answers[answerIndex], inline: true },
                { name: 'Streak Lost', value: 'Streak reset to 0', inline: true }
            );

            this.currentQuestionIndex++;
            
            return {
                embed,
                components: [],
                nextQuestion: true
            };
        }
    }

    async endGame(reason = 'completed') {
        this.state = 'completed';
        this.endTime = new Date();
        
        const accuracy = (this.correctAnswers / this.questions.length) * 100;
        const perfectScore = this.correctAnswers === this.questions.length;
        
        const embed = EmbedBuilderUtil.createBaseEmbed(
            '🎯 Trivia Challenge Complete!',
            `Great job completing the trivia challenge!`
        );

        embed.addFields(
            { name: 'Final Score', value: this.score.toString(), inline: true },
            { name: 'Correct Answers', value: `${this.correctAnswers}/${this.questions.length}`, inline: true },
            { name: 'Accuracy', value: `${accuracy.toFixed(1)}%`, inline: true },
            { name: 'Best Streak', value: this.maxStreak.toString(), inline: true },
            { name: 'Category', value: this.category.charAt(0).toUpperCase() + this.category.slice(1), inline: true },
            { name: 'Difficulty', value: this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1), inline: true }
        );

        if (perfectScore) {
            embed.addFields({
                name: '🏆 Perfect Score!',
                value: 'You got every question correct!',
                inline: false
            });
        }

        if (this.maxStreak >= 5) {
            embed.addFields({
                name: '🔥 Hot Streak!',
                value: `Amazing ${this.maxStreak} question streak!`,
                inline: false
            });
        }

        // Calculate rewards
        const gameResult = {
            score: this.score,
            accuracy: accuracy / 100,
            perfectScore,
            streak: this.maxStreak,
            completed: true,
            category: this.category,
            difficulty: this.difficulty
        };

        return {
            embed,
            components: [],
            gameResult,
            completed: true
        };
    }

    async recordLoreDiscovery(loreId) {
        try {
            // Record that the user discovered this lore entry
            await Database.query(`
                INSERT INTO lore_discoveries (discord_id, lore_id)
                VALUES ($1, $2)
                ON CONFLICT (discord_id, lore_id) DO NOTHING
            `, [this.userId, loreId]);
        } catch (error) {
            console.error('Error recording lore discovery:', error);
        }
    }

    // Get game statistics
    getGameStats() {
        return {
            questionsAnswered: this.currentQuestionIndex,
            correctAnswers: this.correctAnswers,
            accuracy: this.currentQuestionIndex > 0 ? (this.correctAnswers / this.currentQuestionIndex) * 100 : 0,
            currentStreak: this.streak,
            maxStreak: this.maxStreak,
            score: this.score,
            category: this.category,
            difficulty: this.difficulty
        };
    }
}

module.exports = TriviaGame;

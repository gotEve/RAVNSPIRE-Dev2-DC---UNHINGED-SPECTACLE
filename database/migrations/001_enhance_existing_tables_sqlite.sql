-- Migration 001: Enhance existing tables with JSONB support (SQLite version)
-- This migration adds JSONB columns to existing tables for flexible data storage

-- Note: SQLite doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN
-- We'll use a different approach for SQLite

-- Enhance game_sessions table with flexible state storage
-- Check if columns exist before adding them
-- SQLite doesn't support JSONB, so we'll use TEXT for JSON storage

-- Add columns to game_sessions (will fail silently if they exist)
-- We'll handle this in the migration runner

-- Enhance lore_entries table to support codex structure
-- Add entry_id column
-- Add volume column  
-- Add metadata column (TEXT for JSON in SQLite)
-- Add discovered_by column (TEXT for JSON array in SQLite)
-- Add discovery_count column

-- Create game balance configuration table
CREATE TABLE IF NOT EXISTS game_balance_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_type VARCHAR(50),
    scope VARCHAR(20) DEFAULT 'global',
    config_data TEXT NOT NULL, -- JSON stored as TEXT in SQLite
    active BOOLEAN DEFAULT 1,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add faction support to users table
-- Add current_faction column
-- Add faction_purity column

-- Enhance guilds table for Guild District
-- Add guild_type column
-- Add faction_requirement column
-- Add headquarters_neighborhood column
-- Add merchant_level column

-- Add resource support to users table
-- Add resources column (TEXT for JSON in SQLite)

-- Add global stats support
-- Add global_stats column (TEXT for JSON in SQLite)
-- Add variety_score column
-- Add activity_level column

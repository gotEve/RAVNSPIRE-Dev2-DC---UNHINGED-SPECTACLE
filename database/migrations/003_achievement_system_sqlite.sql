-- SQLite-specific migration for achievement system enhancements
-- This migration adds missing columns to support the new achievement system

-- Add hidden column to achievements table if it doesn't exist
-- Note: SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS directly
-- This will be handled by the migration script

-- Add achievement_id column to user_achievements table if it doesn't exist
-- Note: SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS directly
-- This will be handled by the migration script


-- Switch to public schema
SET search_path TO public;

-- Add new performance_points column
ALTER TABLE players ADD COLUMN IF NOT EXISTS performance_points INTEGER NOT NULL DEFAULT points;

-- Rename existing points column to credit_points
ALTER TABLE players RENAME COLUMN points TO credit_points;

-- Add credit_points_at_selection to team_players if it doesn't exist
ALTER TABLE team_players ADD COLUMN IF NOT EXISTS credit_points_at_selection INTEGER NOT NULL DEFAULT 0;

-- Update existing team_players records with current credit points
UPDATE team_players tp 
SET credit_points_at_selection = p.credit_points 
FROM players p 
WHERE tp.player_id = p.id
AND tp.credit_points_at_selection = 0;

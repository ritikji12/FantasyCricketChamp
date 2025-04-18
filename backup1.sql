
-- Rename existing points column to credit_points
ALTER TABLE players RENAME COLUMN points TO credit_points;

-- Add performance_points column
ALTER TABLE players ADD COLUMN performance_points INTEGER NOT NULL DEFAULT credit_points;

-- Add credit_points_at_selection to team_players
ALTER TABLE team_players ADD COLUMN credit_points_at_selection INTEGER NOT NULL DEFAULT 0;

-- Update existing team_players records
UPDATE team_players tp 
SET credit_points_at_selection = p.credit_points 
FROM players p 
WHERE tp.player_id = p.id;

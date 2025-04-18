
-- Switch to the public schema
SET search_path TO public;

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS team_players CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS player_categories CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create player categories
CREATE TABLE public.player_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Create players table with separated points
CREATE TABLE public.players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES public.player_categories(id),
    credit_points INTEGER NOT NULL DEFAULT 0,
    performance_points INTEGER NOT NULL DEFAULT 0,
    runs INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0
);

-- Create teams table
CREATE TABLE public.teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create team_players junction table
CREATE TABLE public.team_players (
    team_id INTEGER NOT NULL REFERENCES public.teams(id),
    player_id INTEGER NOT NULL REFERENCES public.players(id),
    is_captain BOOLEAN NOT NULL DEFAULT false,
    is_vice_captain BOOLEAN NOT NULL DEFAULT false,
    credit_points_at_selection INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (team_id, player_id)
);

-- Create matches table
CREATE TABLE public.matches (
    id SERIAL PRIMARY KEY,
    team1 TEXT NOT NULL,
    team2 TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'live',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default player categories
INSERT INTO public.player_categories (name) VALUES 
('All Rounder'),
('Batsman'),
('Bowler'),
('Wicketkeeper');

-- Insert sample players
INSERT INTO public.players (name, category_id, credit_points, performance_points, runs, wickets) VALUES
-- All Rounders
('Ankur', 1, 200, 200, 75, 2),
('Prince', 1, 150, 150, 50, 1),
('Mayank', 1, 140, 140, 45, 1),
('Amit', 1, 150, 150, 55, 1),
-- Batsmen
('Kuki', 2, 160, 160, 80, 0),
('Captain', 2, 90, 90, 45, 0),
('Chintu', 2, 110, 110, 55, 0),
('Paras Kumar', 2, 90, 90, 45, 0),
('Pushkar', 2, 100, 100, 50, 0),
('Dhilu', 2, 55, 55, 25, 0),
('Kamal', 2, 110, 110, 55, 0),
('Ajay', 2, 35, 35, 15, 0),
-- Bowlers
('Pulkit', 3, 55, 55, 5, 1),
('Nitish', 3, 110, 110, 10, 3),
('Rahul', 3, 110, 110, 5, 3),
('Karambeer', 3, 95, 95, 5, 2),
('Manga', 3, 90, 90, 10, 2),
-- Wicketkeeper
('None', 4, 0, 0, 0, 0);

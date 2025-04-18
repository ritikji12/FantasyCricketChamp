-- Switch to public schema
SET search_path TO public;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create player categories
CREATE TABLE player_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Create players table with both credit and performance points
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES player_categories(id),
    credit_points INTEGER NOT NULL DEFAULT 0,
    performance_points INTEGER NOT NULL DEFAULT 0,
    runs INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0
);

-- Create teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create team_players junction table
CREATE TABLE team_players (
    team_id INTEGER NOT NULL REFERENCES teams(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    is_captain BOOLEAN NOT NULL DEFAULT false,
    is_vice_captain BOOLEAN NOT NULL DEFAULT false,
    credit_points_at_selection INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (team_id, player_id)
);

-- Create matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    team1 TEXT NOT NULL,
    team2 TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'live',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert existing data
INSERT INTO player_categories (id, name) VALUES
(1, 'All Rounder'),
(2, 'Batsman'),
(3, 'Bowler'),
(4, 'Wicketkeeper');

INSERT INTO players (id, name, category_id, credit_points, performance_points, runs, wickets) VALUES
(1, 'Ankur', 1, 200, 200, 75, 2),
(2, 'Prince', 1, 150, 150, 50, 1),
(3, 'Mayank', 1, 140, 140, 45, 1),
(4, 'Amit', 1, 150, 150, 55, 1),
(5, 'Kuki', 2, 160, 160, 80, 0),
(6, 'Captain', 2, 90, 90, 45, 0),
(7, 'Chintu', 2, 110, 110, 55, 0),
(8, 'Paras Kumar', 2, 90, 90, 45, 0),
(9, 'Pushkar', 2, 100, 100, 50, 0),
(10, 'Dhilu', 2, 55, 55, 25, 0),
(11, 'Kamal', 2, 110, 110, 55, 0),
(12, 'Ajay', 2, 35, 35, 15, 0),
(13, 'Pulkit', 3, 55, 55, 5, 1),
(14, 'Nitish', 3, 110, 110, 10, 3),
(15, 'Rahul', 3, 110, 110, 5, 3),
(16, 'Karambeer', 3, 95, 95, 5, 2),
(17, 'Manga', 3, 90, 90, 10, 2),
(18, 'None', 4, 0, 0, 0, 0);

INSERT INTO users (id, username, password, name, email, is_admin, created_at) VALUES
(1, 'ritikji', 'cc1cec35f9a7c014b47a9ffb0c4ad16f08b4eb48d0f33e8ad1b6266c8c6497b52f5b3123fdee9f8d49a67a6822f84b0caf2d8db854767ef515a83809e434b674.0b761cd4852a59e5c8e36dba7f8b5e2a', 'Ritik', 'r1@gmail.com', false, '2025-04-18 03:42:40.202427'),
(2, 'admin', 'b2ee95fa7d9ea498eeb8866dfade06e1f943feb1d04f27d32104acd8a082de5e912c2a7f162eb6b5b6f447f4d172babcfa026e5486add1020b56305125fd0373.2649ea22a0bc56ebd3fb5cac72fd856b', 'Admin User', 'admin@cr13k3t.com', true, '2025-04-18 03:59:49.444'),
(3, '123', '9b721b2fa1b5d1c30562863ba36fba036dcc3fe84aae4eb0b9aea8dea578570110de994773670047589c5266cf5a03513bd73642e7bf52d52f969a7e10135fc1.3d52c3406a479ee6dd3da670d68c9c5b', '12', '1@gmail.com', false, '2025-04-18 04:06:38.241487'),
(4, 'Ritikji', '267f5e04e490d0beaed7e9851502411b9eabe8ec59dde3380b9fab1ed6de6f85371b391119afc646299c6749e98e81b0e2c52f42363ca888518e2870480f45e9.158113817b9f0e15abd74386fc923341', 'Ritik', 'r12@gmail.com', false, '2025-04-18 04:26:40.657741'),
(5, 'dhankhar18_45_07', '2829dece819cc803a596f3ff7ccbf5d5657f0936ece2f23b9678b0fd0106f21d2929181f8167ae8443a294a22260951947f1a444d346530a0947fa62832996bf.a082387d8a4513dc4ee3b647f1f8f89e', 'mayank dhankhar', 'dhankharmanju299@gmail.com', false, '2025-04-18 04:29:44.762958'),
(6, 'Sahil', 'd071339d03c0c77034b27a732adff20e8c3d62eb3917896db38685cb69f20e97e2f40ad4a22f0614942d6e4914ca4e5f6a900d9ea9fd733377fcce2fe7b58d5e.a2048be09202701795b0f52e5c945cd3', 'Sahil', 'sahil221201singh@gmail.com', false, '2025-04-18 04:31:37.088181');

INSERT INTO teams (id, name, user_id, created_at) VALUES
(1, 'ritik', 1, '2025-04-18 03:43:33.053733'),
(2, 'Ghcdrxx', 4, '2025-04-18 04:27:27.822669');

INSERT INTO team_players (team_id, player_id, is_captain, is_vice_captain, credit_points_at_selection) VALUES
(1, 1, false, false, 200),
(1, 2, false, false, 150),
(1, 5, false, false, 160),
(1, 6, false, false, 90),
(1, 13, false, false, 55),
(1, 17, false, false, 90),
(2, 2, false, false, 150),
(2, 3, false, false, 140),
(2, 4, false, false, 150),
(2, 5, false, false, 160),
(2, 6, false, false, 90),
(2, 8, true, false, 90),
(2, 10, false, true, 55),
(2, 12, false, false, 35);

INSERT INTO matches (id, team1, team2, status, created_at) VALUES
(1, 'Team Dominator', 'Team Destroyer', 'live', '2025-04-18 03:41:11.729');

-- Set sequence values
SELECT setval('users_id_seq', 6, true);
SELECT setval('player_categories_id_seq', 4, true);
SELECT setval('players_id_seq', 18, true);
SELECT setval('teams_id_seq', 2, true);
SELECT setval('matches_id_seq', 1, true);
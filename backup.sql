--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    team1 text NOT NULL,
    team2 text NOT NULL,
    status text DEFAULT 'live'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.matches OWNER TO neondb_owner;

--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matches_id_seq OWNER TO neondb_owner;

--
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- Name: player_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.player_categories (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.player_categories OWNER TO neondb_owner;

--
-- Name: player_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.player_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.player_categories_id_seq OWNER TO neondb_owner;

--
-- Name: player_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.player_categories_id_seq OWNED BY public.player_categories.id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.players (
    id integer NOT NULL,
    name text NOT NULL,
    category_id integer NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    runs integer DEFAULT 0,
    wickets integer DEFAULT 0
);


ALTER TABLE public.players OWNER TO neondb_owner;

--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.players_id_seq OWNER TO neondb_owner;

--
-- Name: players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.players_id_seq OWNED BY public.players.id;


--
-- Name: team_players; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.team_players (
    team_id integer NOT NULL,
    player_id integer NOT NULL,
    is_captain boolean DEFAULT false NOT NULL,
    is_vice_captain boolean DEFAULT false NOT NULL
);


ALTER TABLE public.team_players OWNER TO neondb_owner;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.teams OWNER TO neondb_owner;

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO neondb_owner;

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- Name: player_categories id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.player_categories ALTER COLUMN id SET DEFAULT nextval('public.player_categories_id_seq'::regclass);


--
-- Name: players id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.players ALTER COLUMN id SET DEFAULT nextval('public.players_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.matches (id, team1, team2, status, created_at) FROM stdin;
1	Team Dominator	Team Destroyer	live	2025-04-18 03:41:11.729
\.


--
-- Data for Name: player_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.player_categories (id, name) FROM stdin;
1	All Rounder
2	Batsman
3	Bowler
4	Wicketkeeper
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.players (id, name, category_id, points, runs, wickets) FROM stdin;
1	Ankur	1	200	75	2
2	Prince	1	150	50	1
3	Mayank	1	140	45	1
4	Amit	1	150	55	1
5	Kuki	2	160	80	0
6	Captain	2	90	45	0
7	Chintu	2	110	55	0
8	Paras Kumar	2	90	45	0
9	Pushkar	2	100	50	0
10	Dhilu	2	55	25	0
11	Kamal	2	110	55	0
12	Ajay	2	35	15	0
13	Pulkit	3	55	5	1
14	Nitish	3	110	10	3
15	Rahul	3	110	5	3
16	Karambeer	3	95	5	2
17	Manga	3	90	10	2
18	None	4	0	0	0
\.


--
-- Data for Name: team_players; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.team_players (team_id, player_id, is_captain, is_vice_captain) FROM stdin;
1	1	f	f
1	2	f	f
1	5	f	f
1	6	f	f
1	13	f	f
1	17	f	f
2	2	f	f
2	3	f	f
2	4	f	f
2	5	f	f
2	6	f	f
2	8	t	f
2	10	f	t
2	12	f	f
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.teams (id, name, user_id, created_at) FROM stdin;
1	ritik	1	2025-04-18 03:43:33.053733
2	Ghcdrxx	4	2025-04-18 04:27:27.822669
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, name, email, is_admin, created_at) FROM stdin;
1	ritikji	cc1cec35f9a7c014b47a9ffb0c4ad16f08b4eb48d0f33e8ad1b6266c8c6497b52f5b3123fdee9f8d49a67a6822f84b0caf2d8db854767ef515a83809e434b674.0b761cd4852a59e5c8e36dba7f8b5e2a	Ritik	r1@gmail.com	f	2025-04-18 03:42:40.202427
2	admin	b2ee95fa7d9ea498eeb8866dfade06e1f943feb1d04f27d32104acd8a082de5e912c2a7f162eb6b5b6f447f4d172babcfa026e5486add1020b56305125fd0373.2649ea22a0bc56ebd3fb5cac72fd856b	Admin User	admin@cr13k3t.com	t	2025-04-18 03:59:49.444
3	123	9b721b2fa1b5d1c30562863ba36fba036dcc3fe84aae4eb0b9aea8dea578570110de994773670047589c5266cf5a03513bd73642e7bf52d52f969a7e10135fc1.3d52c3406a479ee6dd3da670d68c9c5b	12	1@gmail.com	f	2025-04-18 04:06:38.241487
4	Ritikji	267f5e04e490d0beaed7e9851502411b9eabe8ec59dde3380b9fab1ed6de6f85371b391119afc646299c6749e98e81b0e2c52f42363ca888518e2870480f45e9.158113817b9f0e15abd74386fc923341	Ritik	r12@gmail.com	f	2025-04-18 04:26:40.657741
5	dhankhar18_45_07	2829dece819cc803a596f3ff7ccbf5d5657f0936ece2f23b9678b0fd0106f21d2929181f8167ae8443a294a22260951947f1a444d346530a0947fa62832996bf.a082387d8a4513dc4ee3b647f1f8f89e	mayank dhankhar	dhankharmanju299@gmail.com	f	2025-04-18 04:29:44.762958
6	Sahil	d071339d03c0c77034b27a732adff20e8c3d62eb3917896db38685cb69f20e97e2f40ad4a22f0614942d6e4914ca4e5f6a900d9ea9fd733377fcce2fe7b58d5e.a2048be09202701795b0f52e5c945cd3	Sahil 	sahil221201singh@gmail.com	f	2025-04-18 04:31:37.088181
\.


--
-- Name: matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.matches_id_seq', 1, false);


--
-- Name: player_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.player_categories_id_seq', 4, true);


--
-- Name: players_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.players_id_seq', 18, true);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.teams_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: player_categories player_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.player_categories
    ADD CONSTRAINT player_categories_name_unique UNIQUE (name);


--
-- Name: player_categories player_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.player_categories
    ADD CONSTRAINT player_categories_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: team_players team_players_team_id_player_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_player_id_pk PRIMARY KEY (team_id, player_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: players players_category_id_player_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_category_id_player_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.player_categories(id);


--
-- Name: team_players team_players_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: team_players team_players_team_id_teams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_teams_id_fk FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: teams teams_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--


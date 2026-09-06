-- Minimal preserved v1 tables for rehearsing the real S2 -> money -> pilot chain.
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), display_name text, telegram_handle text, streak_days integer DEFAULT 0);
CREATE TABLE equb_rooms(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, stake_amount integer NOT NULL DEFAULT 500,
  start_date date, end_date date, completion_pct numeric DEFAULT 80,
  workout_target integer DEFAULT 12, min_members integer DEFAULT 20, max_members integer DEFAULT 20,
  status text DEFAULT 'pending', sponsor_prize numeric DEFAULT 0, created_at timestamptz DEFAULT now());
CREATE TABLE partner_gyms(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);
CREATE TABLE badge_definitions(id text PRIMARY KEY, name text, bonus_points integer DEFAULT 0);
CREATE TABLE challenges(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, start_date date, end_date date);

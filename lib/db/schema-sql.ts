export const SCHEMA_SQL = `
-- Additive only. Deploys must never DROP, TRUNCATE, or recreate these tables.
-- Saved members, workouts, and plans live in Neon and have to survive every push.
CREATE TABLE IF NOT EXISTS families (
  id text PRIMARY KEY,
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id text PRIMARY KEY,
  family_id text NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routines (
  id text PRIMARY KEY,
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_sets (
  id text PRIMARY KEY,
  routine_id text NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  exercise_order integer NOT NULL DEFAULT 0,
  set_index integer NOT NULL,
  weight real NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workouts (
  id text PRIMARY KEY,
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  routine_id text REFERENCES routines(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  notes text
);

CREATE TABLE IF NOT EXISTS sets (
  id text PRIMARY KEY,
  workout_id text NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  set_index integer NOT NULL,
  weight real NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0,
  completed_at timestamptz
);

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS routine_id text REFERENCES routines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS members_family_id_idx ON members(family_id);
CREATE INDEX IF NOT EXISTS workouts_member_id_idx ON workouts(member_id);
CREATE INDEX IF NOT EXISTS workouts_routine_id_idx ON workouts(routine_id);
CREATE INDEX IF NOT EXISTS routines_member_id_idx ON routines(member_id);
CREATE INDEX IF NOT EXISTS routine_sets_routine_id_idx ON routine_sets(routine_id);
CREATE INDEX IF NOT EXISTS sets_workout_id_idx ON sets(workout_id);
`;

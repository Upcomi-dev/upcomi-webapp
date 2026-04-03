-- Collections feature: tables, RPC, RLS
-- Run this migration in the Supabase SQL editor

-- 1. Collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  is_auto boolean NOT NULL DEFAULT false,
  auto_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Collection events junction table
CREATE TABLE IF NOT EXISTS collection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  event_id integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  "order" integer NOT NULL DEFAULT 0,
  UNIQUE(collection_id, event_id)
);

-- 3. Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 4. Auto-update updated_at on collections
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. RPC: get popular events (favorites count + upcoming fallback)
CREATE OR REPLACE FUNCTION get_popular_events(p_limit int DEFAULT 20)
RETURNS TABLE(event_id int, fav_count bigint) AS $$
WITH popular AS (
  SELECT fe.event AS event_id, COUNT(*) AS fav_count
  FROM favourite_events fe
  JOIN events e ON e.id = fe.event
  WHERE e."dateEvent" >= CURRENT_DATE
  GROUP BY fe.event
  HAVING COUNT(*) >= 2
  ORDER BY fav_count DESC
  LIMIT p_limit
),
fill_count AS (
  SELECT GREATEST(0, p_limit - (SELECT COUNT(*) FROM popular)) AS remaining
),
upcoming AS (
  SELECT e.id AS event_id, 0::bigint AS fav_count
  FROM events e
  CROSS JOIN fill_count
  WHERE e."dateEvent" >= CURRENT_DATE
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND e.id NOT IN (SELECT p.event_id FROM popular p)
  ORDER BY e."dateEvent" ASC
  LIMIT (SELECT remaining FROM fill_count)
)
SELECT * FROM popular
UNION ALL
SELECT * FROM upcoming;
$$ LANGUAGE sql STABLE;

-- 6. RLS policies

-- Collections: public read
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections are viewable by everyone"
  ON collections FOR SELECT
  USING (true);

CREATE POLICY "Collections are editable by admins"
  ON collections FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Collection events: public read
ALTER TABLE collection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection events are viewable by everyone"
  ON collection_events FOR SELECT
  USING (true);

CREATE POLICY "Collection events are editable by admins"
  ON collection_events FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Admin users: users can read their own record
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check their own admin status"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

-- 7. Seed the auto "Populaires" collection
INSERT INTO collections (name, description, "order", is_auto, auto_type)
VALUES ('Populaires', 'Les événements les plus ajoutés en favoris', 0, true, 'popular')
ON CONFLICT DO NOTHING;

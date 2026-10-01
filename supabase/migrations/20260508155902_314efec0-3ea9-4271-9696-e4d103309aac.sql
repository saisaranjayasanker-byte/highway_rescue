
-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Role enum
CREATE TYPE public.user_role AS ENUM ('driver', 'mechanic');

-- Request status enum
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'driver',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'driver')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ MECHANICS ============
CREATE TABLE public.mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT,
  services TEXT[] DEFAULT ARRAY['general']::TEXT[],
  is_available BOOLEAN NOT NULL DEFAULT true,
  location GEOGRAPHY(POINT, 4326),
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mechanics_location_idx ON public.mechanics USING GIST (location);
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanics are viewable by authenticated users"
  ON public.mechanics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mechanic can insert own row"
  ON public.mechanics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Mechanic can update own row"
  ON public.mechanics FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_mechanics_updated_at
  BEFORE UPDATE ON public.mechanics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RESCUE REQUESTS ============
CREATE TABLE public.rescue_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  issue TEXT,
  vehicle_info TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rescue_requests_pickup_idx ON public.rescue_requests USING GIST (pickup_location);
CREATE INDEX rescue_requests_status_idx ON public.rescue_requests (status);
ALTER TABLE public.rescue_requests ENABLE ROW LEVEL SECURITY;

-- Drivers see their own requests; mechanics see pending or assigned-to-them requests
CREATE POLICY "Driver sees own requests"
  ON public.rescue_requests FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Mechanic sees pending or assigned"
  ON public.rescue_requests FOR SELECT TO authenticated
  USING (
    status = 'pending'
    OR auth.uid() = mechanic_id
    OR EXISTS (SELECT 1 FROM public.mechanics m WHERE m.user_id = auth.uid())
  );
CREATE POLICY "Driver creates own request"
  ON public.rescue_requests FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Driver or mechanic can update request"
  ON public.rescue_requests FOR UPDATE USING (
    auth.uid() = driver_id
    OR auth.uid() = mechanic_id
    OR (status = 'pending' AND EXISTS (SELECT 1 FROM public.mechanics m WHERE m.user_id = auth.uid()))
  );

CREATE TRIGGER update_rescue_requests_updated_at
  BEFORE UPDATE ON public.rescue_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NEAREST MECHANIC RPC ============
CREATE OR REPLACE FUNCTION public.find_nearest_mechanics(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 20000,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  shop_name TEXT,
  services TEXT[],
  distance_meters DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    m.user_id,
    m.shop_name,
    m.services,
    ST_Distance(m.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_meters,
    ST_Y(m.location::geometry) AS lat,
    ST_X(m.location::geometry) AS lng
  FROM public.mechanics m
  WHERE m.is_available = true
    AND m.location IS NOT NULL
    AND ST_DWithin(m.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_meters)
  ORDER BY m.location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  LIMIT max_results;
$$;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.rescue_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanics;
ALTER TABLE public.rescue_requests REPLICA IDENTITY FULL;
ALTER TABLE public.mechanics REPLICA IDENTITY FULL;

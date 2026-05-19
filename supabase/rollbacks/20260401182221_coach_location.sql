-- Rollback: drop coach location tables and RPC functions
DROP FUNCTION IF EXISTS search_coaches_by_service_area(double precision, double precision);
DROP FUNCTION IF EXISTS search_coaches_by_gym_location(double precision, double precision, double precision);

DROP POLICY IF EXISTS "Coaches can manage own service area schedules" ON coach_service_area_schedules;
DROP POLICY IF EXISTS "Anyone can view schedules of published coach service areas" ON coach_service_area_schedules;
DROP TABLE IF EXISTS coach_service_area_schedules;

DROP POLICY IF EXISTS "Coaches can manage own service areas" ON coach_service_areas;
DROP POLICY IF EXISTS "Anyone can view service areas of published coaches" ON coach_service_areas;
DROP TABLE IF EXISTS coach_service_areas;

DROP POLICY IF EXISTS "Coaches can manage own gym schedules" ON coach_gym_schedules;
DROP POLICY IF EXISTS "Anyone can view schedules of published coach gyms" ON coach_gym_schedules;
DROP TABLE IF EXISTS coach_gym_schedules;

DROP POLICY IF EXISTS "Coaches can manage own gyms" ON coach_gyms;
DROP POLICY IF EXISTS "Anyone can view gyms of published coaches" ON coach_gyms;
DROP TABLE IF EXISTS coach_gyms;

DROP POLICY IF EXISTS "Coaches can manage own service types" ON coach_service_types;
DROP POLICY IF EXISTS "Anyone can view service types of published coaches" ON coach_service_types;
DROP TABLE IF EXISTS coach_service_types;
-- Note: do not drop postgis as other features may depend on it

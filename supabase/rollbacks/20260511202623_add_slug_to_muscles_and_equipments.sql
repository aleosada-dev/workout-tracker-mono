-- Rollback: drop slug columns and restore variations_view without slug fields.

DROP VIEW IF EXISTS public.variations_view;
CREATE VIEW public.variations_view
WITH (security_invoker = true) AS
SELECT
  v.id,
  v.name,
  v.exercise_id,
  e.name AS exercise_name,
  e.exercise_type,
  v.muscle_id,
  m.name AS muscle_name,
  COALESCE(m_parent.name, m.name) AS muscle_level2_name,
  v.secondary_muscle_id,
  sm.name AS secondary_muscle_name,
  v.equipment_id,
  eq.name AS equipment_name,
  eq.preposition AS equipment_preposition,
  v.video_url,
  v.image_url,
  v.user_id,
  vv.object_key      AS video_object_key,
  vv.thumbnail_key   AS video_thumbnail_key,
  vv.duration_seconds AS video_duration_seconds,
  vv.processing_status AS video_processing_status
FROM public.variations v
JOIN public.exercises e ON e.id = v.exercise_id
JOIN public.muscles m ON m.id = v.muscle_id
LEFT JOIN public.muscles m_parent ON m.level = 3 AND m_parent.id = m.parent_id
LEFT JOIN public.muscles sm ON sm.id = v.secondary_muscle_id
JOIN public.equipments eq ON eq.id = v.equipment_id
LEFT JOIN public.variation_videos vv ON vv.variation_id = v.id;

ALTER TABLE public.muscles DROP CONSTRAINT IF EXISTS muscles_slug_unique;
ALTER TABLE public.muscles DROP COLUMN IF EXISTS slug;

ALTER TABLE public.equipments DROP CONSTRAINT IF EXISTS equipments_slug_unique;
ALTER TABLE public.equipments DROP COLUMN IF EXISTS slug;

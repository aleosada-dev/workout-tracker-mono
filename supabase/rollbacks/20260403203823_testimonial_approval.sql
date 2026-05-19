-- Drop metrics function
DROP FUNCTION IF EXISTS public.get_coach_testimonial_stats(uuid);

-- Remove coach update policy
DROP POLICY IF EXISTS "Coaches can update status of their testimonials." ON public.coach_testimonials;

-- Remove new SELECT policy
DROP POLICY IF EXISTS "Testimonials are viewable by everyone (published only) or by owner." ON public.coach_testimonials;

-- Restore original INSERT policy (unqualified status, safe once column is dropped)
DROP POLICY IF EXISTS "Athletes can insert testimonials for their coaches." ON public.coach_testimonials;
CREATE POLICY "Athletes can insert testimonials for their coaches."
  ON public.coach_testimonials FOR INSERT
  WITH CHECK (
    athlete_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes
      WHERE coach_id = coach_testimonials.coach_id
        AND athlete_id = coach_testimonials.athlete_id
        AND status IN ('active', 'ended')
    )
  );

-- Restore original SELECT policy
CREATE POLICY "Testimonials are viewable by everyone."
  ON public.coach_testimonials FOR SELECT
  USING (true);

-- Drop status column (removes constraint automatically)
ALTER TABLE public.coach_testimonials DROP COLUMN status;

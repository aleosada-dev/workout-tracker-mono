-- Rollback: restore original policies with auth.uid() (without SELECT wrapper)

-- workout_logs
DROP POLICY "Athletes read own logs" ON public.workout_logs;
CREATE POLICY "Athletes read own logs"
  ON public.workout_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY "Athletes insert own logs" ON public.workout_logs;
CREATE POLICY "Athletes insert own logs"
  ON public.workout_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY "Coaches read athlete logs" ON public.workout_logs;
CREATE POLICY "Coaches read athlete logs"
  ON public.workout_logs FOR SELECT
  USING (public.is_active_coach_of(auth.uid(), user_id));

DROP POLICY "Coaches insert athlete logs" ON public.workout_logs;
CREATE POLICY "Coaches insert athlete logs"
  ON public.workout_logs FOR INSERT
  WITH CHECK (public.is_active_coach_of(auth.uid(), user_id));

-- workout_exercise_logs
DROP POLICY "Athletes read own exercise logs" ON public.workout_exercise_logs;
CREATE POLICY "Athletes read own exercise logs"
  ON public.workout_exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = workout_exercise_logs.workout_log_id
        AND wl.user_id = auth.uid()
    )
  );

DROP POLICY "Athletes insert own exercise logs" ON public.workout_exercise_logs;
CREATE POLICY "Athletes insert own exercise logs"
  ON public.workout_exercise_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = workout_exercise_logs.workout_log_id
        AND wl.user_id = auth.uid()
    )
  );

DROP POLICY "Coaches read athlete exercise logs" ON public.workout_exercise_logs;
CREATE POLICY "Coaches read athlete exercise logs"
  ON public.workout_exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = workout_exercise_logs.workout_log_id
        AND public.is_active_coach_of(auth.uid(), wl.user_id)
    )
  );

DROP POLICY "Coaches insert athlete exercise logs" ON public.workout_exercise_logs;
CREATE POLICY "Coaches insert athlete exercise logs"
  ON public.workout_exercise_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = workout_exercise_logs.workout_log_id
        AND public.is_active_coach_of(auth.uid(), wl.user_id)
    )
  );

-- workout_exercise_set_logs
DROP POLICY "Athletes read own set logs" ON public.workout_exercise_set_logs;
CREATE POLICY "Athletes read own set logs"
  ON public.workout_exercise_set_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_exercise_logs wel
      JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
      WHERE wel.id = workout_exercise_set_logs.workout_exercise_log_id
        AND wl.user_id = auth.uid()
    )
  );

DROP POLICY "Athletes insert own set logs" ON public.workout_exercise_set_logs;
CREATE POLICY "Athletes insert own set logs"
  ON public.workout_exercise_set_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_exercise_logs wel
      JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
      WHERE wel.id = workout_exercise_set_logs.workout_exercise_log_id
        AND wl.user_id = auth.uid()
    )
  );

DROP POLICY "Coaches read athlete set logs" ON public.workout_exercise_set_logs;
CREATE POLICY "Coaches read athlete set logs"
  ON public.workout_exercise_set_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_exercise_logs wel
      JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
      WHERE wel.id = workout_exercise_set_logs.workout_exercise_log_id
        AND public.is_active_coach_of(auth.uid(), wl.user_id)
    )
  );

DROP POLICY "Coaches insert athlete set logs" ON public.workout_exercise_set_logs;
CREATE POLICY "Coaches insert athlete set logs"
  ON public.workout_exercise_set_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_exercise_logs wel
      JOIN public.workout_logs wl ON wl.id = wel.workout_log_id
      WHERE wel.id = workout_exercise_set_logs.workout_exercise_log_id
        AND public.is_active_coach_of(auth.uid(), wl.user_id)
    )
  );

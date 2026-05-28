import { useEffect } from 'react';
import { supabase } from '@/features/shared/lib/supabase';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

export function useClearActiveWorkoutOnSignOut() {
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        activeWorkout$.delete();
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, []);
}

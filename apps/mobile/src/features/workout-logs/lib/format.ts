import type { Locale } from 'date-fns';
import type { TFunction } from 'i18next';
import {
  formatDateAtTime,
  formatDurationSeconds,
  formatRelativeDate,
} from '@/features/shared/lib/utils/dates';
import type { WorkoutLogSummary } from '@/features/workout-logs/api/workout-logs';
import type { WorkoutLogCardProps } from '@/features/workout-logs/components/WorkoutLogCard';

export function toCardProps(
  summary: WorkoutLogSummary,
  t: TFunction,
  locale: Locale,
): WorkoutLogCardProps {
  return {
    title: summary.title ?? t('workoutLogs.untitled'),
    subtitle:
      formatRelativeDate(summary.startedAt, locale) ??
      formatDateAtTime(summary.startedAt, t, locale),
    muscleGroups: summary.muscleGroupSlugs.map((slug) => t(`muscles.${slug}` as never)),
    duration: formatDurationSeconds(summary.durationSeconds, locale),
    exerciseCount: t('workoutLogs.exerciseCount', { count: summary.exerciseCount }),
    hasRecord: summary.prCount > 0,
  };
}

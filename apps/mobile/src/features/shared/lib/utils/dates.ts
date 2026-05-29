import {
  differenceInCalendarDays,
  differenceInSeconds,
  format,
  formatDuration,
  formatRelative,
  intervalToDuration,
  type Locale,
  parseISO,
} from 'date-fns';
import type { TFunction } from 'i18next';

const DEFAULT_RELATIVE_WINDOW_DAYS = 6;

function toDate(date: Date | string): Date {
  return typeof date === 'string' ? parseISO(date) : date;
}

export function formatRelativeDate(
  date: Date | string,
  locale: Locale,
  options?: { windowDays?: number },
): string | null {
  const d = toDate(date);
  const days = differenceInCalendarDays(new Date(), d);
  const window = options?.windowDays ?? DEFAULT_RELATIVE_WINDOW_DAYS;
  if (days < 0 || days > window) return null;
  const out = formatRelative(d, new Date(), { locale });
  return out ? out.charAt(0).toLocaleUpperCase() + out.slice(1) : out;
}

export function formatRelativeDays(date: Date | string, t: TFunction): string | null {
  const days = differenceInCalendarDays(new Date(), toDate(date));
  if (days < 0) return null;
  if (days === 0) return t('common.relativeDays.today');
  if (days === 1) return t('common.relativeDays.yesterday');
  return t('common.relativeDays.daysAgo', { count: days });
}

export function formatDateAtTime(date: Date | string, t: TFunction, locale: Locale): string {
  const d = toDate(date);
  return t('common.dateAtTime', {
    date: format(d, 'P', { locale }),
    time: format(d, 'HH:mm', { locale }),
  });
}

export function formatDurationSeconds(seconds: number, locale: Locale): string {
  return formatDuration(intervalToDuration({ start: 0, end: seconds * 1000 }), {
    locale,
    format: ['hours', 'minutes'],
    delimiter: ' ',
  });
}

export function formatRestSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}min`;
  return `${minutes}min ${seconds}s`;
}

export function elapsedSince(startedAt: Date | string): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.max(0, differenceInSeconds(new Date(), toDate(startedAt)));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

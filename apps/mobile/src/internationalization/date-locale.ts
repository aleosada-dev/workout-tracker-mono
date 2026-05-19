import type { Locale } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';

export function getDateFnsLocale(language: string | undefined): Locale {
  if (!language) return ptBR;
  const normalized = language.toLowerCase().split('-')[0];
  if (normalized === 'en') return enUS;
  return ptBR;
}

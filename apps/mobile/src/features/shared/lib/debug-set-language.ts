import {
  type LanguagePreference,
  SUPPORTED_LANGUAGES,
  setLanguage,
} from '@/features/settings/state/settings-store';
import { isDebugAllowed } from '@/features/shared/lib/debug-helpers';

const ALLOWED: LanguagePreference[] = ['system', ...SUPPORTED_LANGUAGES];

export function debugSetLanguage(value: string | undefined): boolean {
  if (!isDebugAllowed()) return false;
  if (!value || !ALLOWED.includes(value as LanguagePreference)) return false;
  setLanguage(value as LanguagePreference);
  return true;
}

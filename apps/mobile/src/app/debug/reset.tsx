import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { debugResetAuth } from '@/shared/lib/debug-reset';
import { debugSetLanguage } from '@/shared/lib/debug-set-language';

export default function DebugResetRoute() {
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  useEffect(() => {
    debugResetAuth().finally(() => {
      if (lang) debugSetLanguage(lang);
      router.replace('/signIn');
    });
  }, [lang]);

  return null;
}

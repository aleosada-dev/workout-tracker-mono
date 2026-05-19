import { type ReactNode, useEffect } from 'react';
import { supabase } from '@/features/shared/lib/supabase';
import i18n from '@/internationalization/i18n';
import { observability } from './adapter';
import { resolveConfig } from './config';

export function ObservabilityProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    observability.init(resolveConfig());

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      observability.setUser(session?.user ? { id: session.user.id } : null);
    });

    supabase.auth.getSession().then(({ data }) => {
      observability.setUser(data.session?.user ? { id: data.session.user.id } : null);
    });

    const onLanguageChange = (lang: string) => observability.setTag('locale', lang);
    i18n.on('languageChanged', onLanguageChange);

    return () => {
      sub.subscription.unsubscribe();
      i18n.off('languageChanged', onLanguageChange);
    };
  }, []);

  return <>{children}</>;
}

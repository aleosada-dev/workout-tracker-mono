import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { enableSlowAuth } from '@/shared/lib/debug-slow-auth';

export default function DebugSlowAuthRoute() {
  const { ms } = useLocalSearchParams<{ ms?: string }>();
  useEffect(() => {
    const delay = Number(ms) || 3000;
    enableSlowAuth(delay);
    router.replace('/signIn');
  }, [ms]);
  return null;
}

import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import SignOut from '@/features/auth/components/sign-out';

export default function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: '', headerRight: () => <SignOut /> }} />
      <Stack.Screen name="profile" options={{ title: t('settings.profile') }} />
      <Stack.Screen name="appearance" options={{ title: t('settings.appearance') }} />
      <Stack.Screen name="local" options={{ title: t('settings.local') }} />
      <Stack.Screen name="notifications" options={{ title: t('settings.notifications') }} />
      <Stack.Screen name="privacy" options={{ title: t('settings.privacy') }} />
      <Stack.Screen name="subscription" options={{ title: t('settings.subscription') }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import SignOut from '@/features/auth/components/sign-out';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: '', headerRight: () => <SignOut /> }} />
    </Stack>
  );
}

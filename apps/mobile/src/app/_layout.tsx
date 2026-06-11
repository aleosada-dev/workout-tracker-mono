import 'react-native-gesture-handler';
import '../global.css';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/geist';
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
} from '@expo-google-fonts/geist-mono';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useSession } from '@/features/auth/hooks/useSession';
import { ObservabilityErrorBoundary, ObservabilityProvider } from '@/features/observability/lib';
import { QueryProvider } from '@/features/query/lib/provider';
import { LanguageBridge, resolveLanguage } from '@/features/settings/state/language-bridge';
import { language$ } from '@/features/settings/state/settings-store';
import { ThemeBridge } from '@/features/settings/state/theme-bridge';
import { useDismissKeyboardOnBackground } from '@/features/shared/hooks/use-dismiss-keyboard-on-background';
import {
  ensureNotificationPermission,
  ensureTimerNotificationChannel,
} from '@/features/shared/lib/notifications';
import { useNavTheme } from '@/features/shared/lib/theme';
import { toastConfig } from '@/features/shared/lib/toast-config';
import { useClearActiveWorkoutOnSignOut } from '@/features/workouts/hooks/use-clear-active-workout-on-signout';
import { setupI18n } from '@/internationalization/i18n';

setupI18n(resolveLanguage(language$.get()));

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session } = useSession();
  const isAuthenticated = !!session;
  const { t } = useTranslation();
  useClearActiveWorkoutOnSignOut();
  useDismissKeyboardOnBackground();

  const [loaded, error] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    void (async () => {
      await ensureTimerNotificationChannel();
      await ensureNotificationPermission();
    })();
  }, []);

  const navTheme = useNavTheme();
  const { colorScheme } = useColorScheme();
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  if (!loaded && !error) {
    return null;
  }

  return (
    <ObservabilityErrorBoundary>
      <ObservabilityProvider>
        <QueryProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <NavigationBar />
              <StatusBar style={statusBarStyle} />
              <ThemeBridge />
              <LanguageBridge />
              <SafeAreaProvider>
                <BottomSheetModalProvider>
                  <ThemeProvider value={navTheme}>
                    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
                      <Stack.Protected guard={isAuthenticated}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                        <Stack.Screen
                          name="(stacks)/(workouts)/exercisesList"
                          options={{ title: t('exerciseListScreen.title') }}
                        />
                        <Stack.Screen
                          name="(stacks)/(workouts)/exercisesFilter"
                          options={{
                            title: t('exerciseListScreen.filter.title'),
                            presentation: 'modal',
                          }}
                        />
                        <Stack.Screen
                          name="(stacks)/(workouts)/exercisePicker"
                          options={{
                            title: t('exerciseListScreen.picker.title'),
                            presentation: 'modal',
                          }}
                        />
                        <Stack.Screen name="(stacks)/(workouts)/exerciseDetail" />
                        <Stack.Screen
                          name="(stacks)/(workouts)/exerciseForm"
                          options={{
                            title: t('exerciseListScreen.addExercise.title'),
                          }}
                        />
                        <Stack.Screen
                          name="(stacks)/(workouts)/workoutsList"
                          options={{ title: t('workoutsScreen.workouts') }}
                        />
                        <Stack.Screen name="(stacks)/(workouts)/workoutFolderDetail" />
                        <Stack.Screen name="(stacks)/(workouts)/workoutForm" />
                        <Stack.Screen name="(stacks)/(workouts)/workoutExecution" />
                        <Stack.Screen name="(stacks)/(workouts)/workoutExecutionSummary" />
                        <Stack.Screen name="(stacks)/(workouts)/workoutLogDetail" />
                        <Stack.Screen name="(stacks)/(workouts)/cardioList" />
                        <Stack.Screen name="(stacks)/(workouts)/myPeriodization" />
                        <Stack.Screen
                          name="(stacks)/(workouts)/workoutHistory"
                          options={{ title: t('workoutsScreen.workoutHistory') }}
                        />

                        <Stack.Screen
                          name="(stacks)/(settings)/profile"
                          options={{ title: t('settings.profile') }}
                        />
                        <Stack.Screen
                          name="(stacks)/(settings)/preferences"
                          options={{ title: t('settings.preferences') }}
                        />
                        <Stack.Screen
                          name="(stacks)/(settings)/notifications"
                          options={{ title: t('settings.notifications') }}
                        />
                        <Stack.Screen
                          name="(stacks)/(settings)/privacy"
                          options={{ title: t('settings.privacy') }}
                        />
                        <Stack.Screen
                          name="(stacks)/(settings)/subscription"
                          options={{ title: t('settings.subscription') }}
                        />
                      </Stack.Protected>

                      <Stack.Protected guard={!isAuthenticated}>
                        <Stack.Screen name="(auth)/signIn" options={{ headerShown: false }} />
                      </Stack.Protected>
                    </Stack>
                  </ThemeProvider>
                  <PortalHost />
                  <Toast topOffset={60} config={toastConfig} />
                </BottomSheetModalProvider>
              </SafeAreaProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryProvider>
      </ObservabilityProvider>
    </ObservabilityErrorBoundary>
  );
}

import '../internationalization/i18n.ts';
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
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useSession } from '@/auth/hooks/useSession';
import { ObservabilityErrorBoundary, ObservabilityProvider } from '@/observability/lib';
import { QueryProvider } from '@/query/lib/provider';
import { LanguageBridge } from '@/settings/state/language-bridge';
import { ThemeBridge } from '@/settings/state/theme-bridge';
import { useNavTheme } from '@/shared/lib/theme';
import { toastConfig } from '@/shared/lib/toast-config';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session } = useSession();
  const isAuthenticated = !!session;

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
              <StatusBar style={statusBarStyle} />
              <ThemeBridge />
              <LanguageBridge />
              <SafeAreaProvider>
                <BottomSheetModalProvider>
                  <ThemeProvider value={navTheme}>
                    <Stack>
                      <Stack.Protected guard={isAuthenticated}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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

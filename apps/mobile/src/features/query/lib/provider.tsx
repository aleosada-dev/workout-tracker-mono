import { QueryClientProvider } from '@tanstack/react-query';
import * as ExpoDevice from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { useSyncQueriesExternal } from 'react-query-external-sync';
import { queryClient } from './client';

export function QueryProvider({ children }: { children: ReactNode }) {
  // Set up the sync hook - automatically disabled in production!
  useSyncQueriesExternal({
    queryClient,
    socketURL: 'http://localhost:42831', // Default port for React Native DevTools
    deviceName: Platform?.OS || 'web', // Platform detection
    platform: Platform?.OS || 'web', // Use appropriate platform identifier
    deviceId: Platform?.OS || 'web', // Use a PERSISTENT identifier (see note below)
    isDevice: ExpoDevice.isDevice, // Automatically detects real devices vs emulators
    extraDeviceInfo: {
      // Optional additional info about your device
      appVersion: '1.0.0',
      // Add any relevant platform info
    },
    enableLogs: false,
    envVariables: {
      APP_VARIANT: process.env.APP_VARIANT ?? 'development',
      // Add any private environment variables you want to monitor
      // Public environment variables are automatically loaded
    },
    // Storage monitoring with CRUD operations
    // mmkvStorage: storage, // MMKV storage for ['#storage', 'mmkv', 'key'] queries + monitoring
    // asyncStorage: AsyncStorage, // AsyncStorage for ['#storage', 'async', 'key'] queries + monitoring
    secureStorage: SecureStore, // SecureStore for ['#storage', 'secure', 'key'] queries + monitoring
    // secureStorageKeys: ['userToken', 'refreshToken', 'biometricKey', 'deviceId'], // SecureStore keys to monitor
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

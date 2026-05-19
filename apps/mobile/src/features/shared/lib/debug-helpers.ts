import Constants from 'expo-constants';

export function isDebugAllowed() {
  return Constants.expoConfig?.extra?.appVariant !== 'production';
}

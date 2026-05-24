import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const APP_VARIANT = (process.env.APP_VARIANT ?? 'production') as Variant;

const IS_DEV = APP_VARIANT === 'development';
const IS_PREVIEW = APP_VARIANT === 'preview';

const appName = IS_DEV
  ? 'Workout Tracker (Dev)'
  : IS_PREVIEW
    ? 'Workout Tracker (Preview)'
    : 'Workout Tracker';

const bundleIdentifier = IS_DEV
  ? 'br.com.osadainc.workouttracker.dev'
  : IS_PREVIEW
    ? 'br.com.osadainc.workouttracker.preview'
    : 'br.com.osadainc.workouttracker';

const scheme = IS_DEV
  ? 'workouttrackerappdev'
  : IS_PREVIEW
    ? 'workouttrackerapppreview'
    : 'workouttrackerapp';

const projectId = '324ff3fa-2c4a-45dc-8120-c91f972955ba';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'workout-tracker-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme,
  userInterfaceStyle: 'automatic',
  runtimeVersion: '0.1.0',
  updates: {
    url: `https://u.expo.dev/${projectId}`,
  },
  ios: {
    bundleIdentifier,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      PHPhotoLibraryPreventAutomaticLimitedAccessAlert: true,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0A0A0A',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: bundleIdentifier,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-localization',
    'expo-notifications',
    'expo-video',
    'expo-image',
    'expo-status-bar',
    'expo-web-browser',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Permite que o Workout Tracker acesse sua galeria para selecionar vídeos de exercícios e a foto do seu perfil.',
        cameraPermission:
          'Permite que o Workout Tracker use a câmera para gravar vídeos de exercícios e tirar a foto do seu perfil.',
        microphonePermission:
          'Permite que o Workout Tracker use o microfone para gravar o áudio dos vídeos de exercícios.',
      },
    ],
    './plugins/withGradleJvmArgs',
    [
      '@sentry/react-native/expo',
      {
        organization: 'osada-inc',
        project: 'workout-tracker-app',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0A0A0A',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId,
    },
    appVariant: APP_VARIANT,
  },
});

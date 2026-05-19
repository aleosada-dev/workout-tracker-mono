import { Button, Text } from '@workout-tracker/ui-mobile';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { observability, workoutObservability } from '@/observability/lib';

function CrashOnRender({ enabled }: { enabled: boolean }) {
  if (enabled) {
    throw new Error('Test render error from Sentry test screen');
  }
  return null;
}

export default function SentryTestRoute() {
  const variant = Constants.expoConfig?.extra?.appVariant as string;
  const [crashOnRender, setCrashOnRender] = useState(false);

  if (variant === 'production') return <Redirect href="/" />;

  return (
    <View className="flex-1 items-center justify-center gap-4 p-6">
      <CrashOnRender enabled={crashOnRender} />

      <Text variant="h2">Sentry test</Text>
      <Text className="text-muted-foreground">
        Use os botões para validar a integração de observability.
      </Text>

      <Button
        onPress={() => {
          workoutObservability.trackAction('debug_breadcrumb', { source: 'sentry-test' });
          observability.captureMessage('Test message from debug screen', {
            level: 'info',
            tags: { feature: 'debug' },
          });
        }}
      >
        <Text>Send test message</Text>
      </Button>

      <Button
        onPress={() => {
          workoutObservability.trackAction('about_to_capture', { source: 'sentry-test' });
          observability.captureException(
            new Error('Test JS error (direct capture) from Sentry test screen'),
            { tags: { feature: 'debug', path: 'direct-capture' } },
          );
        }}
      >
        <Text>Capture exception (direct)</Text>
      </Button>

      <Button
        variant="destructive"
        onPress={() => {
          workoutObservability.trackAction('about_to_render_crash', { source: 'sentry-test' });
          setCrashOnRender(true);
        }}
      >
        <Text>Trigger render error (via boundary)</Text>
      </Button>

      <Button
        variant="outline"
        onPress={() => {
          workoutObservability.captureError(new Error('Manual workout error'), {
            action: 'save_set',
            extra: {
              workoutId: 'debug-workout',
              exerciseId: 'debug-exercise',
            },
          });
        }}
      >
        <Text>workoutObservability.captureError</Text>
      </Button>
    </View>
  );
}

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { observability } from '@/features/observability/lib';

const TIMER_CHANNEL_ID = 'timer';

/**
 * Define como uma notificação local recebida com o app em foreground é exibida.
 * Roda no import do módulo (mesmo padrão de `supabase.ts`), garantindo que o
 * handler esteja configurado antes de qualquer agendamento.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Cria o canal de notificação `timer` no Android (no-op em iOS). Necessário no
 * Android 8+ para que som e vibração sejam aplicados. É idempotente — basta
 * chamar uma vez no boot do app.
 */
export async function ensureTimerNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(TIMER_CHANNEL_ID, {
      name: 'Timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch (err) {
    observability.captureException(err, {
      tags: { feature: 'timer', action: 'ensure-channel' },
    });
  }
}

/**
 * Garante a permissão de notificação. Pergunta ao usuário apenas quando ainda
 * não foi concedida e o sistema permite perguntar. Retorna `true` se concedida.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (err) {
    observability.captureException(err, {
      tags: { feature: 'timer', action: 'ensure-permission' },
    });
    return false;
  }
}

type ScheduleTimerNotificationInput = {
  /** Título opcional — omita para uma notificação só com som/vibração. */
  title?: string | undefined;
  /** Mensagem opcional. */
  body?: string | undefined;
  /** Instante em que a notificação deve disparar. */
  date: Date;
};

/**
 * Agenda uma notificação local para `date`. O SO a entrega mesmo com o app
 * suspenso. Retorna o identificador para cancelamento posterior, ou `null` se
 * o agendamento falhar.
 */
export async function scheduleTimerNotification(
  input: ScheduleTimerNotificationInput,
): Promise<string | null> {
  try {
    // `title`/`body` só entram no conteúdo quando definidos — omitir ambos
    // resulta numa notificação só com som/vibração (sem texto).
    const content: Notifications.NotificationContentInput = { sound: 'default' };
    if (input.title !== undefined) content.title = input.title;
    if (input.body !== undefined) content.body = input.body;
    return await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: input.date,
        channelId: TIMER_CHANNEL_ID,
      },
    });
  } catch (err) {
    observability.captureException(err, {
      tags: { feature: 'timer', action: 'schedule-notification' },
    });
    return null;
  }
}

/**
 * Cancela uma notificação agendada. É seguro chamar com um identificador já
 * disparado ou inexistente — nesse caso é um no-op.
 */
export async function cancelTimerNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err) {
    observability.captureException(err, {
      tags: { feature: 'timer', action: 'cancel-notification' },
    });
  }
}

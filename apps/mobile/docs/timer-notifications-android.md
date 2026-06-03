# Timer de descanso — atraso de som/notificação no Android

## Sintoma

No Android (só nele), o som e a notificação do fim do timer de descanso chegam com
atraso de 30s ou mais. No iOS o disparo é pontual.

## Causa raiz

Todo o alerta sonoro do timer depende **exclusivamente de uma notificação local
agendada** (`scheduleTimerNotification` → trigger `DATE` em
`src/features/shared/lib/notifications.ts`). Não há som tocado dentro do app:
`onComplete` em `use-rest-timer-controller.ts` só atualiza estado, e não há
`expo-av`/`expo-audio`. No fim natural a notificação agendada é deixada disparar de
propósito (`handleFinish(false)` em `use-countdown-timer.ts`) — é ela quem toca o som.

O `expo-notifications` agenda no Android via `AlarmManager`. Em
`ExpoSchedulingDelegate.kt`:

```kotlin
if (SDK_INT < S || alarmManager.canScheduleExactAlarms()) {
  setExactAndAllowWhileIdle(...)   // exato
} else {
  setAndAllowWhileIdle(...)        // inexato → adiado pelo Doze/App Standby (30s+)
}
```

Sem a permissão de alarme exato, em Android 12+ cai no ramo **inexato**, que o Doze
agrupa e adia. É um problema conhecido (expo/expo#5799); a própria doc da Expo avisa
que entregas atrasam "up to a minute and sometimes longer".

## Solução atual (B — mitigação por alarme exato)

`plugins/withExactAlarmPermissions.js` declara no manifest:

- `SCHEDULE_EXACT_ALARM` — Android 12 (API 31-32), concedida por padrão.
- `USE_EXACT_ALARM` — Android 13+ (API 33+), auto-concedida e não revogável; é ela que
  efetivamente liga o alarme exato no regime de `targetSdk` atual (35/36).

Com isso `canScheduleExactAlarms()` passa a ser true e o `expo-notifications` usa
`setExactAndAllowWhileIdle` automaticamente — sem mudança no código JS.

### Ressalvas desta solução

- **Política da Play Store**: `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` são restritas a
  apps de despertador/calendário/timer. Um timer de descanso é defensável, mas há risco
  na revisão da loja. Monitorar.
- `setExactAndAllowWhileIdle` ainda é **throttled (~1x a cada 9 min) em Doze profundo** —
  raro durante treino ativo, mas descansos curtos em sequência podem atrasar.
- Continua **baseado em notificação** — não resolve o desejo de evitar a notificação nem
  garante 100% de pontualidade com a tela apagada por longos períodos.

## Solução futura (C — foreground service)

A única abordagem que garante som pontual com a tela apagada, imune ao Doze e ao
AlarmManager: um **foreground service** que roda o countdown e toca o áudio ele mesmo
ao zerar.

### Restrições do Android a considerar antes de implementar

1. **Notificação ongoing é obrigatória.** Todo FGS exige por lei uma notificação
   persistente (desde o Oreo). Não dá para "remover a notificação" — troca-se o *alerta
   atrasado* por uma *notificação ongoing*, que pode ser silenciosa/baixa prioridade ou,
   melhor, um **chronometer com a contagem ao vivo**.
2. **Lifecycle por descanso, não "sempre ligado".** Iniciar o serviço quando o descanso
   começa e pará-lo ao zerar/skip. Um serviço sempre ativo mantém notificação fixa e
   dreno de bateria à toa.
3. **Android 14+ (`targetSdk` 35/36) exige `foregroundServiceType` + permissão.** Opções:
   - `shortService` → teto de ~3 min: **insuficiente** para descansos maiores.
   - `specialUse` → exige justificativa e revisão no Play Console.
   - `mediaPlayback` → permissão normal, sem revisão especial, defensável (o serviço
     genuinamente toca um áudio). **Caminho pragmático recomendado.**

### Opções de implementação

- **Módulo nativo Expo custom** (config plugin + `Service` em Kotlin): countdown +
  som (`SoundPool`/`RingtoneManager`) + vibração + notificação chronometer. Sem
  dependência extra, controle e i18n totais. O repo já tem `android/` ejetado e usa dev
  build, então é viável. Mais código.
- **Notifee** (`@notifee/react-native`): `registerForegroundService` + `showChronometer`
  prontos, menos boilerplate, biblioteca madura (plugin Expo, dev build — não Expo Go).
  Ainda exige resolver o `foregroundServiceType` no Android 14 e tocar o som.

## Arquivos relevantes

- `src/features/shared/lib/notifications.ts` — agendamento, canal Android, handler.
- `src/features/shared/hooks/use-countdown-timer.ts` — countdown wall-clock, agenda/cancela
  a notificação.
- `src/features/workouts/hooks/use-rest-timer-controller.ts` — API pública do timer.
- `plugins/withExactAlarmPermissions.js` — permissões de alarme exato (solução B).

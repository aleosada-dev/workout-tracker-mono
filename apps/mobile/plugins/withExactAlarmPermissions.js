const { withAndroidManifest } = require('expo/config-plugins');

// Permite que o expo-notifications agende notificações com `setExactAndAllowWhileIdle`
// em vez do alarme inexato (que o Doze adia em 30s+). Em ExpoSchedulingDelegate.kt o
// ramo exato só é usado quando `canScheduleExactAlarms()` é true.
//
// - SCHEDULE_EXACT_ALARM cobre Android 12 (API 31-32), onde é concedida por padrão.
// - USE_EXACT_ALARM cobre Android 13+ (API 33+) e é concedida automaticamente, sem ser
//   revogável — é ela quem realmente liga o alarme exato no regime de targetSdk atual.
//
// Ambas são restritas pela política da Play Store a apps de despertador/calendário/timer;
// solução intermediária até o foreground service (ver docs/timer-notifications-android.md).
const EXACT_ALARM_PERMISSIONS = [
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
];

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const { manifest } = cfg.modResults;
    manifest['uses-permission'] = manifest['uses-permission'] ?? [];
    for (const name of EXACT_ALARM_PERMISSIONS) {
      const exists = manifest['uses-permission'].some((item) => item.$?.['android:name'] === name);
      if (!exists) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    return cfg;
  });

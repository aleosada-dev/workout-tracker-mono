import * as Haptics from 'expo-haptics';

export function impactLight() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function notifySuccess() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

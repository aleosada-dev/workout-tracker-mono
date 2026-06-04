import { useEffect } from 'react';
import { AppState, Keyboard } from 'react-native';

export function useDismissKeyboardOnBackground() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') Keyboard.dismiss();
    });
    return () => sub.remove();
  }, []);
}

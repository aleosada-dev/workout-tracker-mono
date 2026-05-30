jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const passthrough = ({ children }: { children?: React.ReactNode }) => children ?? null;
  const fade = { duration: () => fade, delay: () => fade };
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    FadeIn: fade,
    FadeOut: fade,
    View,
    createAnimatedComponent: (c: unknown) => c,
    NativeOnlyAnimatedView: passthrough,
  };
});
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return {
    ...actual,
    FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { SupersetHelpDialog } from '@/features/workouts/components/SupersetHelpDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));

function renderWithPortal() {
  return render(
    <>
      <SupersetHelpDialog />
      <PortalHost />
    </>,
  );
}

describe('<SupersetHelpDialog />', () => {
  test('renders the help trigger', () => {
    const { getByTestId } = renderWithPortal();

    getByTestId('workout-execution.superset.help-trigger');
  });

  test('opens the dialog with the superset explanation when pressed', () => {
    const { getByTestId, getByText } = renderWithPortal();

    fireEvent.press(getByTestId('workout-execution.superset.help-trigger'));

    getByTestId('workout-execution.superset.help-dialog');
    getByText('workoutExecutionScreen.superset.help.title');
    getByText('workoutExecutionScreen.superset.help.description');
  });
});

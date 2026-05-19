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
import { SetTypesHelpDialog } from '@/exercises/components/SetTypesHelpDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));

function renderWithPortal() {
  return render(
    <>
      <SetTypesHelpDialog />
      <PortalHost />
    </>,
  );
}

describe('<SetTypesHelpDialog />', () => {
  test('renders the help trigger', () => {
    const { getByTestId } = renderWithPortal();

    getByTestId('exercise-detail.sets.types.help-trigger');
  });

  test('opens the dialog with one entry per set type when the trigger is pressed', () => {
    const { getByTestId, getAllByText } = renderWithPortal();

    fireEvent.press(getByTestId('exercise-detail.sets.types.help-trigger'));

    getByTestId('exercise-detail.sets.types.help-dialog');
    getAllByText('sets.warmup.label', { exact: false });
    getAllByText('sets.normal.label', { exact: false });
    getAllByText('sets.drop.label', { exact: false });
    getAllByText('sets.cluster.label', { exact: false });
    getAllByText(/exerciseDetailScreen\.sets\.types\.descriptions\.warmup/);
    getAllByText(/exerciseDetailScreen\.sets\.types\.descriptions\.normal/);
    getAllByText(/exerciseDetailScreen\.sets\.types\.descriptions\.drop/);
    getAllByText(/exerciseDetailScreen\.sets\.types\.descriptions\.cluster/);
  });
});

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
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock('@/features/observability/lib', () => ({
  trainingLocationObservability: { trackAction: jest.fn(), captureError: jest.fn() },
}));

const mockUseTrainingLocations = jest.fn();
const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();
const mockDeleteMutate = jest.fn();

jest.mock('@/features/training-locations/hooks/use-training-locations', () => ({
  useTrainingLocations: () => mockUseTrainingLocations(),
  useCreateTrainingLocation: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useUpdateTrainingLocation: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useDeleteTrainingLocation: () => ({ mutate: mockDeleteMutate }),
}));

import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { trainingLocationObservability } from '@/features/observability/lib';
import { DefaultLocationField } from '@/features/preferences/components/default-location-field';

const mockToastShow = Toast.show as jest.Mock;
const mockCaptureError = trainingLocationObservability.captureError as jest.Mock;

const LOCATIONS = [
  { id: 'loc-1', userId: 'u', name: 'Smart Fit', createdAt: '', updatedAt: '' },
  { id: 'loc-2', userId: 'u', name: 'Academia do Bairro', createdAt: '', updatedAt: '' },
];

function setup(value: string | null) {
  mockUseTrainingLocations.mockReturnValue({ data: LOCATIONS, isLoading: false });
  const onValueChange = jest.fn();
  const utils = render(
    <>
      <DefaultLocationField value={value} onValueChange={onValueChange} />
      <PortalHost />
    </>,
  );
  return { ...utils, onValueChange };
}

beforeEach(() => {
  mockUseTrainingLocations.mockReset();
  mockCreateMutateAsync.mockReset();
  mockUpdateMutateAsync.mockReset();
  mockDeleteMutate.mockReset();
  mockToastShow.mockReset();
  mockCaptureError.mockReset();
});

describe('<DefaultLocationField />', () => {
  test('trigger shows the selected location name', () => {
    const { getByTestId } = setup('loc-1');
    expect(getByTestId('preferences.defaultLocation')).toHaveTextContent('Smart Fit');
  });

  test('trigger falls back to the none label when no value is set', () => {
    const { getByTestId } = setup(null);
    expect(getByTestId('preferences.defaultLocation')).toHaveTextContent(
      'preferencesScreen.defaultLocation.none',
    );
  });

  test('selecting a location reports the id and selecting "none" reports null', () => {
    const { getByTestId, onValueChange } = setup(null);

    fireEvent.press(getByTestId('preferences.defaultLocation'));
    fireEvent.press(getByTestId('preferences.defaultLocation.option.loc-2'));
    expect(onValueChange).toHaveBeenCalledWith('loc-2');

    fireEvent.press(getByTestId('preferences.defaultLocation.option.none'));
    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  test('adding a location calls the create mutation with the typed name', () => {
    const { getByTestId } = setup(null);

    fireEvent.press(getByTestId('preferences.defaultLocation'));
    fireEvent.changeText(getByTestId('preferences.defaultLocation.newName'), '  CrossBox  ');
    fireEvent.press(getByTestId('preferences.defaultLocation.add'));

    expect(mockCreateMutateAsync).toHaveBeenCalledWith({ name: 'CrossBox' });
  });

  test('editing a location inline saves the trimmed name and disables selection', async () => {
    const { getByTestId, queryByTestId } = setup(null);

    fireEvent.press(getByTestId('preferences.defaultLocation'));
    fireEvent.press(getByTestId('preferences.defaultLocation.option.loc-1.edit'));

    fireEvent.changeText(
      getByTestId('preferences.defaultLocation.option.loc-1.edit-input'),
      '  Smart Fit Centro  ',
    );

    // Selecting another location is disabled while editing.
    expect(getByTestId('preferences.defaultLocation.option.loc-2')).toBeDisabled();
    expect(getByTestId('preferences.defaultLocation.option.none')).toBeDisabled();

    fireEvent.press(getByTestId('preferences.defaultLocation.option.loc-1.edit-save'));
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      locationId: 'loc-1',
      body: { name: 'Smart Fit Centro' },
    });
    await waitFor(() =>
      expect(queryByTestId('preferences.defaultLocation.option.loc-1.edit-input')).toBeNull(),
    );
  });

  test('a failed create reports telemetry and shows an error toast', async () => {
    mockCreateMutateAsync.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId } = setup(null);

    fireEvent.press(getByTestId('preferences.defaultLocation'));
    fireEvent.changeText(getByTestId('preferences.defaultLocation.newName'), 'CrossBox');
    fireEvent.press(getByTestId('preferences.defaultLocation.add'));

    await waitFor(() =>
      expect(mockCaptureError).toHaveBeenCalledWith(expect.any(Error), {
        action: 'create_training_location',
      }),
    );
    expect(mockToastShow).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  test('cancelling an inline edit does not call the update mutation', () => {
    const { getByTestId, queryByTestId } = setup(null);

    fireEvent.press(getByTestId('preferences.defaultLocation'));
    fireEvent.press(getByTestId('preferences.defaultLocation.option.loc-1.edit'));
    fireEvent.changeText(
      getByTestId('preferences.defaultLocation.option.loc-1.edit-input'),
      'Changed',
    );
    fireEvent.press(getByTestId('preferences.defaultLocation.option.loc-1.edit-cancel'));

    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    expect(queryByTestId('preferences.defaultLocation.option.loc-1.edit-input')).toBeNull();
  });

  test('deleting the active location resets the preference to null after confirmation', () => {
    const { getByTestId, onValueChange } = setup('loc-1');

    fireEvent.press(getByTestId('preferences.defaultLocation'));
    fireEvent.press(getByTestId('preferences.defaultLocation.option.loc-1.delete'));
    fireEvent.press(getByTestId('preferences.defaultLocation.delete-confirm'));

    expect(onValueChange).toHaveBeenCalledWith(null);
    expect(mockDeleteMutate).toHaveBeenCalledWith('loc-1', expect.any(Object));
  });
});

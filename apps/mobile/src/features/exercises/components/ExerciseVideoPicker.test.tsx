import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import Toast from 'react-native-toast-message';
import { exerciseObservability } from '@/features/observability/lib';
import { ExerciseVideoPicker, type SelectedVideo } from './ExerciseVideoPicker';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

// The native video player is irrelevant here — we only assert which branch
// (empty picker vs. preview) the component renders.
jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({})),
  VideoView: () => null,
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'pt' } }),
}));

jest.mock('@/features/observability/lib', () => ({
  exerciseObservability: { trackAction: jest.fn(), captureError: jest.fn() },
}));

const launchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.Mock;
const toastShow = Toast.show as jest.Mock;

function videoAsset(overrides: Record<string, unknown> = {}) {
  return {
    uri: 'file:///tmp/demo.mp4',
    fileName: 'demo.mp4',
    fileSize: 5 * 1024 * 1024,
    duration: 10_000,
    mimeType: 'video/mp4',
    width: 1080,
    height: 1920,
    ...overrides,
  };
}

/** Controlled host so the picker's `value` reflects what `onChange` reports. */
function Harness() {
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  return <ExerciseVideoPicker value={video} onChange={setVideo} />;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('<ExerciseVideoPicker />', () => {
  test('shows the select action and no preview initially', () => {
    const { getByTestId, queryByTestId } = render(<Harness />);

    getByTestId('add-exercise.video.select');
    expect(queryByTestId('add-exercise.video.preview')).toBeNull();
  });

  test('shows a preview when the picked video is within the limits', async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [videoAsset()] });

    const { getByTestId, findByTestId, queryByTestId } = render(<Harness />);
    fireEvent.press(getByTestId('add-exercise.video.select'));

    await findByTestId('add-exercise.video.preview');
    expect(queryByTestId('add-exercise.video.select')).toBeNull();
    expect(toastShow).not.toHaveBeenCalled();
    expect(exerciseObservability.trackAction).toHaveBeenCalledWith('exercise_video_selected');
  });

  test('forwards the picked file size to onChange', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [videoAsset({ fileSize: 3 * 1024 * 1024 })],
    });
    const onChange = jest.fn();

    const { getByTestId } = render(<ExerciseVideoPicker value={null} onChange={onChange} />);
    fireEvent.press(getByTestId('add-exercise.video.select'));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sizeBytes: 3 * 1024 * 1024 }));
  });

  test('rejects a video over the size limit with an error toast', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [videoAsset({ fileSize: 200 * 1024 * 1024 })],
    });

    const { getByTestId, queryByTestId } = render(<Harness />);
    fireEvent.press(getByTestId('add-exercise.video.select'));

    await waitFor(() => expect(toastShow).toHaveBeenCalled());
    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'exerciseListScreen.addExercise.video.errors.tooLarge.title',
      }),
    );
    expect(queryByTestId('add-exercise.video.preview')).toBeNull();
  });

  test('rejects a video over the duration limit with an error toast', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [videoAsset({ duration: 45_000 })],
    });

    const { getByTestId, queryByTestId } = render(<Harness />);
    fireEvent.press(getByTestId('add-exercise.video.select'));

    await waitFor(() => expect(toastShow).toHaveBeenCalled());
    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: 'exerciseListScreen.addExercise.video.errors.tooLong.title',
      }),
    );
    expect(queryByTestId('add-exercise.video.preview')).toBeNull();
  });

  test('rejects an unsupported format with an error toast', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [videoAsset({ mimeType: 'video/avi' })],
    });

    const { getByTestId, queryByTestId } = render(<Harness />);
    fireEvent.press(getByTestId('add-exercise.video.select'));

    await waitFor(() => expect(toastShow).toHaveBeenCalled());
    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: 'exerciseListScreen.addExercise.video.errors.unsupportedFormat.title',
      }),
    );
    expect(queryByTestId('add-exercise.video.preview')).toBeNull();
  });

  test('does nothing when the picker is canceled', async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    const { getByTestId, queryByTestId } = render(<Harness />);
    fireEvent.press(getByTestId('add-exercise.video.select'));

    await waitFor(() => expect(launchImageLibraryAsync).toHaveBeenCalled());
    expect(toastShow).not.toHaveBeenCalled();
    expect(queryByTestId('add-exercise.video.preview')).toBeNull();
  });

  test('clears the preview when the user removes the video', async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [videoAsset()] });

    const { getByTestId, findByTestId, queryByTestId } = render(<Harness />);
    fireEvent.press(getByTestId('add-exercise.video.select'));

    await findByTestId('add-exercise.video.preview');
    fireEvent.press(getByTestId('add-exercise.video.remove'));

    expect(queryByTestId('add-exercise.video.preview')).toBeNull();
    getByTestId('add-exercise.video.select');
  });
});

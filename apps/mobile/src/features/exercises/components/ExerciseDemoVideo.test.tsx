import { fireEvent, render } from '@testing-library/react-native';
import { ExerciseDemoVideo } from '@/features/exercises/components/ExerciseDemoVideo';

// Stub the heavy native players. We only care about which one ExerciseDemoVideo
// decides to render and whether the toggle appears.
jest.mock('@/features/exercises/components/ExerciseVideoCard', () => ({
  ExerciseVideoCard: ({ uri }: { uri: string }) => {
    const { Text } = require('react-native');
    return <Text testID="exercise-detail.video.mp4">{uri}</Text>;
  },
}));
jest.mock('@/features/exercises/components/ExerciseYouTubeCard', () => ({
  ExerciseYouTubeCard: ({ url }: { url: string }) => {
    const { Text } = require('react-native');
    return <Text testID="exercise-detail.youtube">{url}</Text>;
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));

const MP4 = 'https://example.com/demo.mp4';
const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

describe('<ExerciseDemoVideo />', () => {
  test('renders only the uploaded card when youtubeUrl is null', () => {
    const { getByTestId, queryByTestId } = render(
      <ExerciseDemoVideo uploadedUrl={MP4} youtubeUrl={null} />,
    );

    getByTestId('exercise-detail.video.mp4');
    expect(queryByTestId('exercise-detail.youtube')).toBeNull();
    expect(queryByTestId('exercise-detail.video.source.uploaded')).toBeNull();
    expect(queryByTestId('exercise-detail.video.source.youtube')).toBeNull();
  });

  test('renders only the YouTube card when uploadedUrl is null', () => {
    const { getByTestId, queryByTestId } = render(
      <ExerciseDemoVideo uploadedUrl={null} youtubeUrl={YT} />,
    );

    getByTestId('exercise-detail.youtube');
    expect(queryByTestId('exercise-detail.video.mp4')).toBeNull();
    expect(queryByTestId('exercise-detail.video.source.uploaded')).toBeNull();
  });

  test('shows the toggle and defaults to uploaded when both URLs are present', () => {
    const { getByTestId, queryByTestId } = render(
      <ExerciseDemoVideo uploadedUrl={MP4} youtubeUrl={YT} />,
    );

    getByTestId('exercise-detail.video.source.uploaded');
    getByTestId('exercise-detail.video.source.youtube');
    getByTestId('exercise-detail.video.mp4');
    expect(queryByTestId('exercise-detail.youtube')).toBeNull();
  });

  test('switches to YouTube when the user taps the YouTube option', () => {
    const { getByTestId, queryByTestId } = render(
      <ExerciseDemoVideo uploadedUrl={MP4} youtubeUrl={YT} />,
    );

    fireEvent.press(getByTestId('exercise-detail.video.source.youtube'));

    getByTestId('exercise-detail.youtube');
    expect(queryByTestId('exercise-detail.video.mp4')).toBeNull();
  });

  test('renders nothing when both URLs are null', () => {
    const { queryByTestId } = render(<ExerciseDemoVideo uploadedUrl={null} youtubeUrl={null} />);

    expect(queryByTestId('exercise-detail.video')).toBeNull();
    expect(queryByTestId('exercise-detail.video.mp4')).toBeNull();
    expect(queryByTestId('exercise-detail.youtube')).toBeNull();
  });
});

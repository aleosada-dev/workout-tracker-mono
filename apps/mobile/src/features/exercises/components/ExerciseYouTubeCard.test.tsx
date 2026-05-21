import { render } from '@testing-library/react-native';
import { ExerciseYouTubeCard } from './ExerciseYouTubeCard';

// The IFrame player renders a native WebView — irrelevant here. We only assert
// whether the card renders at all based on the URL.
jest.mock('react-native-youtube-iframe', () => ({
  __esModule: true,
  default: () => null,
}));

describe('<ExerciseYouTubeCard />', () => {
  test('renders the player for a valid YouTube URL', () => {
    const { getByTestId } = render(
      <ExerciseYouTubeCard url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />,
    );

    getByTestId('exercise-detail.youtube');
  });

  test('renders the player for a youtu.be short link', () => {
    const { getByTestId } = render(<ExerciseYouTubeCard url="https://youtu.be/dQw4w9WgXcQ" />);

    getByTestId('exercise-detail.youtube');
  });

  test('renders nothing for a non-YouTube URL', () => {
    const { queryByTestId } = render(<ExerciseYouTubeCard url="https://vimeo.com/12345" />);

    expect(queryByTestId('exercise-detail.youtube')).toBeNull();
  });

  test('renders nothing for an incomplete URL', () => {
    const { queryByTestId } = render(<ExerciseYouTubeCard url="https://www.youtube.com/" />);

    expect(queryByTestId('exercise-detail.youtube')).toBeNull();
  });
});

import { render } from '@testing-library/react-native';
import { WorkoutLogCard } from '@/features/workout-logs/components/WorkoutLogCard';

const baseProps = {
  title: 'Fullbody',
  subtitle: 'Ontem às 12:43',
  muscleGroups: ['Ombros', 'Bíceps', 'Tríceps'],
  duration: '56 min',
  exerciseCount: '6 exercícios',
};

describe('<WorkoutLogCard />', () => {
  test('renders the workout title', () => {
    const { getByText } = render(<WorkoutLogCard {...baseProps} />);

    getByText('Fullbody');
  });

  test('renders the subtitle with date and time', () => {
    const { getByText } = render(<WorkoutLogCard {...baseProps} />);

    getByText('Ontem às 12:43');
  });

  test('renders one badge per muscle group', () => {
    const { getByText } = render(<WorkoutLogCard {...baseProps} />);

    getByText('Ombros');
    getByText('Bíceps');
    getByText('Tríceps');
  });

  test('renders duration and exercise count', () => {
    const { getByText } = render(<WorkoutLogCard {...baseProps} />);

    getByText('56 min');
    getByText('6 exercícios');
  });

  test('shows trophy icon when hasRecord is true', () => {
    const { getByTestId } = render(<WorkoutLogCard {...baseProps} hasRecord />);

    getByTestId('workout-log-card.trophy');
  });

  test('hides trophy icon when hasRecord is false', () => {
    const { queryByTestId } = render(<WorkoutLogCard {...baseProps} hasRecord={false} />);

    expect(queryByTestId('workout-log-card.trophy')).toBeNull();
  });
});

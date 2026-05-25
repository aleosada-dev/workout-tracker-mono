import { fireEvent, render } from '@testing-library/react-native';
import {
  AddWorkoutFolderItem,
  type WorkoutFolder,
  WorkoutFolderItem,
} from '@/features/workouts/components/WorkoutFolderItem';

const baseFolder: WorkoutFolder = {
  id: '1',
  name: 'Hipertrofia',
  workoutCount: 4,
  color: 'bg-emerald-950',
  iconColor: 'text-emerald-400',
};

describe('<WorkoutFolderItem />', () => {
  test('renders the folder name', () => {
    const { getByText } = render(<WorkoutFolderItem folder={baseFolder} />);

    getByText('Hipertrofia');
  });

  test('renders the workout count badge when count > 0', () => {
    const { getByText } = render(<WorkoutFolderItem folder={baseFolder} />);

    getByText('4');
  });

  test('does not render the badge when count is 0', () => {
    const { queryByText } = render(
      <WorkoutFolderItem folder={{ ...baseFolder, workoutCount: 0 }} />,
    );

    expect(queryByText('0')).toBeNull();
  });

  test('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<WorkoutFolderItem folder={baseFolder} onPress={onPress} />);

    fireEvent.press(getByText('Hipertrofia'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('<AddWorkoutFolderItem />', () => {
  test('renders the label', () => {
    const { getByText } = render(<AddWorkoutFolderItem label="Nova pasta" />);

    getByText('Nova pasta');
  });

  test('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<AddWorkoutFolderItem label="Nova pasta" onPress={onPress} />);

    fireEvent.press(getByText('Nova pasta'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

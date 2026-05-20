jest.mock('@/features/exercises/hooks/use-exercises', () => ({
  useExercises: jest.fn(),
}));

import { render, userEvent, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { ExerciseNameAutocomplete } from '@/features/exercises/components/ExerciseNameAutocomplete';
import { useExercises } from '@/features/exercises/hooks/use-exercises';

const mockUseExercises = useExercises as jest.Mock;

function Harness() {
  const [value, setValue] = useState('');
  return <ExerciseNameAutocomplete testID="name" value={value} onChangeText={setValue} />;
}

describe('<ExerciseNameAutocomplete />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('suggests existing exercises matching the typed text', async () => {
    mockUseExercises.mockReturnValue({
      data: [
        { id: '1', name: 'Supino Reto' },
        { id: '2', name: 'Agachamento Livre' },
      ],
    });

    const user = userEvent.setup();
    const { getByTestId, getByText, queryByText } = render(<Harness />);

    // `skipBlur` keeps the input focused so the suggestion list stays open.
    await user.type(getByTestId('name'), 'sup', { skipBlur: true });

    await waitFor(() => getByText('Supino Reto'));
    expect(queryByText('Agachamento Livre')).toBeNull();
  });
});

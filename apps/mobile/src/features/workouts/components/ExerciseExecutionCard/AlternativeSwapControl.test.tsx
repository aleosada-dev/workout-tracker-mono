jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));

import { fireEvent, render } from '@testing-library/react-native';
import { FormProvider, useForm } from 'react-hook-form';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';
import { AlternativeSwapControl } from './AlternativeSwapControl';

function renderControl(onChange?: (next: boolean) => void) {
  function Harness() {
    const form = useForm<ExecutionFormInput>({
      defaultValues: { exercises: [{ usingAlternative: false }] } as never,
    });
    return (
      <FormProvider {...form}>
        <AlternativeSwapControl
          exerciseIndex={0}
          principalName="Supino"
          alternativeName="Crucifixo"
          onChange={onChange}
        />
      </FormProvider>
    );
  }
  return render(<Harness />);
}

describe('<AlternativeSwapControl />', () => {
  test('shows the alternative label while bound to the principal', () => {
    const { queryByText } = renderControl();

    expect(queryByText('workoutExecutionScreen.alternative.use · Crucifixo')).not.toBeNull();
  });

  test('flips the bound value and reports the change on press', () => {
    const onChange = jest.fn();
    const { getByTestId, queryByText } = renderControl(onChange);

    fireEvent.press(getByTestId('workout-execution.exercise-0.swap-alternative'));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(queryByText('workoutExecutionScreen.alternative.usePrincipal · Supino')).not.toBeNull();

    fireEvent.press(getByTestId('workout-execution.exercise-0.swap-alternative'));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});

import { fireEvent, render } from '@testing-library/react-native';
import { FormProvider, type UseFormReturn, useForm } from 'react-hook-form';
import type { VariationAlias } from '@/features/exercises/api/exercises';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';
import { AliasSelector } from './AliasSelector';
import type { VariationAliasPickerArgs } from './VariationAliasPickerSheet';

let mockAliasesStore: VariationAlias[] = [];
const mockMutateAsync = jest.fn();

jest.mock('@legendapp/state/react', () => ({
  useSelector: (fn: () => unknown) => fn(),
}));

jest.mock('@/features/workouts/state/active-workout-store', () => ({
  activeWorkout$: {
    variationAliases: {
      get: () => mockAliasesStore,
      peek: () => mockAliasesStore,
      set: (next: VariationAlias[]) => {
        mockAliasesStore = next;
      },
    },
  },
}));

jest.mock('@/features/exercises/hooks/use-variation-aliases', () => ({
  useCreateVariationAlias: () => ({ mutateAsync: mockMutateAsync }),
}));

let capturedArgs: VariationAliasPickerArgs | null = null;
jest.mock('./VariationAliasPickerSheet', () => {
  const { useImperativeHandle } = require('react');
  return {
    VariationAliasPickerSheet: ({ ref }: { ref?: unknown }) => {
      useImperativeHandle(ref, () => ({
        present: (args: VariationAliasPickerArgs) => {
          capturedArgs = args;
        },
        dismiss: () => {},
      }));
      return null;
    },
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const VARIATION_ID = '11111111-1111-1111-1111-111111111111';

function alias(id: string, name: string): VariationAlias {
  return {
    id,
    userId: 'u-1',
    variationId: VARIATION_ID,
    locationId: null,
    name,
    createdAt: '2026-06-05T00:00:00.000Z',
    updatedAt: '2026-06-05T00:00:00.000Z',
  };
}

function renderSelector(aliasId: string | null) {
  const onChanged = jest.fn();
  const ref: { current: UseFormReturn<ExecutionFormInput> | null } = { current: null };
  function Harness() {
    const form = useForm<ExecutionFormInput>({
      defaultValues: {
        exercises: [
          {
            id: 'ex-1',
            exerciseType: 'strength',
            position: 0,
            supersetGroupId: 'ex-1',
            supersetOrder: 0,
            note: null,
            restSeconds: null,
            aliasId,
            // biome-ignore lint/suspicious/noExplicitAny: minimal variation for the test
            variation: { id: VARIATION_ID } as any,
            sets: [],
          },
        ],
      },
    });
    ref.current = form;
    return (
      <FormProvider {...form}>
        <AliasSelector
          exerciseIndex={0}
          variationId={VARIATION_ID}
          userId="u-1"
          onChanged={onChanged}
        />
      </FormProvider>
    );
  }
  const utils = render(<Harness />);
  return { ...utils, onChanged, form: () => ref.current as UseFormReturn<ExecutionFormInput> };
}

describe('<AliasSelector />', () => {
  beforeEach(() => {
    mockAliasesStore = [];
    capturedArgs = null;
    mockMutateAsync.mockReset();
  });

  test('shows the discreet add link when there are no aliases and none selected', () => {
    const { getByTestId, queryByTestId } = renderSelector(null);
    expect(getByTestId('workout-execution.alias.add')).toBeTruthy();
    expect(queryByTestId('workout-execution.alias.chip')).toBeNull();
  });

  test('shows a chip with the selected alias name', () => {
    mockAliasesStore = [alias('a-1', 'Leg Press Azul')];
    const { getByText, getByTestId } = renderSelector('a-1');
    expect(getByTestId('workout-execution.alias.chip')).toBeTruthy();
    expect(getByText('Leg Press Azul')).toBeTruthy();
  });

  test('selecting an alias updates the form and re-seeds loads', () => {
    mockAliasesStore = [alias('a-1', 'A'), alias('a-2', 'B')];
    const { getByTestId, onChanged, form } = renderSelector('a-1');

    fireEvent.press(getByTestId('workout-execution.alias.chip'));
    expect(capturedArgs).not.toBeNull();
    capturedArgs?.onSelect('a-2');

    expect(form().getValues('exercises.0.aliasId')).toBe('a-2');
    expect(onChanged).toHaveBeenCalled();
  });

  test('creating an alias selects the newly created one', async () => {
    mockMutateAsync.mockResolvedValue(alias('a-new', 'Nova'));
    const { getByTestId, onChanged, form } = renderSelector(null);

    fireEvent.press(getByTestId('workout-execution.alias.add'));
    await capturedArgs?.onCreate?.('Nova', null);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      variationId: VARIATION_ID,
      name: 'Nova',
      locationId: null,
    });
    expect(form().getValues('exercises.0.aliasId')).toBe('a-new');
    expect(onChanged).toHaveBeenCalled();
  });
});

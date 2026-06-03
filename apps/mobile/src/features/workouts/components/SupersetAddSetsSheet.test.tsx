jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const passthrough = ({ children }: { children?: React.ReactNode }) => children ?? null;
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
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
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, render } from '@testing-library/react-native';
import { createRef } from 'react';
import {
  type AddSetEntry,
  type SupersetAddSetsMember,
  SupersetAddSetsSheet,
  type SupersetAddSetsSheetRef,
} from '@/features/workouts/components/SupersetAddSetsSheet';

function setup(
  members: SupersetAddSetsMember[],
  options?: { initialEntries?: AddSetEntry[]; onDelete?: () => void },
) {
  const onConfirm = jest.fn();
  const ref = createRef<SupersetAddSetsSheetRef>();
  const utils = render(
    <>
      <SupersetAddSetsSheet ref={ref} />
      <PortalHost />
    </>,
  );
  act(() => ref.current?.present(members, onConfirm, options));
  return { ...utils, onConfirm };
}

const A: SupersetAddSetsMember = {
  exerciseIndex: 0,
  letter: 'A',
  name: 'A',
  existingTypes: ['normal'],
};
const B: SupersetAddSetsMember = {
  exerciseIndex: 1,
  letter: 'B',
  name: 'B',
  existingTypes: ['normal'],
};

describe('<SupersetAddSetsSheet />', () => {
  test('defaults to one normal set per member', () => {
    const { getByTestId, onConfirm } = setup([A, B]);

    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { exerciseIndex: 0, type: 'normal' },
      { exerciseIndex: 1, type: 'normal' },
    ]);
  });

  test('drop is disabled when no normal set precedes it', () => {
    const { getByTestId } = setup([
      { exerciseIndex: 0, letter: 'A', name: 'A', existingTypes: [] },
    ]);

    expect(
      getByTestId('superset-add-sets.entry.0.type.drop').props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      getByTestId('superset-add-sets.entry.0.type.normal').props.accessibilityState.disabled,
    ).toBe(false);
  });

  test('drop becomes selectable once a normal precedes it', () => {
    const { getByTestId } = setup([A]);

    fireEvent.press(getByTestId('superset-add-sets.add-entry'));

    expect(
      getByTestId('superset-add-sets.entry.1.type.drop').props.accessibilityState.disabled,
    ).toBe(false);
  });

  test('confirm returns the flat ordered entries', () => {
    const { getByTestId, onConfirm } = setup([A, B]);

    fireEvent.press(getByTestId('superset-add-sets.add-entry'));
    fireEvent.press(getByTestId('superset-add-sets.entry.2.exercise.1'));
    fireEvent.press(getByTestId('superset-add-sets.entry.2.type.drop'));
    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { exerciseIndex: 0, type: 'normal' },
      { exerciseIndex: 1, type: 'normal' },
      { exerciseIndex: 1, type: 'drop' },
    ]);
  });

  test('removing all entries disables confirm', () => {
    const { getByTestId } = setup([A, B]);

    fireEvent.press(getByTestId('superset-add-sets.entry.0.remove'));
    fireEvent.press(getByTestId('superset-add-sets.entry.0.remove'));

    expect(getByTestId('superset-add-sets.confirm').props.accessibilityState.disabled).toBe(true);
  });

  test('create mode has no delete-round button', () => {
    const { queryByTestId } = setup([A, B]);

    expect(queryByTestId('superset-add-sets.delete-round')).toBeNull();
  });

  test('edit mode pre-fills entries and preserves setId on confirm', () => {
    const initialEntries: AddSetEntry[] = [
      { exerciseIndex: 0, type: 'normal', setId: 'sa' },
      { exerciseIndex: 1, type: 'normal', setId: 'sb' },
    ];
    const onDelete = jest.fn();
    const { getByTestId, onConfirm } = setup(
      [
        { exerciseIndex: 0, letter: 'A', name: 'A', existingTypes: [] },
        { exerciseIndex: 1, letter: 'B', name: 'B', existingTypes: [] },
      ],
      { initialEntries, onDelete },
    );

    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    expect(onConfirm).toHaveBeenCalledWith(initialEntries);
  });

  test('edit mode delete-round button invokes onDelete', () => {
    const onDelete = jest.fn();
    const { getByTestId } = setup([A, B], {
      initialEntries: [{ exerciseIndex: 0, type: 'normal', setId: 'sa' }],
      onDelete,
    });

    fireEvent.press(getByTestId('superset-add-sets.delete-round'));

    expect(onDelete).toHaveBeenCalled();
  });
});

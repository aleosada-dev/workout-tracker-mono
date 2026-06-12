jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'pt' } }),
}));

import { expect, test } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { AlternativeBuilderBlock } from './AlternativeBuilderBlock';

test('renders the alternative label, composed name and variation', () => {
  render(
    <AlternativeBuilderBlock
      exerciseIndex={0}
      name="Leg Press na Máquina"
      variationName="Variação Alt"
      onSwap={() => {}}
      onRemove={() => {}}
    />,
  );
  expect(screen.getByText('workoutFormScreen.alternative.label')).toBeTruthy();
  expect(screen.getByText('Leg Press na Máquina')).toBeTruthy();
  expect(screen.getByText('Variação Alt')).toBeTruthy();
});

test('exposes swap and remove controls without set rows', () => {
  render(
    <AlternativeBuilderBlock
      exerciseIndex={0}
      name="Leg Press na Máquina"
      variationName={null}
      onSwap={() => {}}
      onRemove={() => {}}
    />,
  );
  expect(screen.getByTestId('workout-form.alternative-0.swap')).toBeTruthy();
  expect(screen.getByTestId('workout-form.alternative-0.remove')).toBeTruthy();
  expect(screen.queryByTestId('workout-form.alternative-0.set-0.type')).toBeNull();
});

import { fireEvent, render } from '@testing-library/react-native';
import { MeasurementTypeSelector } from './MeasurementTypeSelector';

describe('MeasurementTypeSelector', () => {
  test('single select reports the tapped type', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <MeasurementTypeSelector value="weight_reps" onValueChange={onValueChange} testID="mt" />,
    );

    fireEvent.press(getByTestId('mt.duration'));

    expect(onValueChange).toHaveBeenCalledWith('duration');
  });

  test('multi select adds an unselected type', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <MeasurementTypeSelector
        multiple
        value={['weight_reps']}
        onValueChange={onValueChange}
        testID="mt"
      />,
    );

    fireEvent.press(getByTestId('mt.reps'));

    expect(onValueChange).toHaveBeenCalledWith(['weight_reps', 'reps']);
  });

  test('multi select removes a selected type when others remain', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <MeasurementTypeSelector
        multiple
        value={['weight_reps', 'reps']}
        onValueChange={onValueChange}
        testID="mt"
      />,
    );

    fireEvent.press(getByTestId('mt.weight_reps'));

    expect(onValueChange).toHaveBeenCalledWith(['reps']);
  });

  test('multi select keeps at least one selected type', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <MeasurementTypeSelector
        multiple
        value={['weight_reps']}
        onValueChange={onValueChange}
        testID="mt"
      />,
    );

    fireEvent.press(getByTestId('mt.weight_reps'));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});

import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { WeightInput } from '@/features/workouts/components/WeightInput';

function Controlled({
  unit,
  initial = '',
  onKg,
}: {
  unit: 'kg' | 'lb';
  initial?: string;
  onKg?: (kg: string) => void;
}) {
  const [kg, setKg] = useState(initial);
  return (
    <WeightInput
      value={kg}
      onChange={(next) => {
        setKg(next);
        onKg?.(next);
      }}
      unit={unit}
      placeholder="weight"
    />
  );
}

describe('WeightInput', () => {
  test('stores kg as typed when the unit is kg', () => {
    const onKg = jest.fn();
    const { getByPlaceholderText } = render(<Controlled unit="kg" onKg={onKg} />);
    fireEvent.changeText(getByPlaceholderText('weight'), '80.5');
    expect(onKg).toHaveBeenLastCalledWith('80.5');
    expect(getByPlaceholderText('weight').props.value).toBe('80.5');
  });

  test('converts the typed lb value to kg before storing, keeping the typed text', () => {
    const onKg = jest.fn();
    const { getByPlaceholderText } = render(<Controlled unit="lb" onKg={onKg} />);
    fireEvent.changeText(getByPlaceholderText('weight'), '100');
    expect(onKg).toHaveBeenLastCalledWith('45.36');
    expect(getByPlaceholderText('weight').props.value).toBe('100');
  });

  test('shows a kg value converted to lb', () => {
    const { getByPlaceholderText } = render(
      <WeightInput value="100" onChange={() => {}} unit="lb" placeholder="weight" />,
    );
    expect(getByPlaceholderText('weight').props.value).toBe('220.46');
  });

  test('renders the placeholder for an empty value (kg and lb)', () => {
    const kg = render(<WeightInput value="" onChange={() => {}} unit="kg" placeholder="weight" />);
    expect(kg.getByPlaceholderText('weight').props.value).toBe('');
    const lb = render(<WeightInput value="" onChange={() => {}} unit="lb" placeholder="weight" />);
    expect(lb.getByPlaceholderText('weight').props.value).toBe('');
  });

  test('renders the placeholder for an undefined value in lb without crashing', () => {
    const { getByPlaceholderText } = render(
      <WeightInput value={undefined} onChange={() => {}} unit="lb" placeholder="weight" />,
    );
    expect(getByPlaceholderText('weight').props.value).toBe('');
  });

  test('caps integer digits per unit', () => {
    const { getByPlaceholderText } = render(<Controlled unit="lb" />);
    fireEvent.changeText(getByPlaceholderText('weight'), '12345');
    expect(getByPlaceholderText('weight').props.value).toBe('1234');
  });
});

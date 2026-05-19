import { fireEvent, render } from '@testing-library/react-native';
import { Text } from '@workout-tracker/ui-mobile';
import { MenuCard } from '@/features/shared/components/MenuCard';

describe('<MenuCard />', () => {
  test('renders its children', () => {
    const { getByText } = render(
      <MenuCard>
        <Text>Treinos</Text>
      </MenuCard>,
    );

    getByText('Treinos');
  });

  test('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <MenuCard onPress={onPress}>
        <Text>Treinos</Text>
      </MenuCard>,
    );

    fireEvent.press(getByText('Treinos'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

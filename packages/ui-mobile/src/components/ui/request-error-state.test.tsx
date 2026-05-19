import { fireEvent, render } from '@testing-library/react-native';
import { RequestErrorState } from './request-error-state';

describe('<RequestErrorState />', () => {
  test('renders title and subtitle', () => {
    const { getByText } = render(<RequestErrorState title="Falhou" subtitle="Tente de novo" />);

    getByText('Falhou');
    getByText('Tente de novo');
  });

  test('fires retry callback when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <RequestErrorState
        title="Falhou"
        subtitle="Tente de novo"
        retry={{ label: 'Tentar', onPress }}
      />,
    );

    fireEvent.press(getByText('Tentar'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('omits the retry button when no retry is provided', () => {
    const { queryByText } = render(<RequestErrorState title="Falhou" subtitle="Tente de novo" />);

    expect(queryByText('Tentar')).toBeNull();
  });
});

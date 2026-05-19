import { fireEvent, render } from '@testing-library/react-native';
import { EmptyState } from './empty-state';

describe('<EmptyState />', () => {
  test('renders title and subtitle', () => {
    const { getByText } = render(
      <EmptyState
        title="Nenhum exercício encontrado"
        subtitle="Nenhum exercício encontrado com os filtros atuais."
      />,
    );

    getByText('Nenhum exercício encontrado');
    getByText('Nenhum exercício encontrado com os filtros atuais.');
  });

  test('does not render a CTA button when cta prop is omitted', () => {
    const { queryByRole } = render(<EmptyState title="Vazio" subtitle="Nada aqui." />);

    expect(queryByRole('button')).toBeNull();
  });

  test('renders a CTA button with the provided label', () => {
    const { getByText } = render(
      <EmptyState
        title="Vazio"
        subtitle="Nada aqui."
        cta={{ label: 'Limpar filtros', onPress: jest.fn() }}
      />,
    );

    getByText('Limpar filtros');
  });

  test('calls cta.onPress when the button is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState
        title="Vazio"
        subtitle="Nada aqui."
        cta={{ label: 'Tentar novamente', onPress }}
      />,
    );

    fireEvent.press(getByText('Tentar novamente'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('applies testID to the root wrapper', () => {
    const { getByTestId } = render(
      <EmptyState title="Vazio" subtitle="Nada aqui." testID="exercises.empty" />,
    );

    getByTestId('exercises.empty');
  });
});

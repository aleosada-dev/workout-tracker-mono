import { render, userEvent, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Autocomplete } from './autocomplete';

function Harness({
  options,
  onSelect,
  maxOptions,
  minChars,
  animated,
  debounceMs,
}: {
  options: string[];
  onSelect?: (option: string) => void;
  maxOptions?: number;
  minChars?: number;
  animated?: boolean;
  debounceMs?: number;
}) {
  const [value, setValue] = useState('');
  return (
    <Autocomplete
      testID="ac"
      value={value}
      onChangeText={setValue}
      options={options}
      onSelect={onSelect}
      maxOptions={maxOptions}
      minChars={minChars}
      animated={animated}
      debounceMs={debounceMs}
    />
  );
}

const OPTIONS = ['Supino', 'Supino Inclinado', 'Agachamento', 'Levantamento Terra'];

describe('<Autocomplete />', () => {
  test('shows matching suggestions after typing at least minChars characters', async () => {
    const user = userEvent.setup();
    const { getByTestId, getByText, queryByText } = render(<Harness options={OPTIONS} />);

    // `skipBlur` keeps the input focused so the suggestion list stays open.
    await user.type(getByTestId('ac'), 'sup', { skipBlur: true });

    await waitFor(() => getByText('Supino'));
    getByText('Supino Inclinado');
    expect(queryByText('Agachamento')).toBeNull();
  });

  test('does not show suggestions below minChars', async () => {
    const user = userEvent.setup();
    // `animated={false}` evita o fade-out do reanimated, que mantém o nó
    // montado durante a saída. `debounceMs={0}` torna a atualização do filtro
    // síncrona — sob carga (workers paralelos), o debounce padrão de 300ms
    // pode estourar o timeout do waitFor e o portal não chega a desmontar.
    const { getByTestId, getByText, queryByTestId } = render(
      <Harness options={OPTIONS} animated={false} debounceMs={0} />,
    );

    const input = getByTestId('ac');
    await user.type(input, 'sup', { skipBlur: true });
    await waitFor(() => getByText('Supino'));

    await user.type(input, '{Backspace}', { skipBlur: true });
    await waitFor(() => expect(queryByTestId('ac.suggestions')).toBeNull());
  });

  test('caps the list at maxOptions', async () => {
    const user = userEvent.setup();
    const many = ['Rosca 1', 'Rosca 2', 'Rosca 3', 'Rosca 4', 'Rosca 5', 'Rosca 6', 'Rosca 7'];
    const { getByTestId, getAllByRole } = render(<Harness options={many} maxOptions={5} />);

    await user.type(getByTestId('ac'), 'rosca', { skipBlur: true });

    await waitFor(() => expect(getAllByRole('button')).toHaveLength(5));
  });

  test('shows and selects the first suggestion', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const { getByTestId, getByText } = render(<Harness options={OPTIONS} onSelect={onSelect} />);

    await user.type(getByTestId('ac'), 'sup', { skipBlur: true });

    await waitFor(() => getByText('Supino'));
    await user.press(getByText('Supino'));
    expect(onSelect).toHaveBeenCalledWith('Supino');
  });

  test('closes the suggestions when the backdrop is pressed', async () => {
    const user = userEvent.setup();
    const { getByTestId, getByText, queryByTestId } = render(<Harness options={OPTIONS} />);

    await user.type(getByTestId('ac'), 'sup', { skipBlur: true });
    await waitFor(() => getByText('Supino'));

    await user.press(getByTestId('ac.backdrop'));
    await waitFor(() => expect(queryByTestId('ac.suggestions')).toBeNull());
  });

  test('still shows suggestions with animation disabled', async () => {
    const user = userEvent.setup();
    const { getByTestId, getByText } = render(<Harness options={OPTIONS} animated={false} />);

    await user.type(getByTestId('ac'), 'sup', { skipBlur: true });

    await waitFor(() => getByText('Supino'));
  });

  test('calls onSelect with the chosen option', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const { getByTestId, getByText } = render(<Harness options={OPTIONS} onSelect={onSelect} />);

    const input = getByTestId('ac');
    await user.type(input, 'sup', { skipBlur: true });
    await waitFor(() => getByText('Supino Inclinado'));

    await user.press(getByText('Supino Inclinado'));
    expect(onSelect).toHaveBeenCalledWith('Supino Inclinado');
  });
});

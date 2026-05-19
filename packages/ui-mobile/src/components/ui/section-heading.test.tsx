import { render } from '@testing-library/react-native';
import { Dumbbell } from 'lucide-react-native';
import { SectionHeading } from './section-heading';

describe('<SectionHeading />', () => {
  test('renders the title', () => {
    const { getByText } = render(<SectionHeading icon={Dumbbell} title="Séries — 23 abr" />);

    getByText('Séries — 23 abr');
  });

  test('renders the title with a heading role', () => {
    const { getByRole } = render(<SectionHeading icon={Dumbbell} title="Recordes pessoais" />);

    getByRole('heading', { name: 'Recordes pessoais' });
  });

  test('applies testID to the root wrapper', () => {
    const { getByTestId } = render(
      <SectionHeading icon={Dumbbell} title="Evolução" testID="exercise-detail.progress" />,
    );

    getByTestId('exercise-detail.progress');
  });
});

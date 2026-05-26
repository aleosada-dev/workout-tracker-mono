import { render } from '@testing-library/react-native';
import { WorkoutCard, type WorkoutCardData } from './WorkoutCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; date?: string; defaultValue?: string }) => {
      if (key === 'workoutsScreen.card.start') return 'Iniciar treino';
      if (key === 'workoutsScreen.card.lastPerformed.never') return 'Nunca executado';
      if (key === 'workoutsScreen.card.lastPerformed.prefix') return `Último treino: ${opts?.date}`;
      if (key === 'workoutsScreen.card.exerciseExtra') return `+${opts?.count} mais`;
      if (key === 'common.relativeDays.today') return 'Hoje';
      if (key === 'common.relativeDays.yesterday') return 'Ontem';
      if (key === 'common.relativeDays.daysAgo') return `há ${opts?.count} dias`;
      if (key.startsWith('exerciseNames.') || key.startsWith('variationNames.'))
        return opts?.defaultValue ?? key;
      if (key.startsWith('equipment.')) return key.slice('equipment.'.length);
      return key;
    },
    i18n: { language: 'pt' },
  }),
}));

jest.mock('@/features/shared/hooks/use-date-fns-locale', () => {
  const { ptBR } = jest.requireActual('date-fns/locale');
  return { useDateFnsLocale: () => ptBR };
});

function baseWorkout(overrides: Partial<WorkoutCardData> = {}): WorkoutCardData {
  return {
    id: 'w1',
    name: 'Push A',
    exerciseCount: 2,
    topExercises: [
      {
        slug: null,
        name: 'Supino reto',
        variationSlug: null,
        variationName: 'halteres',
        equipmentSlug: 'barbell',
        equipmentPreposition: 'com',
      },
      {
        slug: null,
        name: 'Desenvolvimento militar',
        variationSlug: null,
        variationName: 'barra',
        equipmentSlug: 'barbell',
        equipmentPreposition: 'com',
      },
    ],
    lastPerformedAt: null,
    ...overrides,
  };
}

describe('<WorkoutCard />', () => {
  test('renders the workout name', () => {
    const { getByText } = render(<WorkoutCard workout={baseWorkout()} />);
    getByText('Push A');
  });

  test('renders up to 2 exercises with variations', () => {
    const { getByText } = render(<WorkoutCard workout={baseWorkout()} />);
    getByText(/Supino reto/);
    getByText(/halteres/);
    getByText(/Desenvolvimento militar/);
    getByText(/barra/);
  });

  test('omits "+N mais" when exerciseCount <= 2', () => {
    const { queryByText } = render(<WorkoutCard workout={baseWorkout({ exerciseCount: 2 })} />);
    expect(queryByText(/\+\d+ mais/)).toBeNull();
  });

  test('shows "+N mais" when exerciseCount > 2', () => {
    const { getByText } = render(<WorkoutCard workout={baseWorkout({ exerciseCount: 7 })} />);
    getByText('+5 mais');
  });

  test('shows "Nunca executado" when lastPerformedAt is null', () => {
    const { getByText } = render(<WorkoutCard workout={baseWorkout({ lastPerformedAt: null })} />);
    getByText('Nunca executado');
  });

  test('shows "Último treino: <date>" when lastPerformedAt is set', () => {
    const date = new Date('2026-05-22T10:00:00-03:00').toISOString();
    const { getByText } = render(<WorkoutCard workout={baseWorkout({ lastPerformedAt: date })} />);
    getByText(/Último treino: /);
  });

  test('renders exercise name without "· variação" when variationName is null', () => {
    const { queryByText } = render(
      <WorkoutCard
        workout={baseWorkout({
          topExercises: [
            {
              slug: null,
              name: 'Barra fixa',
              variationSlug: null,
              variationName: null,
              equipmentSlug: 'bodyweight',
              equipmentPreposition: 'com',
            },
          ],
          exerciseCount: 1,
        })}
      />,
    );
    // The bullet "·" still prefixes each exercise line — verify no second "·" appears
    // (which would indicate a "· variação" suffix).
    expect(queryByText(/·\s+[^·]+·/)).toBeNull();
  });
});

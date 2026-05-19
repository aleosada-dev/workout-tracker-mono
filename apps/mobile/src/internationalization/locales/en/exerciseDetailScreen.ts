export default {
  progress: 'Progress',
  error: {
    title: 'Could not load this exercise.',
    subtitle: 'Check your connection and try again.',
    retry: 'Try again',
  },
  chartEmptyTitle: 'No data yet',
  chartEmptySubtitle: 'Log this exercise to see your progress here.',
  chartUnloadedTitle: 'No weight tracked',
  chartUnloadedSubtitle: "This exercise doesn't use weight. Track progress in Reps or Sets.",
  metrics: {
    maxWeight: 'Max weight',
    volume: 'Volume',
    maxReps: 'Max reps',
    sets: 'Sets',
  },
  muscles: {
    primary: 'Primary',
    secondary: 'Auxiliary',
  },
  video: {
    source: {
      uploaded: 'Device',
      youtube: 'YouTube',
    },
  },
  sets: {
    title: 'Sets: {{date}}',
    titleEmpty: 'Last sets',
    emptyTitle: 'No sets logged',
    emptySubtitle: 'This exercise has no recorded sessions yet.',
    headers: {
      index: '#',
      type: 'Type',
      weight: 'Weight',
      reps: 'Reps',
    },
    types: {
      helpHint: 'Set types',
      helpTitle: 'Set types',
      descriptions: {
        warmup:
          'Warm-up set done before working sets. Uses lighter loads to prepare muscles and joints.',
        normal:
          'Standard working set. The core of the workout where the main training stimulus happens.',
        drop: 'A set performed immediately after a normal or another drop set, reducing the load without rest. Increases volume and intensity.',
        cluster:
          'A set split into mini-sets with short rests (10–20s) between them, allowing heavier loads across more total reps.',
      },
    },
  },
  personalRecords: {
    title: 'Personal records',
    emptyTitle: 'No records yet',
    emptySubtitle: 'Personal records appear once you log this exercise.',
    matchHint: 'Matches the selected metric',
  },
};

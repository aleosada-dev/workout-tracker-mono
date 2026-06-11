export default {
  save: 'Save',
  saved: {
    title: 'Preferences saved',
  },
  sections: {
    general: 'General',
    workout: 'Workout',
  },
  defaultRestSeconds: {
    label: 'Default rest time',
    description: 'Pre-fills the rest time for new sets.',
    placeholder: 'No default',
    pickerTitle: 'Rest time',
    confirm: 'Confirm',
    clear: 'Clear',
  },
  weightUnit: {
    label: 'Weight unit',
  },
  defaultLocation: {
    label: 'Default training location',
    description: 'Comes pre-selected when you open a workout.',
    none: 'No location',
  },
  loadRounding: {
    label: 'Load rounding',
    description: 'Round the suggested load of drop and cluster sets.',
    modes: {
      none: 'Off',
      half: '0.5',
      one: '1',
      twoAndHalf: '2.5',
    },
  },
  countWarmupSets: {
    label: 'Count warmup sets',
    description: 'Include warmup sets in totals and volume.',
  },
  autoStartRestTimer: {
    label: 'Auto-start rest timer',
    description: 'Start the rest timer when a set is completed.',
  },
  autoFillReps: {
    label: 'Auto-fill sets',
    description:
      'When building or editing a workout, repeat the first set’s reps, duration and distance into the following empty sets.',
  },
  defaultSetsCount: {
    label: 'Sets per exercise',
    description: 'How many sets are added when you include an exercise in a workout.',
  },
  error: {
    title: 'Could not load your preferences',
    subtitle: 'Check your connection and try again.',
    retry: 'Retry',
  },
};

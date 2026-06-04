export default {
  title: 'Workout summary',
  save: {
    button: 'Finish workout',
    saving: 'Saving...',
    success: 'Workout saved',
  },
  stats: {
    totalTime: 'Duration',
    completedSets: 'Sets',
    totalVolume: 'Volume',
  },
  durationEdit: {
    title: 'Adjust duration',
    confirm: 'Done',
  },
  longDuration: {
    title: 'Very long workout',
    description: 'This workout is over 2 hours. Do you want to adjust the time before finishing?',
    adjust: 'Adjust time',
    finishAnyway: 'Finish anyway',
  },
  empty: {
    title: 'No workout to summarize',
    subtitle: 'Finish an ongoing workout to see its summary here.',
    cta: 'Go back',
  },
  coached: {
    label: 'Personal training class',
    selectPlaceholder: 'New class (unlinked)',
    none: 'No class scheduled today.',
  },
  records: {
    title: 'Session records',
    metrics: {
      maxWeight: 'Highest weight',
      volume: 'Highest volume',
      maxReps: 'Most reps',
      sets: 'Most sets',
    },
  },
  comparison: {
    title: 'Comparison with previous session',
    basedOn: 'Based on the previous workout from {{date}}.',
    noPrevious: 'There is no previous session of this same workout to compare against yet.',
    series: 'Sets:',
    volume: 'Volume:',
    previousSuffix: 'prev.',
    setsUnit_one: 'set',
    setsUnit_other: 'sets',
  },
};

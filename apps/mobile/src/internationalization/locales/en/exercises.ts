export default {
  type: {
    musculacao: 'Strength training',
    preparatorio: 'Warm-up',
  },
  measurementType: {
    weight_reps: 'Weight & reps',
    reps: 'Reps',
    duration: 'Time',
    distance: 'Distance',
  },
  measurementTypeHelp: {
    hint: 'What is a measurement type?',
    title: 'Measurement type',
    descriptions: {
      weight_reps: 'Tracks load and repetitions per set. E.g. bench press, squat.',
      reps: 'Tracks only the number of repetitions, no load. E.g. push-up, pull-up.',
      duration: 'Tracks time performed or held. E.g. plank, isometric hold.',
      distance: 'Tracks the distance covered. E.g. running, rowing, swimming.',
    },
  },
  visibility: {
    public: 'Public',
    shared: 'Shared',
    owned: 'Owned',
  },
};

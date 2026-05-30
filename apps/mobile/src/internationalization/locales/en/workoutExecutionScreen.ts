export default {
  loadingTitle: 'Loading workout…',
  tabs: {
    preparatorio: 'Warmup',
    musculacao: 'Strength',
  },
  actions: {
    timer: 'Timer',
    notes: 'Notes',
    addExercise: 'Add exercise',
    kgLbsCalculator: 'kg / lbs calculator',
    finish: 'Finish workout',
    more: 'More options',
  },
  empty: {
    title: 'No exercises yet',
    subtitle: 'Add exercises to start tracking your sets.',
  },
  exercise: {
    addSet: 'Add set',
    noVariation: 'No variation',
    delete: 'Delete',
    cancel: 'Cancel',
    headers: {
      weight: 'Weight',
      reps: 'Reps',
      target: 'Target',
    },
  },
  notesSheet: {
    title: 'Workout notes',
    subtitle: 'Jot down anything worth remembering later.',
    placeholder: 'How the warmup felt, adjustments, cues…',
    save: 'Save',
  },
  kgLbsCalculatorSheet: {
    title: 'Calculator (kg x lbs)',
    headers: {
      kg: 'Kilograms',
      lb: 'Pounds',
    },
    swap: 'Swap units',
    copy: 'Copy',
  },
  timerSheet: {
    title: 'Clock',
    tabs: {
      timer: 'Timer',
      stopwatch: 'Stopwatch',
    },
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    reset: 'Reset',
    confirm: 'Done',
    notification: {
      title: 'Rest finished',
      body: 'Time for the next set.',
    },
  },
  setTypePicker: {
    title: 'Set type',
    rules:
      'Warmup sets must come before the others. Drop sets and cluster sets must be followed by a normal set or another set of the same type.',
    removeSet: 'Delete set',
    removeExerciseSet: 'Delete exercise set',
    removeSupersetSet: 'Delete entire set',
  },
  superset: {
    title: 'Superset',
    help: {
      title: 'What is a superset?',
      description:
        'A superset combines 2 or 3 exercises performed back-to-back, with no rest between them. Do one set of each exercise in order (A, B, C), then rest. Check the set as done once you finish every exercise in the group.',
    },
  },
};

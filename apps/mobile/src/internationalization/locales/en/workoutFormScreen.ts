export default {
  createTitle: 'New workout',
  editTitle: 'Edit workout',
  fields: {
    name: 'Name',
    namePlaceholder: 'E.g.: Workout A — Chest & Triceps',
    description: 'Description',
    descriptionPlaceholder: 'Optional',
  },
  validation: {
    name: {
      required: 'Enter the workout name',
      tooLong: 'Name is too long',
    },
    reps: {
      required: 'Enter the reps',
      maxBelowMin: 'Max below min',
    },
    duration: {
      required: 'Enter the target time',
    },
  },
  exercise: {
    headers: {
      reps: 'Reps (Min/Max)',
      repsMin: 'Min',
      repsMax: 'Max',
      loadPercent: 'Load (%)',
    },
    loadPercentHelp: {
      hint: 'What is the load percentage?',
      title: 'Load (%)',
      description:
        'Percentage of the load relative to the previous (normal) set. Used in drop and cluster sets.',
    },
    addNote: 'Add note',
    editNote: 'Edit note',
    editRest: 'Edit rest',
    restUndefined: 'Undefined',
  },
  alternative: {
    add: 'Add alternative exercise',
    remove: 'Remove alternative',
    swap: 'Swap alternative variation',
    label: 'Alternative',
    incompatible: {
      title: 'Incompatible measurement type',
      message: 'The alternative must share the same measurement type as the exercise.',
    },
  },
  noteSheet: {
    title: 'Exercise note',
    placeholder: 'E.g.: controlled eccentric',
    save: 'Save',
  },
  actions: {
    save: 'Save workout',
  },
  success: {
    createdTitle: 'Workout created',
    updatedTitle: 'Workout updated',
  },
  noStrengthExercise: {
    title: 'Add a strength exercise',
    message: 'Include at least one strength exercise to save the workout.',
  },
  validationError: {
    title: 'Could not save',
    message: 'Review the validation errors before saving.',
  },
  discard: {
    title: 'Discard changes?',
    description: 'The changes made to this workout will be lost.',
    confirm: 'Discard',
    cancel: 'Keep editing',
  },
  muscleVolume: {
    title: 'Sets by muscle',
    trigger: 'View sets by muscle',
    levels: {
      1: 'Group',
      2: 'Muscle',
      3: 'Specific',
    },
    empty: {
      title: 'No sets yet',
      subtitle: 'Add exercises with sets to see volume by muscle.',
    },
    rowA11y: '{{name}}: {{count}} sets',
  },
};

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
    addDetails: 'Add note or rest',
    editDetails: 'Edit note and rest',
    addNote: 'Add note',
    editNote: 'Edit note',
    editRest: 'Edit rest',
    restUndefined: 'Undefined',
  },
  noteSheet: {
    title: 'Exercise note',
    placeholder: 'E.g.: controlled eccentric',
    save: 'Save',
  },
  settingsSheet: {
    title: 'Note and rest',
    noteLabel: 'Exercise note',
    notePlaceholder: 'E.g.: controlled eccentric',
    restLabel: 'Rest between sets',
    restNone: 'No rest set',
    clearRest: 'Remove rest',
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
};

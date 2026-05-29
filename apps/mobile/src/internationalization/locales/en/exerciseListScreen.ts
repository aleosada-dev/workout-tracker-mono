export default {
  title: 'Exercises',
  emptyTitle: 'No exercises found.',
  emptySubtitle: 'Add an exercise to get started.',
  searchPlaceholder: 'Search exercise',
  searchEmptyTitle: 'No results',
  searchEmptySubtitle: 'Try a different search term.',
  error: {
    title: 'Could not load exercises.',
    retry: 'Try again',
  },
  actions: {
    select: 'Select',
    filter: 'Filter',
    filterWithCount: 'Filter ({{count}})',
    addExercise: 'Add exercise',
    addToWorkout: 'Add to workout',
    createExercise: 'Create exercise',
    share: 'Share',
    move: 'Move',
    copy: 'Copy',
    delete: 'Delete',
  },
  picker: {
    title: 'Add exercises',
    actions: {
      more: 'More options',
      createSuperset: 'Create superset',
    },
  },
  addExercise: {
    title: 'Add exercise',
    subtitle: 'Fill in the fields to create the exercise.',
    success: {
      title: 'Exercise created.',
      message: 'The exercise is now in your list.',
    },
    fields: {
      name: 'Exercise name',
      exerciseType: 'Exercise type',
      variation: 'Variation',
      primaryMuscle: 'Primary muscle',
      secondaryMuscle: 'Secondary muscle',
      equipment: 'Equipment',
      videoUrl: 'Youtube URL',
    },
    validation: {
      name: 'Enter the exercise name',
      exerciseType: 'Select the exercise type',
      primaryMuscle: 'Select the primary muscle',
      equipment: 'Select an equipment',
      youtubeVideoUrl: 'Enter a valid YouTube URL',
    },
    errors: {
      conflict: {
        title: 'Exercise already exists',
        message: 'A variation with this name and equipment already exists.',
      },
    },
    video: {
      label: 'Uploaded video',
      hint: 'Pick a short video from your gallery — under 100 MB and 30 seconds.',
      select: 'Select video',
      selected: 'Selected video',
      remove: 'Remove',
      uploading: 'Uploading video…',
      errors: {
        tooLarge: {
          title: 'Video too large',
          message: 'The video must be under 100 MB.',
        },
        tooLong: {
          title: 'Video too long',
          message: 'The video must be under 30 seconds.',
        },
        unsupportedFormat: {
          title: 'Unsupported format',
          message: 'Use an MP4, WebM or MOV video.',
        },
        uploadFailed: {
          title: 'Upload failed',
          message: 'Could not upload the video. Please try again.',
        },
      },
    },
  },
  editExercise: {
    subtitle: 'Update the exercise information.',
    success: {
      title: 'Exercise updated.',
      message: 'Your changes are saved.',
    },
  },
  deleteExercise: {
    action: 'Delete exercise',
    confirm: {
      title: 'Delete exercise?',
      message: 'This exercise will be removed from your list. Workout history is preserved.',
      cancel: 'Cancel',
      confirm: 'Delete',
    },
    success: {
      title: 'Exercise deleted.',
      message: 'The exercise was removed from your list.',
    },
  },
  bulkDelete: {
    onlyOwn: {
      title: 'Invalid selection',
      message: 'You can only delete exercises you created.',
    },
    confirm: {
      title: 'Delete exercises?',
      message: '{{count}} exercises will be removed from your list. Workout history is preserved.',
      message_one:
        '{{count}} exercise will be removed from your list. Workout history is preserved.',
      cancel: 'Cancel',
      confirm: 'Delete',
    },
    success: {
      title: 'Exercises deleted.',
      message: '{{count}} exercises were removed from your list.',
      message_one: '{{count}} exercise was removed from your list.',
    },
    error: {
      title: 'Could not delete',
      message: 'Please try again in a moment.',
    },
  },
  bulkCopy: {
    onlyPublicOrShared: {
      title: 'Invalid selection',
      message: 'You can only copy public exercises or ones shared with you.',
    },
    confirm: {
      title: 'Copy exercises?',
      message: '{{count}} exercises will be copied to your library.',
      message_one: '{{count}} exercise will be copied to your library.',
      cancel: 'Cancel',
      confirm: 'Copy',
    },
    success: {
      title: 'Exercises copied.',
      message: '{{count}} exercises were added to your library.',
      message_one: '{{count}} exercise was added to your library.',
    },
    error: {
      title: 'Could not copy',
      message: 'Please try again in a moment.',
    },
  },
  filter: {
    title: 'Filter exercises',
    apply: 'Apply',
    clear: 'Clear',
    sections: {
      type: 'Type',
      visibility: 'Visibility',
      primaryMuscle: 'Primary muscle',
      equipment: 'Equipment',
    },
    visibility: {
      all: 'All',
    },
    placeholders: {
      primaryMuscle: 'Select muscle',
      equipment: 'Select equipment',
    },
    warnings: {
      typeMinOne: {
        title: 'Select at least one type',
        message: 'At least one exercise type must be selected.',
      },
    },
  },
};

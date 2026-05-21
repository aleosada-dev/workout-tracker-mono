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
    share: 'Share',
    move: 'Move',
    delete: 'Delete',
  },
  addExercise: {
    title: 'Add exercise',
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

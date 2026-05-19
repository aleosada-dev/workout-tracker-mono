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

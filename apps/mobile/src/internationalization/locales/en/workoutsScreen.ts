export default {
  exercises: 'Exercises',
  workouts: 'Workouts',
  cardio: 'Cardio',
  periodization: 'Periodization',
  newFolder: 'New folder',
  folders: 'Folders',
  newFolderSheet: {
    title: 'New folder',
    subtitle: 'Pick a name and a color to organize your workouts.',
    nameLabel: 'Name',
    namePlaceholder: 'E.g.: Hypertrophy',
    colorLabel: 'Color',
    submit: 'Create',
    validation: {
      name: 'Enter a name for the folder.',
      nameMax: 'Name must be at most 20 characters.',
      nameConflict: 'You already have a folder with this name.',
      color: 'Pick a color.',
    },
  },
  error: {
    title: 'Could not load folders.',
    subtitle: 'Check your connection and try again.',
    retry: 'Try again',
  },
  emptyTitle: 'No workouts',
  emptySubtitle: 'Create a workout or open a folder to see the workouts inside.',
  card: {
    start: 'Start workout',
    exerciseExtra_one: '+{{count}} more',
    exerciseExtra_other: '+{{count}} more',
    lastPerformed: {
      never: 'Never performed',
      prefix: 'Last performed: {{date}}',
    },
  },
  folderDetail: {
    workoutCount_one: '{{count}} workout',
    workoutCount_other: '{{count}} workouts',
    emptyTitle: 'No workouts here yet',
    emptySubtitle: 'Workouts you move into this folder will show up here.',
  },
};

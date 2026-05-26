export default {
  exercises: 'Exercícios',
  workouts: 'Treinos',
  cardio: 'Cardio',
  periodization: 'Programação',
  newFolder: 'Nova pasta',
  folders: 'Pastas',
  newFolderSheet: {
    title: 'Nova pasta',
    subtitle: 'Escolha um nome e uma cor para organizar seus treinos.',
    nameLabel: 'Nome',
    namePlaceholder: 'Ex: Hipertrofia',
    colorLabel: 'Cor',
    submit: 'Criar',
    validation: {
      name: 'Informe um nome para a pasta.',
      nameMax: 'O nome deve ter no máximo 20 caracteres.',
      nameConflict: 'Você já tem uma pasta com esse nome.',
      color: 'Escolha uma cor.',
    },
  },
  error: {
    title: 'Não foi possível carregar as pastas.',
    subtitle: 'Verifique sua conexão e tente novamente.',
    retry: 'Tentar novamente',
  },
  emptyTitle: 'Nenhum treino',
  emptySubtitle: 'Crie um treino ou abra uma pasta para ver os treinos lá dentro.',
  card: {
    start: 'Iniciar treino',
    exerciseExtra_one: '+{{count}} mais',
    exerciseExtra_other: '+{{count}} mais',
    lastPerformed: {
      never: 'Nunca executado',
      prefix: 'Último treino: {{date}}',
    },
  },
  folderDetail: {
    workoutCount_one: '{{count}} treino',
    workoutCount_other: '{{count}} treinos',
    emptyTitle: 'Nenhum treino aqui ainda',
    emptySubtitle: 'Treinos que você mover para essa pasta vão aparecer aqui.',
  },
};

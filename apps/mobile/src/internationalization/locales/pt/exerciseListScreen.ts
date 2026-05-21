export default {
  title: 'Exercícios',
  emptyTitle: 'Nenhum exercício encontrado.',
  emptySubtitle: 'Adicione um exercício para começar.',
  searchPlaceholder: 'Buscar exercício',
  searchEmptyTitle: 'Nenhum resultado',
  searchEmptySubtitle: 'Tente outro termo de busca.',
  error: {
    title: 'Não foi possível carregar os exercícios.',
    retry: 'Tentar novamente',
  },
  actions: {
    select: 'Selecionar',
    filter: 'Filtrar',
    filterWithCount: 'Filtrar ({{count}})',
    addExercise: 'Adicionar Exercício',
    share: 'Compartilhar',
    move: 'Mover',
    delete: 'Excluir',
  },
  addExercise: {
    title: 'Adicionar exercício',
    success: {
      title: 'Exercício criado.',
      message: 'O exercício já aparece na sua lista.',
    },
    fields: {
      name: 'Nome do exercício',
      exerciseType: 'Tipo de exercício',
      variation: 'Variação',
      primaryMuscle: 'Músculo primário',
      secondaryMuscle: 'Músculo secundário',
      equipment: 'Equipamento',
      videoUrl: 'Youtube URL',
    },
    validation: {
      name: 'Informe o nome do exercício',
      exerciseType: 'Selecione o tipo de exercício',
      primaryMuscle: 'Selecione o músculo primário',
      equipment: 'Selecione um equipamento',
      youtubeVideoUrl: 'Informe uma URL válida',
    },
    errors: {
      conflict: {
        title: 'Exercício já existe',
        message: 'Já existe uma variação com esse nome e equipamento.',
      },
    },
    video: {
      label: 'Vídeo enviado',
      hint: 'Escolha um vídeo curto da galeria — menos de 100 MB e menos de 30 segundos.',
      select: 'Selecionar vídeo',
      selected: 'Vídeo selecionado',
      remove: 'Remover',
      errors: {
        tooLarge: {
          title: 'Vídeo muito grande',
          message: 'O vídeo deve ter menos de 100 MB.',
        },
        tooLong: {
          title: 'Vídeo muito longo',
          message: 'O vídeo deve ter menos de 30 segundos.',
        },
      },
    },
  },
  filter: {
    title: 'Filtrar exercícios',
    apply: 'Aplicar',
    clear: 'Limpar',
    sections: {
      type: 'Tipo',
      visibility: 'Visibilidade',
      primaryMuscle: 'Músculo primário',
      equipment: 'Equipamento',
    },
    visibility: {
      all: 'Todos',
    },
    placeholders: {
      primaryMuscle: 'Selecionar músculo',
      equipment: 'Selecionar equipamento',
    },
    warnings: {
      typeMinOne: {
        title: 'Selecione ao menos um tipo',
        message: 'Pelo menos um tipo de exercício deve estar selecionado.',
      },
    },
  },
};

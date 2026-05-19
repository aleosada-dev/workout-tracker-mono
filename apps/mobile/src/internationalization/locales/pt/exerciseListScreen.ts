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

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
    addToWorkout: 'Adicionar ao treino',
    createExercise: 'Criar Exercício',
    share: 'Compartilhar',
    move: 'Mover',
    copy: 'Copiar',
    delete: 'Excluir',
  },
  picker: {
    title: 'Adicionar exercícios',
    actions: {
      more: 'Mais opções',
      createSuperset: 'Criar superset',
    },
  },
  addExercise: {
    title: 'Adicionar exercício',
    subtitle: 'Preencha os campos para criar o exercício.',
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
      youtubeVideoUrl: 'Informe uma URL do YouTube válida',
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
      uploading: 'Enviando vídeo…',
      errors: {
        tooLarge: {
          title: 'Vídeo muito grande',
          message: 'O vídeo deve ter menos de 100 MB.',
        },
        tooLong: {
          title: 'Vídeo muito longo',
          message: 'O vídeo deve ter menos de 30 segundos.',
        },
        unsupportedFormat: {
          title: 'Formato não suportado',
          message: 'Use um vídeo MP4, WebM ou MOV.',
        },
        uploadFailed: {
          title: 'Falha no envio',
          message: 'Não foi possível enviar o vídeo. Tente novamente.',
        },
      },
    },
  },
  editExercise: {
    subtitle: 'Atualize as informações do exercício.',
    success: {
      title: 'Exercício atualizado.',
      message: 'As alterações já estão salvas.',
    },
  },
  deleteExercise: {
    action: 'Excluir exercício',
    confirm: {
      title: 'Excluir exercício?',
      message: 'Este exercício será removido da sua lista. O histórico de treinos é preservado.',
      cancel: 'Cancelar',
      confirm: 'Excluir',
    },
    success: {
      title: 'Exercício excluído.',
      message: 'O Exercício foi removido da sua lista.',
    },
  },
  bulkDelete: {
    onlyOwn: {
      title: 'Seleção inválida',
      message: 'Só é possível excluir exercícios que você criou.',
    },
    confirm: {
      title: 'Excluir exercícios?',
      message:
        '{{count}} exercícios serão removidos da sua lista. O histórico de treinos é preservado.',
      message_one:
        '{{count}} exercício será removido da sua lista. O histórico de treinos é preservado.',
      cancel: 'Cancelar',
      confirm: 'Excluir',
    },
    success: {
      title: 'Exercícios excluídos.',
      message: '{{count}} exercícios foram removidos da sua lista.',
      message_one: '{{count}} exercício foi removido da sua lista.',
    },
    error: {
      title: 'Não foi possível excluir',
      message: 'Tente novamente em alguns instantes.',
    },
  },
  bulkCopy: {
    onlyPublicOrShared: {
      title: 'Seleção inválida',
      message: 'Só é possível copiar exercícios públicos ou compartilhados com você.',
    },
    confirm: {
      title: 'Copiar exercícios?',
      message: '{{count}} exercícios serão copiados para a sua biblioteca.',
      message_one: '{{count}} exercício será copiado para a sua biblioteca.',
      cancel: 'Cancelar',
      confirm: 'Copiar',
    },
    success: {
      title: 'Exercícios copiados.',
      message: '{{count}} exercícios foram adicionados à sua biblioteca.',
      message_one: '{{count}} exercício foi adicionado à sua biblioteca.',
    },
    error: {
      title: 'Não foi possível copiar',
      message: 'Tente novamente em alguns instantes.',
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

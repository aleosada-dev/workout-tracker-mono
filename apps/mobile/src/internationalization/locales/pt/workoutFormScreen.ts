export default {
  createTitle: 'Novo treino',
  editTitle: 'Editar treino',
  fields: {
    name: 'Nome',
    namePlaceholder: 'Ex: Treino A — Peito e Tríceps',
    description: 'Descrição',
    descriptionPlaceholder: 'Opcional',
  },
  validation: {
    name: {
      required: 'Informe o nome do treino',
      tooLong: 'Nome muito longo',
    },
    reps: {
      required: 'Informe as repetições',
      maxBelowMin: 'Máx menor que mín',
    },
    duration: {
      required: 'Informe o tempo alvo',
    },
  },
  exercise: {
    headers: {
      reps: 'Reps (Mín/Máx)',
      repsMin: 'Mín',
      repsMax: 'Máx',
      loadPercent: 'Carga (%)',
    },
    loadPercentHelp: {
      hint: 'O que é a carga percentual?',
      title: 'Carga (%)',
      description:
        'Percentual da carga em relação à série anterior (normal). Usado em séries drop e cluster.',
    },
    addDetails: 'Adicionar nota ou descanso',
    editDetails: 'Editar nota e descanso',
    addNote: 'Adicionar nota',
    editNote: 'Editar nota',
    editRest: 'Editar descanso',
    restUndefined: 'Sem definição',
  },
  noteSheet: {
    title: 'Nota do exercício',
    placeholder: 'Ex: cadência controlada na descida',
    save: 'Salvar',
  },
  settingsSheet: {
    title: 'Nota e descanso',
    noteLabel: 'Nota do exercício',
    notePlaceholder: 'Ex: cadência controlada na descida',
    restLabel: 'Descanso entre séries',
    restNone: 'Sem descanso definido',
    clearRest: 'Remover descanso',
    save: 'Salvar',
  },
  actions: {
    save: 'Salvar treino',
  },
  success: {
    createdTitle: 'Treino criado',
    updatedTitle: 'Treino atualizado',
  },
  noStrengthExercise: {
    title: 'Adicione um exercício de musculação',
    message: 'Inclua ao menos um exercício de musculação para salvar o treino.',
  },
  validationError: {
    title: 'Não foi possível salvar',
    message: 'Revise os erros de validação antes de salvar.',
  },
  discard: {
    title: 'Descartar alterações?',
    description: 'As alterações feitas neste treino serão perdidas.',
    confirm: 'Descartar',
    cancel: 'Continuar editando',
  },
};

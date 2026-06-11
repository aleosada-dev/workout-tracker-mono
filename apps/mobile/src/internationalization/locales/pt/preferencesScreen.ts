export default {
  save: 'Salvar',
  saved: {
    title: 'Preferências salvas',
  },
  sections: {
    general: 'Geral',
    workout: 'Treino',
  },
  defaultRestSeconds: {
    label: 'Tempo padrão de descanso',
    description: 'Pré-preenche o tempo de descanso de novas séries.',
    placeholder: 'Indefinido',
    pickerTitle: 'Tempo de descanso',
    confirm: 'Confirmar',
    clear: 'Limpar',
  },
  weightUnit: {
    label: 'Unidade de peso',
  },
  defaultLocation: {
    label: 'Local de treino padrão',
    description: 'Vem pré-selecionado ao abrir um treino.',
    none: 'Sem local',
  },
  loadRounding: {
    label: 'Arredondamento da carga',
    description: 'Arredonda a carga sugerida das séries drop e cluster.',
    modes: {
      none: 'Não',
      half: '0,5',
      one: '1',
      twoAndHalf: '2,5',
    },
  },
  countWarmupSets: {
    label: 'Contabilizar séries de aquecimento',
    description: 'Inclui séries de aquecimento nos totalizadores e no volume.',
  },
  autoStartRestTimer: {
    label: 'Iniciar descanso automaticamente',
    description: 'Inicia o cronômetro de descanso ao concluir uma série.',
  },
  autoFillReps: {
    label: 'Preencher séries automaticamente',
    description:
      'Ao montar ou editar um treino, repete as repetições, a duração e a distância da primeira série nas séries seguintes que estiverem vazias.',
  },
  defaultSetsCount: {
    label: 'Séries por exercício',
    description: 'Quantas séries são adicionadas ao incluir um exercício no treino.',
  },
  error: {
    title: 'Não foi possível carregar suas preferências',
    subtitle: 'Verifique sua conexão e tente novamente.',
    retry: 'Tentar novamente',
  },
};

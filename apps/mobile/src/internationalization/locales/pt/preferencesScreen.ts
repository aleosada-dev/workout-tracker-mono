export default {
  save: 'Salvar',
  sections: {
    general: 'Geral',
    workout: 'Treino',
  },
  defaultRestSeconds: {
    label: 'Tempo padrão de descanso (s)',
    placeholder: 'Sem padrão',
  },
  weightUnit: {
    label: 'Unidade de peso',
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
  error: {
    title: 'Não foi possível carregar suas preferências',
    subtitle: 'Verifique sua conexão e tente novamente.',
    retry: 'Tentar novamente',
  },
};

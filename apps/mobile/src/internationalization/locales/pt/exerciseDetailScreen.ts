export default {
  progress: 'Evolução',
  error: {
    title: 'Não foi possível carregar este exercício.',
    subtitle: 'Verifique sua conexão e tente novamente.',
    retry: 'Tentar de novo',
  },
  chartEmptyTitle: 'Sem dados ainda',
  chartEmptySubtitle: 'Registre este exercício para ver sua evolução aqui.',
  chartUnloadedTitle: 'Sem carga',
  chartUnloadedSubtitle: 'Este exercício não usa peso. Acompanhe sua evolução em Reps ou Séries.',
  metrics: {
    maxWeight: 'Peso max',
    volume: 'Volume',
    maxReps: 'Reps max',
    sets: 'Séries',
  },
  muscles: {
    primary: 'Principal',
    secondary: 'Auxiliar',
  },
  video: {
    source: {
      uploaded: 'Dispositivo',
      youtube: 'YouTube',
    },
  },
  sets: {
    title: 'Séries: {{date}}',
    titleEmpty: 'Últimas séries',
    emptyTitle: 'Nenhuma série registrada',
    emptySubtitle: 'Este exercício ainda não tem sessões registradas.',
    headers: {
      index: '#',
      type: 'Tipo',
      weight: 'Peso',
      reps: 'Reps',
    },
    types: {
      helpHint: 'Tipos de série',
      helpTitle: 'Tipos de série',
      descriptions: {
        warmup:
          'Série de aquecimento feita antes das séries de trabalho. Usa carga mais leve para preparar músculos e articulações.',
        normal: 'Série de trabalho padrão. É a base do treino onde o estímulo principal acontece.',
        drop: 'Série executada imediatamente após uma série normal ou outra drop, reduzindo a carga sem descanso. Aumenta o volume e a intensidade.',
        cluster:
          'Série dividida em mini-séries com pausas curtas (10–20s) entre elas, permitindo manter cargas mais altas por mais repetições totais.',
      },
    },
  },
  personalRecords: {
    title: 'Recordes pessoais',
    emptyTitle: 'Sem recordes ainda',
    emptySubtitle: 'Os recordes aparecem quando você registra este exercício.',
    matchHint: 'Corresponde à métrica selecionada',
  },
};

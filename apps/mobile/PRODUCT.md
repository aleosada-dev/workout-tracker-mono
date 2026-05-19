# Product

## Register

product

## Users

App de tracking de treino servindo o espectro completo do praticante: iniciante que está começando a registrar séries, intermediário acompanhando progressão, atleta avançado periodizando ciclos, e a relação coach/aluno (coach prescreve, aluno executa e devolve dados). Audiência primária brasileira (PT padrão), suporte EN.

O usuário interage com o app em três contextos com pesos equivalentes:

1. **Durante o treino**, em pé na academia, entre séries, com mão suada e atenção fragmentada. Velocidade de input e alvos táteis grandes importam.
2. **Pós-treino**, analisando histórico e evolução com calma. Densidade de informação e gráficos legíveis importam.
3. **Pré-treino**, planejando rotina e periodização. Navegação clara da biblioteca de exercícios e organização hierárquica importam.

Modalidades primárias: musculação. Modalidades secundárias suportadas: preparatório, calistenia, cardio, alongamento.

## Product Purpose

Tracker de treino que cobre o ciclo completo (planejar, executar, revisar) sem fragmentar o produto entre "app de registro" e "app de planejamento". Suporta a jornada do iniciante (registro simples) até o atleta avançado (periodização, drop sets, cluster sets, acompanhamento longo). Existe também como ponte entre coach e aluno: o aluno gera dados confiáveis com pouco atrito, o coach lê esses dados para ajustar estratégia.

Sucesso = usuário registra com consistência ao longo de meses, vê progressão clara, e (quando há coach) o coach tem confiança nos dados para tomar decisões.

## Brand Personality

Quatro qualidades em tensão produtiva: **técnico, premium, confiável, motivacional**.

- **Técnico:** vocabulário correto de musculação ("drop set", "RPE", "cluster", "1RM") sem traduzir para baby-talk. O instrumento respeita a inteligência do usuário.
- **Premium:** refinamento vem de tipografia respirando, hierarquia clara, micro-tipografia precisa em metadados. Nunca de gradient, glow, glassmorphism.
- **Confiável:** dados visíveis, estados de carregamento honestos, números formatados consistentemente, internacionalização sem buracos. Sente como instrumento de medição.
- **Motivacional:** o encorajamento vem de mostrar progressão real, não de frases. Recordes pessoais e séries crescentes carregam o trabalho que slogans tentariam fazer.

Três palavras: **preciso, refinado, encorajador**.

## Anti-references

O app explicitamente NÃO deve parecer:

1. **Gamificação pueril** (Duolingo/streaks/confete em tudo). Selos de conquista exagerados, animações comemorativas, badges decorativos. Tira a seriedade do treino.
2. **Fitness-influencer hype** (estilo IG fitness). Neon roxo+rosa, gradientes berrantes, frases gritadas em caps ("VOCÊ CONSEGUE!"), tipografia hype. Adulto não quer isso.
3. **Planilha fria sem alma** (Excel-ish). Tabelas densas sem hierarquia, datas como `2026-04-23`, zero refinamento tipográfico. Parece backoffice corporativo.
4. **Bodybuilding old-school agressivo**. Preto+vermelho+grafites, layout pesado, estética hardcore anos 2000 (Bodybuilding.com vibe).

A combinação dessas quatro restrições é o ponto: o app vive numa faixa estreita entre "preciso e adulto" e "humano e refinado", sem cair em nenhum dos clichês adjacentes.

## Design Principles

1. **Progressive disclosure por padrão.** Iniciante vê só o essencial; recursos avançados (periodização, RPE, drop/cluster) aparecem por contexto, sem poluir a tela do iniciante. Densidade é uma virtude do power-user, nunca o ponto de partida do principiante.
2. **Cor codifica significado, nunca decora.** Verde = sucesso/progresso, destrutiva = falha/perda, warning = atenção. Daltonismo (especialmente deuteranopia) nunca pode quebrar a leitura: sempre tem segundo canal redundante (ícone, peso tipográfico, posição, rótulo).
3. **Refinamento tipográfico carrega o "premium".** Hierarquia clara via scale + weight + cor. Micro-tipografia (uppercase tracking-wider) para captions e rótulos de metadado. Tipografia que respira em vez de cards que decoram. Nunca usar gradient text, glow, ou glassmorphism para sugerir qualidade.
4. **Voz adulta e específica.** Vocabulário correto de musculação sem tradução simplificadora. Zero clichês motivacionais ("vamos campeão!", "você arrasou!"). O encorajamento é mostrar progressão real, não frasear sobre ela.
5. **Cada tela serve UM contexto principal.** Tela de execução = tátil, alvos grandes, leitura rápida com mão suada. Tela de histórico = densa, leitura calma, gráficos legíveis. Tela de planejamento = navegável, organizada, hierárquica. Não tentar servir os três contextos numa única view.

## Accessibility & Inclusion

WCAG AA como piso, com consideração explícita para daltonismo (a marca é emerald-verde, e verde é o estado de sucesso/progresso em todo o app):

- **Cor nunca é o único canal de significado.** Sempre tem ícone, posição, peso tipográfico ou rótulo redundante. Verifica em deuteranopia antes de shippar paletas novas.
- **Contraste AA** (4.5:1 texto normal, 3:1 texto large) em ambos os temas (dark/light).
- **Alvos táteis ≥44pt** em iOS, ≥48dp em Android. Especialmente crítico nas telas de execução (mão suada, entre séries).
- **VoiceOver e TalkBack** funcionais. Toda ação interativa tem `accessibilityLabel` e estado anunciável.
- **Reduce-motion** respeitado. Motion é modesto por design, mas mesmo as transições suaves desligam quando o usuário pede.
- **Internacionalização (PT/EN)** sem buracos: nenhum texto hard-coded em features, datas via `date-fns` + locale, números via `Intl.NumberFormat`.

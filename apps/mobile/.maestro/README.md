# Testes E2E com Maestro

Suíte de testes end-to-end usando [Maestro](https://maestro.mobile.dev/).

## Pré-requisitos

1. **Maestro CLI** instalado: `curl -Ls "https://get.maestro.mobile.dev" | bash`
2. **Simulador iOS** booted: `xcrun simctl boot "iPhone 16"` (ou qual estiver usando).
3. **App instalado** no simulador (development build OU preview build — ver "Build alvo").
4. **Conta de teste no Supabase** (ver "Conta de teste").
5. **Arquivo `.env`** populado em `.maestro/.env` (copiar de `.env.example`).

## Build alvo

A suíte é parametrizada via env vars — funciona com qualquer variant do app.

| Cenário | Variant | Bundle ID | Scheme |
|---|---|---|---|
| Autoria local com Maestro Studio | `development` | `br.com.osadainc.workouttracker.dev` | `workouttrackerappdev` |
| Suíte completa / CI | `preview` | `br.com.osadainc.workouttracker.preview` | `workouttrackerapppreview` |

**Para autoria local**, use o development build (Metro precisa estar rodando). Itera rápido, vê mudanças de UI imediatamente.

**Para validar a suíte inteira**, use o preview build — é determinístico (JS bundled, sem Metro) e bate com o que vai pra produção.

## Conta de teste no Supabase

Crie uma conta dedicada manualmente no painel do Supabase, **não use uma conta real**.

1. Acesse o painel do projeto Supabase → Authentication → Users → Add user.
2. Email: `e2e-test+wt@<seu-dominio-de-teste>` (use um domínio que você controla; emails `+` são suportados).
3. Senha: gere uma >16 chars (use um gerenciador de senhas).
4. Marque "Auto Confirm User" para pular confirmação por email.
5. Coloque essas credenciais no `.maestro/.env`.

### Exercícios conhecidos para os flows de detalhe

Cada flow de detalhe abre um exercício específico via busca por nome. O nome vem de um env var por flow — assim cada cenário escolhe um exercício com os dados que ele precisa validar (sessões, recordes, vídeo, ou ausência total).

```
# .maestro/.env
E2E_EXERCISE_METRICS=...      # flow 07: cycla as 4 métricas (precisa ter sessões)
E2E_EXERCISE_SETS=...         # flow 08: tabela da última sessão (precisa ter séries logadas)
E2E_EXERCISE_RECORDS=...      # flow 09: pelo menos um recorde de maxWeight registrado
E2E_EXERCISE_MUSCLE=...       # flow 10: badge de músculo primário (qualquer exercício)
E2E_EXERCISE_VIDEO=...        # flow 11: exercício com URL de vídeo (mp4 ou YouTube)
E2E_EXERCISE_EMPTY=...        # flow 12: exercício sem sessões e sem vídeo (todos empty states)
```

Os flows de 07 a 11 validam o caminho feliz — escolha exercícios que a conta atleta (`open-exercises-list-athlete.yaml`) tenha registrado. O flow 12 faz o oposto: aponta pra um exercício "virgem" e valida que todos os empty states aparecem.

### Flows de filtro (13-19)

Os flows 16 e 17 abrem os dropdowns de músculo e equipamento e selecionam um item por rótulo fixo no flow ("Peito" e "Anilha"). São dados de referência — iguais para qualquer conta — e ambos aparecem no topo do dropdown sem rolar. Se o seed mudar esses rótulos, ajuste o `tapOn` direto no flow.

### Flows de CRUD/bulk (20-28)

Cobrem criação, edição, delete (via form), e seleção em massa (delete e copy). Três env vars novas, todas apontando para exercícios da conta atleta:

```
# .maestro/.env
E2E_EXERCISE_OWNED=...      # flow 21, 27: exercício criado pela atleta (deletável e editável)
E2E_EXERCISE_PUBLIC=...     # flow 25, 26: exercício público/shared, NÃO-owned (copiável)
E2E_EXERCISE_PUBLIC_2=...   # flow 26: segundo público/shared para bulk copy com >1 item
```

**Estratégia de seed sem cleanup automático:**

- Flows 20, 22, 24 criam exercícios com nome único (timestamp via `evalScript`). Idempotentes — podem rodar várias vezes. O flow 20 deixa o exercício no banco; 22 e 24 deletam o que acabaram de criar.
- Flow 21 edita `E2E_EXERCISE_OWNED` e **reverte** o nome ao final — mantém o seed estável.
- Flow 26 gera uma nova cópia a cada run dos dois exercícios públicos. Cópias acumulam no banco; quando ficar poluído, limpe manualmente pelo app.
- Flows 25, 27, 28 são read-only do ponto de vista do banco.

Recomendação para a primeira vez: criar manualmente os 3 exercícios de referência no app de teste, salvar os nomes no `.env`, rodar a suíte completa.

## Comandos

Rodar a suíte completa contra development build:

```bash
set -a && . .maestro/.env && set +a
UDID=$(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1)
MAESTRO_APP_ID=br.com.osadainc.workouttracker.dev \
MAESTRO_APP_SCHEME=workouttrackerappdev \
maestro --udid "$UDID" test .maestro/
```

> Amarrar o `--udid` ao iPhone simulator booted é mais robusto que `--platform ios`. Maestro pode tentar paralelizar contra emuladores Android registrados (mesmo desligados) e cair em erro de ADB na porta 7001.

Rodar contra preview build:

```bash
bun run test:e2e:install:preview
MAESTRO_APP_ID=br.com.osadainc.workouttracker.preview \
MAESTRO_APP_SCHEME=workouttrackerapppreview \
bun run test:e2e
```

Rodar um flow isolado:

```bash
set -a && . .maestro/.env && set +a
UDID=$(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1)
maestro --udid "$UDID" test .maestro/flows/auth/01-launch-and-render.yaml
```

Maestro Studio (autoria interativa):

```bash
bun run test:e2e:studio
```

## Reset de sessão entre flows

Cada flow começa chamando `subflows/launch-fresh.yaml`, que abre um deep link `<scheme>://debug/reset`. O handler está em `src/app/_layout.tsx` e chama `debugResetAuth()` (em `src/lib/debug-reset.ts`), que:

1. Faz `supabase.auth.signOut()`.
2. Limpa a MMKV `supabase-auth`.
3. Apaga a encryption key do SecureStore.

O handler é gated por variant ≠ `production` — em build de produção é no-op.

## Estrutura

```
.maestro/
├── config.yaml                 # workspace config (inclusion pattern)
├── .env.example                # template de variáveis
├── .env                        # gitignored, valores reais
├── README.md
├── subflows/
│   ├── launch-fresh.yaml                  # boot + reset + assert tela inicial
│   ├── sign-in-coach.yaml                 # login com a conta coach
│   ├── sign-in-athlete.yaml               # login com a conta atleta
│   ├── open-exercises-list-coach.yaml     # login coach + navega ate a lista de exercicios
│   ├── open-exercises-list-athlete.yaml   # login atleta + navega ate a lista de exercicios
│   └── open-exercises-filter-athlete.yaml # atleta + abre a tela de filtro pelo overflow
└── flows/
    ├── auth/                   # telas de autenticacao
    ├── home/                   # tela inicial (lista de treinos)
    └── exercises/              # lista, detalhes e filtro do exercicio
        ├── 01-list-renders.yaml
        ├── 02-back-to-workouts.yaml
        ├── 03-exercise-detail.yaml
        ├── 04-search-filters-list.yaml
        ├── 05-search-empty-state.yaml
        ├── 06-search-clear-restores.yaml
        ├── 07-detail-metrics-cycle.yaml
        ├── 08-detail-sets-section.yaml
        ├── 09-detail-records-section.yaml
        ├── 10-detail-muscle-badge.yaml
        ├── 11-detail-video-visible.yaml
        ├── 12-detail-empty-states.yaml
        ├── 13-filter-renders.yaml
        ├── 14-filter-by-type.yaml
        ├── 15-filter-by-visibility.yaml
        ├── 16-filter-by-muscle.yaml
        ├── 17-filter-by-equipment.yaml
        ├── 18-filter-count-and-clear.yaml
        ├── 19-filter-type-min-one-warning.yaml
        ├── 20-create-exercise.yaml
        ├── 21-edit-exercise.yaml
        ├── 22-delete-via-form.yaml
        ├── 23-selection-mode-toggle.yaml
        ├── 24-bulk-delete-success.yaml
        ├── 25-bulk-delete-blocked.yaml
        ├── 26-bulk-copy-success.yaml
        ├── 27-bulk-copy-blocked.yaml
        └── 28-select-all.yaml
```

## Convenções de testID

Formato: `<screen>.<elemento>`. Exemplos:

- `signIn.emailInput`, `signIn.submitButton`
- `tabs.home`

Adicione testIDs em elementos chave (inputs, botões, links, containers raiz). Para texto que muda dinamicamente (loading state, toast), use `assertVisible` com texto literal — é o que o usuário vê.

# Aliases de equipamento por variação (máquinas/locais)

Data: 2026-06-05
Status: Aprovado para planejamento

## Problema

Alunos treinam em mais de uma academia, e a mesma variação de exercício tem
cargas diferentes em máquinas diferentes (número de roldanas, modelo etc.).
Isso vale até dentro da mesma academia — dois leg press distintos rendem cargas
distintas. Halteres/barras não têm esse problema (a carga é absoluta).

Na prática é o **mesmo exercício** feito em **equipamentos diferentes**.
Duplicar o exercício/variação na biblioteca não serve: quem monta o treino não
quer lidar com isso, só atrapalharia a montagem. A última carga sugerida e os
records precisam ser segmentados pela máquina física usada, sem poluir a
biblioteca de exercícios/variações.

## Solução em uma frase

Introduzir **alias** (máquina física) por variação, privado do aluno, com
**local** opcional como tag de conveniência. Logs, "última carga" e records
passam a ser segmentados por alias; a biblioteca de exercícios/variações fica
intacta. O alias **não é obrigatório** — sem alias é um bucket próprio que
cobre halteres e todo o histórico atual.

## Decisões (do brainstorming)

- **Modelo base:** alias é a unidade de segmentação; local é tag opcional sobre
  o alias (não uma hierarquia local→alias).
- **Escopo do alias:** por **variação**, criado pelo **aluno** (privado). O
  treinador tem **leitura** para acompanhar a evolução, mas **não** define
  aliases na montagem do treino.
- **Seleção na execução:** pré-seleciona o alias do **local escolhido** no
  pré-treino; fallback para o **último alias usado**; alias **não é
  obrigatório** (existe o bucket "sem alias").
- **Records:** segmentados **por alias**, mantendo também um **PR geral**
  (máximo entre todas as máquinas + logs sem alias).
- **Criação/gestão:** **inline na execução** ("+ Nova máquina") **e** no
  **detalhe do exercício**.
- **Local na v1:** lista privada do aluno, **só nome** (sem GPS/endereço/mapa).
- **Treinador na v1:** **só dados/permissões** (RLS). Tela do treinador para
  visualizar fica para depois.

## Restrições do repositório

- **Compatibilidade com o PWA legado:** o `baseline.sql` é o schema herdado do
  PWA. Não alteramos o app PWA. Mudanças no DB do mobile devem ser **aditivas**
  e não quebrar caminhos legados (ver "Ponto de atenção" na migração).
- **Naming:** tabelas **sem** prefixo `wt_` (igual a `user_preferences`,
  `workout_variation_records`). O prefixo `wt_` é **só para functions**.
- **Functions só quando se justificam:** atomicidade, redução de round-trips ou
  lógica complexa. CRUD simples vai pelo **Supabase client + RLS** (PostgREST),
  sem function.
- Functions `wt_*` usam `SECURITY INVOKER` (RLS se aplica), salvo necessidade
  documentada. Postgres do mobile mantém logs/records soft-deletáveis
  (`deleted_at IS NULL`).

## Modelo de dados

### Tabelas novas

**`training_locations`** (lista privada do aluno)
- `id uuid pk`, `user_id uuid not null`
- `name text not null`
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`
- Único `(user_id, name)` onde `deleted_at IS NULL`

**`variation_aliases`** (a máquina física; uma por variação)
- `id uuid pk`, `user_id uuid not null`
- `variation_id uuid not null → variations(id)`
- `location_id uuid null → training_locations(id)`
- `name text not null`
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`
- Único `(user_id, variation_id, name)` onde `deleted_at IS NULL`

### Alterações em tabelas existentes (aditivas)

**`workout_exercise_logs`**
- `+ alias_id uuid null → variation_aliases(id)`
- `+ alias_name text null` (snapshot, sobrevive a soft-delete — mesmo padrão de
  `exercise_name`/`variation_name`)
- Sem `alias_id` = bucket "sem alias" (halteres, histórico atual, quando o aluno
  não escolhe).

**`workout_variation_records`**
- `+ alias_id uuid null DEFAULT NULL`
- Linhas existentes ficam `NULL` = **PR geral** por variação.
- Único `(user_id, variation_id)` → `(user_id, variation_id, alias_id)` com
  `NULLS NOT DISTINCT` (a linha geral NULL coexiste com as linhas por alias).

## Última carga e records na execução

### Última carga segmentada
`wt_last_sets_by_variations(user, variation_ids[])` passa a:
- agrupar por `(variation_id, alias_id, logical_key)`, incluindo o bucket
  `alias_id = NULL`, retornando `alias_id` em cada linha;
- retornar também, por variação, o `lastUsedAliasId` (alias do log mais
  recente) — **dobrado nesta função** para evitar round-trip extra, já que ela
  já varre os logs.

O cliente monta o mapa `variação → alias → sets`. Trocar o alias na execução
troca a carga sugerida **sem** nova chamada ao servidor.

### Lista de aliases
`select` simples em `variation_aliases` via Supabase client + RLS (não é
function — CRUD/listagem simples).

### Pré-seleção (no `active-workout-store`, cliente)
1. Local escolhido no pré-treino → alias da variação com `location_id` = local
   (se houver exatamente um);
2. senão → `lastUsedAliasId`;
3. senão → sem alias (bucket NULL).

### Fallback de carga
Se o alias selecionado não tem histórico (máquina nova), sugere a carga do log
mais recente **geral** da variação, em vez de campo vazio.

### Salvar
`wt_insert_workout_log` (atomicidade) ganha `aliasId` (nullable) por exercício;
persiste `alias_id` + snapshot `alias_name`; ao recalcular records, grava o
geral (NULL) + o do alias usado. `wt_recalculate_variation_records` passa a
`ON CONFLICT (user_id, variation_id, alias_id)` gravando geral + por alias.

## UX

### Execução
- Seletor de máquina **só no card expandido** do exercício (não aparece
  recolhido).
- Variação **com ≥1 alias**: chip com o alias pré-selecionado; tocar abre um
  sheet com a lista (nome + local), **"Sem máquina"** (bucket NULL) e
  **"+ Nova máquina"**.
- Variação **sem nenhum alias** (caso halteres): só um link discreto
  **"+ Máquina"** para quem quiser começar a diferenciar.
- Trocar a seleção reescreve as cargas sugeridas dos sets daquele exercício a
  partir do mapa já carregado.

### Criação inline ("+ Nova máquina")
Form curto no sheet: `nome` (obrigatório) e `local` (opcional). O local é um
**autocomplete** no mesmo padrão do de alunos (`Autocomplete` do `ui-mobile`):
filtra `training_locations` existentes e permite **criar um novo pelo texto
digitado**. Ao salvar: cria o `variation_alias` (Supabase client), seleciona no
exercício e recarrega as cargas — sem sair da execução.

### Detalhe do exercício
- **Seletor geral de alias no topo**, no estilo do `AthleteContextSelect`, que
  **troca o contexto da página inteira**: última carga, records e histórico
  passam a refletir o alias selecionado (com opção "Geral"/"Todas" e "Sem
  máquina").
- Records exibem **PR geral** + detalhamento **por máquina** quando há aliases.

### Local — pré-treino e gestão
- **Pré-treino:** campo opcional de local (mesmo `Autocomplete`) na tela de
  início; pré-seleciona aliases por local. Vive no `active-workout-store`
  (`selectedLocationId`); **não** é gravado no log (o `alias_id` por exercício
  já captura o necessário).
- **Gestão de locais:** criação inline pelo autocomplete; renomear/excluir
  (soft-delete) numa lista simples dentro de **Configurações/Preferências**.

Implementação alinhada ao repo: seletor reutilizável (vai para
`packages/ui-mobile` se genérico), estado do alias no `active-workout-store`,
React Compiler ligado (sem memo manual), CRUD de alias/local via Supabase
client + RLS.

## Permissões (RLS)

- `variation_aliases` e `training_locations`:
  - **SELECT/INSERT/UPDATE/DELETE:** dono (`user_id = auth.uid()`) **ou**
    treinador ativo (`is_active_coach_of(auth.uid(), user_id)`). O treinador tem
    acesso total (mesmo padrão de `workout_variation_records`), via uma policy
    `FOR ALL` por papel. (Não define aliases na montagem do treino — isso é
    decisão de produto/UX, não restrição de RLS.)
- `workout_exercise_logs` e `workout_variation_records` já têm policies de aluno
  + treinador; as colunas novas entram sob as mesmas regras.
- Functions de leitura segmentada seguem o padrão de `/exercises/last`: só lê
  dados de outro usuário se for treinador ativo dele.

## Migração

Uma migration nova, aditiva:
1. Cria `training_locations` e `variation_aliases` (índices únicos de ativos,
   trigger `set_timestamps`, policies acima).
2. `workout_exercise_logs`: adiciona `alias_id` (FK) e `alias_name`, nullable.
3. `workout_variation_records`: adiciona `alias_id` nullable `DEFAULT NULL`
   (linhas atuais viram PR geral); troca o único para
   `(user_id, variation_id, alias_id)` `NULLS NOT DISTINCT`; atualiza
   `wt_recalculate_variation_records`.
4. Atualiza `wt_last_sets_by_variations` e `wt_insert_workout_log` para alias.

**Ponto de atenção:** funções legadas herdadas no `baseline.sql` (linhas
~2400/~2732) usam `ON CONFLICT (user_id, variation_id)` em
`workout_variation_records`. Como a constraint muda, a migração precisa
**confirmar que nenhum caminho ativo do mobile chama essas funções** e
ajustar/aposentá-las no DB do mobile conforme necessário. Não alteramos o app
PWA (base separada).

## Testes

**Unit (Jest, `test()`):**
- Pré-seleção no `active-workout-store`: local → `lastUsedAliasId` → sem alias;
  e fallback de carga (alias sem histórico → último log geral).
- Montagem do mapa `variação → alias → sets`.
- Agrupamento de records geral + por máquina.
- Contratos de componente: sheet do seletor (lista, "Sem máquina", "+ Nova
  máquina") e autocomplete de local com criação por texto novo.

**Domínio/aplicação:** schemas (Zod) com `aliasId` no payload de log e nos
retornos segmentados; adaptadores de leitura.

**Banco:** `wt_last_sets_by_variations` segmenta por alias;
`wt_recalculate_variation_records` grava geral (NULL) + por alias — seguindo o
padrão de teste de `apps/api`.

**E2E (Maestro, com `subflows/launch-fresh.yaml`):** executar treino →
adicionar máquina inline → trocar máquina muda a carga sugerida → escolher local
no pré-treino pré-seleciona o alias.

## Fases de implementação

Entrega em fases, **com pausa para revisão do usuário ao fim de cada uma**.

### Fase 1 — Migration (DB)
- Eu **crio o arquivo de migration** (tabelas novas, colunas aditivas, índices,
  policies, e as alterações em `wt_last_sets_by_variations`,
  `wt_insert_workout_log`, `wt_recalculate_variation_records`).
- **O usuário aplica a migration e roda a geração de types.** Eu não aplico nem
  gero types.
- **Pausa para revisão.**

### Fase 2 — Rotas de API (apps/api)
- Locations: list / create / rename / soft-delete (PostgREST + RLS, sem
  function).
- Aliases: list por variação(ões) / create / rename / soft-delete.
- Estender `/exercises/last` com segmentação por alias + `lastUsedAliasId`.
- Estender insert de workout-log com `aliasId` por exercício.
- Estender records com detalhamento por alias.
- **Pausa para revisão.**

### Fases do mobile (cada fase deixa o app em estado completo/shippável)

**Fase 3 — Execução com alias (núcleo).**
Seletor de máquina no card expandido, criação inline ("+ Nova máquina"),
pré-seleção `lastUsedAliasId → sem alias`, carga segmentada por alias, salvar
`aliasId`. Sem local ainda (pré-seleção cai no último usado). App utilizável de
ponta a ponta. **Pausa.**

**Fase 4 — Local.**
Autocomplete de local na criação inline e no pré-treino, pré-seleção por local,
gestão de locais em Configurações. **Pausa.**

**Fase 5 — Detalhe do exercício.**
Seletor geral de contexto por alias (estilo `AthleteContextSelect`) que muda a
página inteira; records geral + por máquina. **Pausa.**

## Fora de escopo (v1)

- Tela do treinador para visualizar evolução por alias (só dados/RLS na v1).
- Local com GPS/auto-detecção, endereço, mapa.
- Records por alias para exercícios não-strength (mantém o comportamento atual
  de records só para strength).

# Aliases de equipamento por variação — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Segmentar última-carga e records por máquina física (alias) de uma variação, com local opcional, sem poluir a biblioteca de exercícios.

**Architecture:** Novas tabelas `training_locations` e `variation_aliases` (alias por variação, privado do atleta, local opcional). `workout_exercise_logs` ganha `alias_id` + snapshot `alias_name`; `workout_variation_records` ganha `alias_id` (NULL = PR geral). Functions `wt_last_sets_by_variations`, `wt_recalculate_variation_records` e `wt_insert_workout_log` passam a operar por alias. CRUD de alias/local via PostgREST + RLS. Mobile consome via `apiClient`.

**Tech Stack:** Supabase Postgres (migrations + functions `wt_*` SECURITY INVOKER), Hono API (`apps/api`), domínio/infra em `packages/*`, Expo RN + `@legendapp/state` (`apps/mobile`).

**Spec:** `docs/superpowers/specs/2026-06-05-exercise-equipment-aliases-design.md`

**Entrega faseada, com PAUSA para revisão do usuário ao fim de cada fase.** As fases 2–5 só são detalhadas em passos executáveis na sua respectiva pausa, porque dependem dos **types regenerados** após a Fase 1 (nomes de colunas/relações vêm do `packages/infrastructure/src/supabase/types.ts`). Detalhar antes seria inventar assinaturas.

---

## Fase 1 — Migration (DB) — CONCLUÍDA (aguarda aplicação do usuário)

**Files:**
- Create: `supabase/migrations/20260605120000_variation_aliases.sql`

Conteúdo entregue:
- [x] Tabela `training_locations` (RLS atleta + leitura coach, índice de nome único ativo, trigger `set_timestamps`).
- [x] Tabela `variation_aliases` (FK variação + local `ON DELETE SET NULL`, índices, RLS atleta + leitura coach).
- [x] `workout_exercise_logs`: colunas `alias_id` (FK `ON DELETE SET NULL`) e `alias_name` (snapshot) + índice parcial.
- [x] `workout_variation_records`: coluna `alias_id`; troca da unique para `(user_id, variation_id, alias_id) NULLS NOT DISTINCT`.
- [x] `recalculate_variation_records` (legado): ajuste defensivo do alvo de `ON CONFLICT` para incluir `alias_id`.
- [x] `wt_recalculate_variation_records`: grava PR geral (alias NULL) + um PR por alias.
- [x] `wt_last_sets_by_variations`: segmenta por `(variation_id, alias_id, logical_key)` e devolve `last_used_alias_id` por variação (DROP+CREATE por mudar colunas).
- [x] `wt_insert_workout_log`: lê `aliasId` por exercício, valida (alias do atleta, da variação, ativo) e grava `alias_id` + `alias_name`.

**Ação do usuário (não automatizada):**
- [ ] Aplicar a migration (`supabase db push`/`migration up` conforme o fluxo do repo).
- [ ] Regenerar os types (`packages/infrastructure/src/supabase/types.ts`).
- [ ] Revisar o resultado.

> ⏸ **PAUSA.** Só seguir para a Fase 2 após os types regenerados, para detalhar os passos com nomes reais.

---

## Fase 2 — Rotas de API (`apps/api`) + domínio/infra — CONCLUÍDA

- [x] **Locations:** módulo `training-locations` (domain + repo, application, adapter PostgREST+RLS, rota list/create/rename/soft-delete, testes). Montado em `/training-locations`.
- [x] **Aliases:** tratados **dentro do vertical de exercises** (domínio no `ExerciseRepository`, use-cases em `makeExerciseApp`, adapter de exercises, sub-router montado em `/exercises/variation-aliases`). list por `variationIds[]` / create / rename+location / soft-delete, com testes.
- [x] **`/exercises/last`:** domínio agora retorna `{ variationId, lastUsedAliasId, buckets: [{ aliasId, sets }] }`; adapter `getLastSets` agrupa por variação→alias; schema de resposta atualizado.
- [x] **Insert de workout-log:** schema aceita `aliasId` por exercício (`.nullable().default(null)` p/ tolerar o mobile pré-Fase 3); domínio + mapper repassam ao payload de `wt_insert_workout_log`.
- [x] **Records:** domínio + adapter + schema trazem `aliasId` (NULL = geral) por linha.
- [x] **Verificação:** typecheck (4 pacotes) ok; Biome ok; testes API 132/132, domain 134, infra 23.

> ⏸ **PAUSA para revisão** (Fase 3 a seguir).

---

## Fase 3 — Mobile: execução com alias (núcleo) — CONCLUÍDA

App utilizável de ponta a ponta com aliases na execução, **sem** local ainda (pré-seleção cai em `lastUsedAliasId → sem alias`).

- [x] `execution-form`: `aliasId` por exercício no schema; pré-seleção em `buildExecutionFromWorkout` (= `lastUsedAliasId`); `resolveLastBucketSets(item, aliasId)` resolve a carga pelo alias selecionado (fallback último usado → sem alias → primeiro).
- [x] `aliasId` propagado em `buildCompletedExecution` → `buildCreateWorkoutLogRequest` (salvo no log).
- [x] API client + hooks (`useVariationAliases`/`useCreateVariationAlias`/update/delete).
- [x] Seletor **só no card expandido**: `AliasSelector` (chip + "+ Máquina" quando sem aliases) + `VariationAliasPickerSheet` (lista, "Sem máquina", "+ Nova máquina" inline). Integrado no card simples e por membro no superset; trocar alias re-semeia a carga.
- [x] i18n pt/en (`aliasPicker`).
- [x] Testes: lógica (pré-seleção/resolve/request builder) + `AliasSelector` (4); suíte mobile 390 testes; typecheck 7/7; Biome limpo.
- [ ] **E2E Maestro** (executar → adicionar máquina → trocar muda carga) — pendente de device; testIDs `workout-execution.alias.chip`/`.add` prontos.

> ⏸ **PAUSA** para revisão.

---

## Fase 4 — Mobile: local — CONCLUÍDA

- [x] API client + hooks `training-locations` (list/create/update/delete).
- [x] Autocomplete de local na **criação inline** da máquina (`VariationAliasPickerSheet`), com criação por texto novo (resolve/cria o local antes de criar o alias).
- [x] **Centralização**: `activeWorkout$` ganha `selectedLocationId` + `variationAliases`; a tela busca os aliases de todas as variações e sincroniza no store; `AliasSelector` passa a ler do store.
- [x] **Seletor de local na sessão** (`SessionLocationBar` + `LocationPickerSheet`) no topo da execução; ao escolher um local, pré-seleciona o alias daquela variação associado ao local (quando único) e re-semeia as cargas.
- [x] **Gestão de locais** em Configurações (`/training-locations`): adicionar, renomear, excluir; MenuCard + rota registrada; i18n pt/en.
- [x] Verificação: typecheck 7/7, Biome limpo, mobile 390 testes (AliasSelector adaptado para ler do store). 
- [ ] **E2E Maestro** (escolher local pré-treino pré-seleciona alias) — pendente de device.

> ⏸ **PAUSA** para revisão.

---

## Fase 5 — Mobile: detalhe do exercício (estado completo)

- [ ] Seletor geral de contexto por alias no topo do detalhe (estilo `AthleteContextSelect`), com "Geral/Todas" e "Sem máquina".
- [ ] Última carga, records e histórico reagem ao alias selecionado.
- [ ] Records exibem geral + detalhamento por máquina.
- [ ] Gestão de máquinas (renomear/local/soft-delete) acessível no detalhe.
- [ ] Testes de contrato dos componentes + agrupamento de records.

> ⏸ **PAUSA** para revisão final.

---

## Fora de escopo (v1)

- Tela do treinador para visualizar evolução por alias (só dados/RLS na v1).
- Local com GPS/endereço/mapa.
- Records por alias para exercícios não-strength.

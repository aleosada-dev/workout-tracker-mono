# Exercícios alternativos em treinos — Design

**Data:** 2026-06-12
**Status:** Aprovado para planejamento

## Objetivo

Permitir configurar, de forma opcional, **um exercício alternativo** para um exercício
de um treino. O alternativo substitui o principal durante a execução nos casos em que o
aparelho não está disponível ou está ocupado. O aluno opta por fazê-lo apenas se ele tiver
sido configurado no treino — não é obrigatório.

## Decisões de produto

- **Cardinalidade:** no máximo **1 alternativo** por exercício, incluindo cada membro de
  superset (A/B/C), trocados de forma independente.
- **Prescrição:** o alternativo tem **prescrição própria** (séries/reps/carga), **semeada**
  a partir do principal no momento da criação, e **editável** dali em diante.
- **Escopo de superset:** cada membro de superset pode ter seu próprio alternativo.
- **Persistência da escolha na execução:** a troca vale **somente para a sessão atual**. O
  template do treino não muda. Na próxima sessão o principal volta como default.
- **Log:** registra a **variação alternativa de fato executada** (variação + sets). O
  histórico, records e volume refletem o que foi realmente feito.
- **Regras de set do alternativo:** idênticas às que já valem para qualquer exercício
  naquele contexto. Não há regra nova. Os set types disponíveis vêm do `measurement_type`
  da variação (ex.: `weight_reps` admite todos os tipos). A única validação relevante já
  existente é o encadeamento de `linked_set_id` para `drop`/`cluster`.

## Modelo de dados (Abordagem A — linha auto-referenciada)

O alternativo *é* um exercício (variação + sets próprios). Portanto é modelado como **outra
linha** de `workout_exercises`, anexada ao principal.

```sql
ALTER TABLE workout_exercises
  ADD COLUMN alternative_of_id uuid NULL
    REFERENCES workout_exercises(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX ux_workout_exercises_one_alternative
  ON workout_exercises(alternative_of_id)
  WHERE alternative_of_id IS NOT NULL;
```

Invariantes:

- `alternative_of_id IS NULL` → exercício "real" (principal standalone ou membro de
  superset). Comportamento atual inalterado.
- `alternative_of_id IS NOT NULL` → alternativo de exatamente uma linha principal.
- **Máx. 1 alternativo por principal** — garantido pelo índice único parcial.
- O alternativo tem seus próprios `workout_sets`.
- O alternativo **não participa** do agrupamento de superset. Seu `superset_group_id` =
  próprio `id` (standalone-like), `superset_order = 0`. Herda a `position` do principal
  apenas por consistência, mas é **sempre filtrado** da listagem de topo — nunca aparece
  como item independente, sempre anexado ao principal.
- `ON DELETE CASCADE`: apagar o principal apaga o alternativo junto.

## Persistência — `wt_upsert_workout`

O payload de cada exercício ganha um campo opcional `alternative` (ou `null`):

```jsonc
{
  "id": "...", "variationId": "...", "exerciseType": "strength",
  "position": 3, "supersetGroupId": "...", "supersetOrder": 0,
  "sets": [ /* ... */ ],
  "alternative": {            // opcional; null se não houver
    "id": "...",
    "variationId": "...",
    "note": "...", "restSeconds": 90,
    "sets": [ /* prescrição própria do alternativo */ ]
  }
}
```

Mudanças na função:

1. Ao inserir cada `workout_exercise` principal, se vier `alternative`, inserir **uma
   segunda linha** com `alternative_of_id = <id do principal>`,
   `variation_id = alternative.variationId`, `superset_group_id = <id do alternativo>`,
   `superset_order = 0`, e os `sets` próprios.
2. As validações de superset existentes (máx. 3 membros, mesma `position`, mesmo nº de sets)
   passam a filtrar `WHERE alternative_of_id IS NULL` — alternativos não contam como
   membros.
3. As validações de set (encadeamento `linked_set_id` para drop/cluster, etc.) aplicam-se
   aos sets do alternativo da mesma forma que a qualquer exercício — sem caso especial.
4. **Sem aninhamento:** um item dentro de `alternative` não pode trazer outro `alternative`.
   Violação levanta SQLSTATE.
5. A estratégia atual de DELETE-tudo-e-reinsere é mantida; alternativos entram no mesmo
   lote.

## UI de montagem (builder)

No `ExerciseBuilderCard` e em cada membro do `SupersetBuilderCard`:

- Ação **"Adicionar exercício alternativo"** no **menu de long-press** do card (consistente
  com as ações já existentes). Só aparece se ainda não houver alternativo.
- Ao tocar, abre o **exercise picker** existente (livre, qualquer variação da biblioteca).
  Ao escolher, cria-se o alternativo com os **sets copiados do principal** (semente),
  editável a partir daí.
- O alternativo é exibido **anexado ao card do principal**, como sub-bloco recolhível
  rotulado "Alternativo", com suas próprias linhas de set (reusa `BuilderSetCells`),
  seletor de descanso e nota.
- Ações no alternativo: **trocar** a variação e **remover** o alternativo.

Schema/mappers:

- `builder-form.ts`: cada `BuilderExercise` ganha `alternative?: BuilderAlternative`
  (variação + sets próprios).
- `workout-mappers.ts` / `toUpsertWorkoutRequest`: emitem e leem o campo `alternative` do
  payload; o agrupamento ignora linhas `alternative_of_id IS NOT NULL` na listagem de topo
  e as anexa ao principal.

## Execução e log

- **Carregamento:** `buildExecutionFromWorkout()` anexa, em cada exercício/membro que tenha
  alternativo filho, os dados do alternativo. O principal continua sendo o **default** ativo.
- **UI:** quando um slot tem alternativo, o card mostra um controle de **troca** ("Usar
  alternativo: &lt;nome&gt;"). Ao trocar, o card renderiza a variação alternativa e **seus
  sets** (measurement type do alternativo manda nas colunas). A troca é **reversível dentro
  da sessão** e **local ao estado da execução** — não chama `wt_upsert_workout` nem altera o
  template.
- **Superset:** a troca é por **membro** (A/B/C independentes). A estrutura de rounds segue
  a do item ativo naquele membro.
- **Preservação de valores:** ao alternar, os valores digitados do principal e do alternativo
  ficam **separados** — voltar ao principal recupera o que já havia sido digitado. Sets não
  preenchidos do alternativo começam com a prescrição (reps/carga sugerida) dele.
- **Validação pré-revisão/salvar:** valida **somente os sets do item ativo** em cada slot.
  Sets inválidos no item não-ativo (principal ou alternativo que não será salvo) são
  ignorados, pois não vão para o log.
- **Log:** `wt_insert_workout_log` grava a `variation_id` e os sets **do item ativo**. Como o
  log já é por `variation_id` + sets executados, **não há mudança no schema de log**.

## Testes

- **DB (SQL):** alternativo criado com `alternative_of_id` correto e sets próprios; índice
  único impede 2 alternativos; alternativo excluído das contagens de superset; aninhar
  alternativo levanta SQLSTATE; `ON DELETE CASCADE` remove o alternativo ao apagar o
  principal.
- **Domain (`packages/domain`):** mappers ida/volta — agrupamento ignora
  `alternative_of_id IS NOT NULL` na listagem de topo e anexa ao principal; superset com
  membros que têm alternativo.
- **Mobile/lib:** `builder-form` semeia sets do alternativo a partir do principal;
  `toUpsertWorkoutRequest` emite `alternative`; `buildExecutionFromWorkout` anexa o
  alternativo e mantém o principal como default; toggle preserva valores separados;
  validação ignora slot inativo.
- Usar `test()` (não `it()`), conforme preferência do projeto.

## Arquivos-chave afetados

| Camada | Caminho |
|---|---|
| Migration nova (coluna + índice) | `supabase/migrations/` |
| Upsert | `supabase/migrations/` (nova migration de `wt_upsert_workout`) |
| Domain superset/mappers | `packages/domain/src/workouts/` |
| Form schema & builders | `apps/mobile/src/features/workouts/lib/builder-form.ts` |
| Mapeamento (agrupamento) | `apps/mobile/src/features/workouts/lib/workout-mappers.ts` |
| Card builder (single) | `apps/mobile/src/features/workouts/components/ExerciseBuilderCard/` |
| Card builder (superset) | `apps/mobile/src/features/workouts/components/SupersetBuilderCard/` |
| Card execução (single) | `apps/mobile/src/features/workouts/components/ExerciseExecutionCard/` |
| Card execução (superset) | `apps/mobile/src/features/workouts/components/SupersetExecutionCard/` |
| Tela de execução | `apps/mobile/src/app/(stacks)/(workouts)/workoutExecution.tsx` |
| API routes & schemas | `apps/api/src/modules/workouts/` |

## Fora de escopo (YAGNI)

- Múltiplos alternativos por exercício.
- Lembrar a escolha do alternativo entre sessões.
- Restringir o alternativo por grupo muscular/equipamento (o picker é livre).
- Aninhar alternativos (alternativo de alternativo).

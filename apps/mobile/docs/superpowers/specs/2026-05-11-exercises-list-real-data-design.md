# Conectar a lista de exercícios aos dados reais (`/exercises`)

**Data:** 2026-05-11
**Status:** Aprovado

## Objetivo

A tela `src/app/(tabs)/(workouts)/exercisesList.tsx` renderiza hoje um array
hard-coded (`INITIAL_EXERCISES`). Substituir essa fonte pelos dados reais do
backend (`GET /exercises`), seguindo o mesmo padrão já estabelecido pelo feature
`workout-logs` (módulo de API tipado, tipos de domínio, hook de React Query,
estados de loading/erro/vazio, observabilidade, testes).

Escopo desta entrega: **só trocar a fonte de dados**. Modo de seleção, ações em
lote, "Filtrar", submit do `addExercise`, tela de detalhe e mídia continuam como
estão (stubs visuais).

## Contrato da API

`GET {EXPO_PUBLIC_API_URL}/exercises` — sem paginação, sem query params. Resposta
no envelope padrão (`{ data: [...], error: null }`); `apiClient.get` já desembrulha
`data`, então o tipo de retorno é `ExerciseApiItem[]`.

Cada item é uma *variação de exercício* do catálogo. Campos consumidos pela UI:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | `string` (uuid) | chave do item / `keyExtractor` |
| `exercise_name` | `string` | base do título ("Abdominal") |
| `name` | `string \| null` | sufixo de variação ("com Salto", "Pegada Fechada") |
| `equipment_name` | `string \| null` | equipamento ("Máquina", "Peso Corporal") |
| `equipment_preposition` | `string \| null` | preposição do equipamento ("na", "com", "no") |
| `muscle_level2_name` | `string` | grupo muscular exibido ("Abdômen", "Peito") |
| `exercise_type` | `string` | slug do tipo ("musculacao", "preparatorio", ...) |
| `user_id` | `string \| null` | `null` ⇒ catálogo global; preenchido ⇒ criado pelo usuário |
| `image_url` / `video_url` | `string \| null` | hoje sempre `null`; não usados ainda |

(O payload traz mais campos — `exercise_id`, `muscle_id`, `secondary_muscle_*`,
`equipment_id`, `video_object_key`, etc. — que esta tela não usa e não precisam
ser tipados nesta entrega.)

## Arquitetura

Mesma estrutura do feature `workout-logs`:

### `src/domain/exercises/types.ts`

```ts
export type ExerciseApiItem = {
  id: string;
  exercise_name: string;
  name: string | null;
  equipment_name: string | null;
  equipment_preposition: string | null;
  muscle_level2_name: string;
  exercise_type: string;
  user_id: string | null;
  image_url: string | null;
  video_url: string | null;
};

export type ExerciseVisibility = 'public' | 'private';

export type Exercise = {
  id: string;
  name: string;
  primaryMuscle: string;
  type: string;
  visibility: ExerciseVisibility;
};
```

### `src/domain/exercises/format.ts`

- `EXERCISE_TYPE_LABELS: Record<string, string>` — `musculacao` → "Musculação",
  `calistenia` → "Calistenia", `cardio` → "Cardio", `alongamento` →
  "Alongamento", `preparatorio` → "Preparatório". Slug desconhecido cai no
  próprio slug.
- `composeExerciseName(item: ExerciseApiItem): string` —
  `exercise_name` + (`name` ? ` ${name}` : '') + (`equipment_name` ?
  ` ${equipment_preposition ?? ''} ${equipment_name}` : ''), normalizando
  espaços. Ex.: "Abdominal na Máquina", "Afundo com Salto com Peso Corporal".
- `toExercise(item: ExerciseApiItem): Exercise` —
  `{ id, name: composeExerciseName(item), primaryMuscle: item.muscle_level2_name,
  type: EXERCISE_TYPE_LABELS[item.exercise_type] ?? item.exercise_type,
  visibility: item.user_id == null ? 'public' : 'private' }`.

### `src/lib/api/exercises.ts`

```ts
export async function fetchExercises(
  { signal }: { signal?: AbortSignal } = {},
): Promise<ExerciseApiItem[]> {
  return apiClient.get<ExerciseApiItem[]>('/exercises', { signal });
}
```

Não re-exportado de `src/lib/api/index.ts` (consistente com `workout-logs.ts`).

### `src/hooks/use-exercises.ts`

```ts
export function useExercises() {
  return useQuery({
    queryKey: ['exercises', 'list'] as const,
    queryFn: ({ signal }) => fetchExercises({ signal }),
  });
}
```

Herda `retry: 1`, `staleTime: 30_000`, `refetchOnWindowFocus: false` do
`QueryClient` global. (Tratamento global de `ApiUnauthorizedError` via
`QueryCache` já cobre logout.)

### `src/app/(tabs)/(workouts)/exercisesList.tsx`

Mudanças cirúrgicas, mantendo a estrutura atual:

- Remover `INITIAL_EXERCISES`, os tipos locais `Exercise`/`Visibility` e a
  entrada `'shared'` de `VISIBILITY_META`. Importar `Exercise`/`ExerciseVisibility`
  do domínio.
- `const { data, isLoading, isError, error, refetch } = useExercises();`
  `const exercises = useMemo(() => (data ?? []).map(toExercise), [data]);`
- **Loading** (`isLoading`): renderizar ~5 linhas-esqueleto inline (mesma forma
  do card — tile + duas linhas de texto). `Stack.Screen` title permanece
  "Exercícios".
- **Erro sem dados** (`isError && exercises.length === 0`): bloco centralizado
  "Não foi possível carregar os exercícios." + botão "Tentar novamente" →
  `refetch()`.
- **Vazio** (`!isLoading && !isError && exercises.length === 0`): `EmptyState`
  com título "Nenhum exercício encontrado." e subtítulo apropriado.
- **Observabilidade**: `useEffect` que, ao detectar `error`, chama
  `captureWorkoutError(error, { action: 'load_exercises' })` — guardado contra
  reenvio do mesmo erro e ignorando `ApiUnauthorizedError`, igual ao
  `WorkoutLogList` (atende a lente 1 do CLAUDE.md).
- Strings de loading/erro/vazio em **Português hard-coded**, para casar com o
  estilo atual do arquivo (que não usa i18n).
- Inalterados: `mode` browse/select, `selected`, longpress → `enterSelect`,
  `ScreenActions`/`SelectionActions`, stub "Filtrar", `router.push('/addExercise')`.
  `selectAll` passa a usar a lista carregada (`exercises`).

A lista continua em `ScrollView` + `.map()` como hoje. Migrar para `FlashList`
(virtualização de ~190 itens) fica como follow-up fora deste escopo.

## Testes

### Jest (unitários)

- `src/__tests__/domain/exercises/format.test.ts` — `composeExerciseName` /
  `toExercise`: nome sem variação, nome com variação, item sem equipamento,
  `visibility` public vs private, label de tipo conhecido e fallback de slug
  desconhecido.
- `src/__tests__/api/exercises.test.ts` — `fetchExercises` chama
  `GET …/exercises` (URL exata), repassa o `signal`, retorna o array
  desembrulhado. Mesma técnica do `workout-logs.test.ts` (mock de `globalThis.fetch`,
  jest mocks de `@/__tests__/mocks/{api-config,auth,observability}`).
- `src/__tests__/hooks/use-exercises.test.tsx` — `useExercises` chama
  `fetchExercises` e expõe `data`/`error` (mock do módulo de API, wrapper com
  `QueryClient` e `retry: false`).
- Adicionar handler `GET …/exercises` em `src/mocks/handlers.ts` retornando
  `{ data: [...amostra reduzida...], error: null }` (cobrindo um item global e um
  com `user_id`, e um com `name` de variação).

### Maestro (E2E)

Fora do escopo imediato. Follow-up sugerido: `.maestro/flows/exercises/01-exercises-renders-list.yaml`
(include `subflows/launch-fresh.yaml` → sign-in → navegar até "Exercícios" →
assertVisible de um item conhecido do catálogo, ex. "Supino"). Incluir se desejado.

## Fora de escopo

Ações em lote (compartilhar/mover/excluir), filtro funcional, submit do
`addExercise`, tela de detalhe de exercício, exibição de `image_url`/`video_url`
(tile do `Dumbbell` permanece), paginação (a API não tem).

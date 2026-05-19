# Home — listagem de Workout Log Summaries

**Status:** Spec
**Data:** 2026-05-09
**Autor:** Alexandre Osada (com Claude)

## Contexto

A tela home (`src/app/(tabs)/index.tsx`) exibe hoje uma `ScrollView` com 3 `WorkoutLogCard` hardcoded. Esta é a primeira chamada do app cliente ao backend (`workout-tracker` API). Vamos conectar essa lista a dados reais via `GET /workout-logs/summaries`, com paginação por cursor (10 por página) usando `useInfiniteQuery` do React Query.

Como é a primeira integração, algumas decisões aqui viram padrão para todas as features seguintes:

- O envelope `{ data, error }` do backend é desempacotado dentro do `apiClient` (features recebem `T` direto e `ApiError` quando `error != null`).
- Tipos e helpers de domínio (formatters, mapeadores) ficam em `src/domain/<feature>/`. O **fetcher HTTP** (chamada concreta ao endpoint) fica em `src/lib/api/<feature>.ts`, do lado do `client.ts`.
- Hooks de React Query ficam em `src/hooks/` (já estabelecido) — separados do fetcher puro do domínio.
- Datas vêm em UTC do backend e são formatadas com **date-fns** + locale derivado de `language$`.

## Objetivo

Substituir os três cards hardcoded da home por uma lista virtualizada que:

1. Faz `GET /workout-logs/summaries?limit=10` na primeira página.
2. Vai paginando com `cursor=<ISO do startedAt do último item>` à medida que o usuário rola.
3. Renderiza estados de loading (skeletons), erro (com retry), vazio (mensagem) e sucesso (cards).
4. Suporta pull-to-refresh.
5. Reporta erros de feature via `captureWorkoutError`.

## Não-objetivos (YAGNI)

- E2E (Maestro) para esta feature — sem fixture/seed do backend, ficaria flakey. Adiar.
- Cache offline / persistência da query — o `staleTime: 30_000` global do `QueryClient` é o suficiente por ora.
- Filtros, ordenação, busca textual.
- Tipagem rica de `ValidationErrors` no client — campo `details` em `ApiError` fica como `unknown`. Refinar quando uma feature de form precisar.

## Arquitetura

### Resumo dos arquivos

```
src/lib/api/
  client.ts          [MOD] passa a desempacotar { data, error }
  errors.ts          [MOD] ApiError ganha `details?: unknown`
  workout-logs.ts    [NEW] fetchWorkoutLogSummaries(params, signal)

src/domain/workout-logs/
  types.ts           [NEW] WorkoutLogSummary, WorkoutLogSummariesPage
  format.ts          [NEW] formatters + toCardProps()

src/hooks/
  use-workout-log-summaries.ts   [NEW] useWorkoutLogSummaries() infinite query

src/components/workout-logs/
  WorkoutLogList.tsx             [NEW] FlashList + estados
  WorkoutLogCardSkeleton.tsx     [NEW] placeholder card

src/app/(tabs)/index.tsx         [MOD] usa <WorkoutLogList />

src/internationalization/locales/{en,pt}.ts   [MOD] novas chaves

package.json                      [MOD] adiciona @shopify/flash-list
```

### 1. Envelope: unwrap no `apiClient`

`src/lib/api/client.ts`

O backend sempre responde `{ data: T, error: null } | { data: null, error: { code, message, details? } }`. O `request<T>` passa a:

1. Ler o JSON normalmente.
2. Se `response.ok` mas a payload tem `error != null` — caso raro, mas defensivo — lançar `ApiError(response.status, error.message, error.code, error.details)`.
3. Se `response.ok` e `error === null` — retornar `payload.data` (mesmo se `data` for `null`, ex.: 204 não vem por essa rota).
4. Se `!response.ok` — comportamento atual (lê `error` do envelope, lança `ApiError`/`ApiUnauthorizedError`).
5. Status `204` continua devolvendo `undefined` antes do parse.

`src/lib/api/errors.ts`

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

`safeReadError` passa a entender o envelope `{ data: null, error: { code, message, details } }` (formato canônico) e mantém fallback para `{ message }`/`{ error }` cru por defesa.

### 2. Camada de domínio + fetcher

`src/domain/workout-logs/types.ts`

```ts
export type WorkoutLogSummary = {
  id: string;
  title: string;
  startedAt: string;        // ISO 8601 UTC
  durationSeconds: number;
  exerciseCount: number;
  muscleGroups: string[];
  prCount: number;
};

export type WorkoutLogSummariesPage = {
  items: WorkoutLogSummary[];
  hasMore: boolean;
};

export type FetchWorkoutLogSummariesParams = {
  limit: number;
  cursor?: string;          // ISO do último startedAt da página anterior
  userId?: string;          // suportado pela API; ainda não consumido pelo app — reservado para futuras telas (ex.: ver treinos de outro usuário)
  signal?: AbortSignal;
};
```

`src/lib/api/workout-logs.ts`

```ts
import { apiClient } from './client';
import type {
  FetchWorkoutLogSummariesParams,
  WorkoutLogSummariesPage,
} from '@/domain/workout-logs/types';

export async function fetchWorkoutLogSummaries(
  { limit, cursor, userId, signal }: FetchWorkoutLogSummariesParams,
): Promise<WorkoutLogSummariesPage> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set('cursor', cursor);
  if (userId) qs.set('userId', userId);
  return apiClient.get<WorkoutLogSummariesPage>(
    `/workout-logs/summaries?${qs.toString()}`,
    { signal },
  );
}
```

Sem React, sem React Query — só transporte. Mora em `src/lib/api/` ao lado do `client.ts`. Os tipos vêm de `src/domain/workout-logs/types.ts`. Testável unitariamente com `fetch` mockado.

### 3. Formatters

`src/domain/workout-logs/format.ts`

Usa `date-fns` (já em `dependencies`) e `date-fns/locale`. O locale é derivado da lib i18n no momento da chamada (a ser passado como parâmetro — formatters não leem state global).

```ts
import { formatDuration, formatRelative, intervalToDuration, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';

export function formatWorkoutLogSubtitle(startedAtIso: string, locale: Locale): string {
  const out = formatRelative(parseISO(startedAtIso), new Date(), { locale });
  // ptBR/enUS retornam minúsculo ("ontem às 12:43" / "yesterday at 12:43 PM").
  // O design espera capital ("Ontem…"), então capitalizamos a primeira letra.
  return out.charAt(0).toLocaleUpperCase() + out.slice(1);
}

export function formatWorkoutDuration(seconds: number, locale: Locale): string {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(duration, {
    locale,
    format: ['hours', 'minutes'],
    delimiter: ' ',
  });
}

export function formatExerciseCount(count: number, t: TFunction): string {
  return t('workoutLogs.exerciseCount', { count });   // i18next plural
}

export function toCardProps(
  summary: WorkoutLogSummary,
  t: TFunction,
  locale: Locale,
): WorkoutLogCardProps {
  return {
    title: summary.title,
    subtitle: formatWorkoutLogSubtitle(summary.startedAt, locale),
    muscleGroups: summary.muscleGroups,
    duration: formatWorkoutDuration(summary.durationSeconds, locale),
    exerciseCount: formatExerciseCount(summary.exerciseCount, t),
    hasRecord: summary.prCount > 0,
  };
}
```

**Datas e timezone.** `parseISO` preserva o offset UTC do backend; `formatRelative` cuida sozinho de hoje / ontem / dias da semana / data antiga, no locale e timezone do device — sem `isToday`/`isYesterday` manual. O locale (`ptBR`/`enUS`) é importado de `date-fns/locale` via um pequeno helper que lê o idioma resolvido (mesma resolução que o `LanguageBridge` faz para o i18next). `formatRelative` usa as strings já presentes nos locales do date-fns; nenhuma chave de i18n nova é necessária para o subtitle.

### 4. Hook React Query

`src/hooks/use-workout-log-summaries.ts`

```ts
export const PAGE_SIZE = 10;

export function useWorkoutLogSummaries() {
  return useInfiniteQuery({
    queryKey: ['workout-logs', 'summaries'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchWorkoutLogSummaries({ limit: PAGE_SIZE, cursor: pageParam, signal }),
    getNextPageParam: (last) =>
      last.hasMore ? last.items.at(-1)?.startedAt : undefined,
  });
}
```

`401 Unauthorized` cai no `QueryCache` global → `signOut()` (já implementado).

### 5. UI

`src/components/workout-logs/WorkoutLogCardSkeleton.tsx`

Card com mesma estrutura do `WorkoutLogCard` mas com `View`s `bg-muted` no lugar de texto/badges/ícone. Mesma altura aproximada para evitar reflow.

`src/components/workout-logs/WorkoutLogList.tsx`

```tsx
<FlashList
  data={items}                                  // flat dos pages
  keyExtractor={(it) => it.id}
  estimatedItemSize={156}                       // medir empiricamente
  renderItem={({ item }) => <WorkoutLogCard {...toCardProps(item, t, locale)} />}
  ItemSeparatorComponent={() => <View className="h-3" />}
  contentContainerClassName="p-4"
  onEndReached={() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }}
  onEndReachedThreshold={0.5}
  ListEmptyComponent={...}                      // só quando !isLoading
  ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
  refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} />}
/>
```

Estados:

- **Initial load** (`isLoading`): renderiza `<View>` com 3 `WorkoutLogCardSkeleton`. Não monta a FlashList (evita layout flash).
- **Initial error** (`isError && pages.length === 0`): View centralizada com texto `t('workoutLogs.error.title')` + `<Button onPress={refetch}>` com `t('workoutLogs.error.retry')`.
- **Empty** (`!isLoading && items.length === 0`): `ListEmptyComponent` com `t('workoutLogs.empty')`.
- **Loading more**: `ListFooterComponent` com `ActivityIndicator`.
- **Error em página subsequente**: page anterior já está renderizada; dispara `Toast.show({ type: 'error', text1: t('workoutLogs.error.title'), text2: t('workoutLogs.error.loadMore') })`. O próximo `onEndReached` tenta novamente.

`src/app/(tabs)/index.tsx`

```tsx
export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1">
      <WorkoutLogList />
    </SafeAreaView>
  );
}
```

### 6. Observabilidade

Dentro de `WorkoutLogList`, `useEffect` reage a transições para `isError` e dispara `captureWorkoutError(error, { feature: 'workout-logs.summaries' })`. 401 (já tratado globalmente) é filtrado: se `error instanceof ApiUnauthorizedError`, não captura (evita ruído no Sentry — é fluxo normal de logout).

### 7. i18n — chaves novas

`src/internationalization/locales/pt.ts`

```ts
workoutLogs: {
  // subtitle e duration vêm de date-fns (formatRelative + formatDuration); sem keys aqui
  exerciseCount_one: '{{count}} exercício',
  exerciseCount_other: '{{count}} exercícios',
  empty: 'Nenhum treino registrado ainda.',
  error: {
    title: 'Não foi possível carregar seus treinos.',
    retry: 'Tentar novamente',
    loadMore: 'Não foi possível carregar mais treinos.',
  },
},
```

Equivalente em `en.ts`.

### 8. Dependência

```bash
bun add @shopify/flash-list
```

Pode ser necessário rebuild nativo (`bun run prebuild:dev` + reinstall do dev client). Verifica na hora.

## Plano de testes (Jest)

Mirror em `src/__tests__/`:

1. `api/client.test.ts` — atualizar:
   - 200 com `{ data: T, error: null }` → retorna `T`
   - 200 com `{ data: null, error: {...} }` → lança `ApiError` com `code`, `details`
   - 4xx/5xx mantém comportamento anterior
   - 401 → `ApiUnauthorizedError`
   - 204 → `undefined` (sem parse)
2. `api/workout-logs.test.ts` — fetcher:
   - `limit` na querystring, sem `cursor` nem `userId` na primeira chamada
   - `cursor` adicionado quando passado
   - `userId` adicionado quando passado (mesmo que ainda não consumido pelo hook)
   - propaga `signal` para `apiClient.get`
3. `domain/workout-logs/format.test.ts` — formatters:
   - subtitle hoje/ontem/dia da semana (últimos 6 dias)/data antiga (mockando `new Date()` via `jest.useFakeTimers`)
   - subtitle: primeira letra capitalizada
   - subtitle: locale `ptBR` vs `enUS` (smoke test; conteúdo exato é responsabilidade do date-fns)
   - duração (segundos pequenos, exatamente 1h, mistos)
   - plural exerciseCount (1 vs N)
   - timezone: garantir que ISO em UTC é renderizado no TZ local (mockar TZ via `process.env.TZ`)
4. `hooks/use-workout-log-summaries.test.tsx` — hook:
   - `getNextPageParam` retorna último `startedAt` quando `hasMore`
   - `getNextPageParam` retorna `undefined` quando `!hasMore`
5. `workout-logs/WorkoutLogList.test.tsx` — componente:
   - render do skeleton em loading inicial
   - empty state quando `items.length === 0`
   - error state com botão retry (initial error)
   - render de N cards
   - chama `fetchNextPage` no `onEndReached` apenas se `hasNextPage && !isFetchingNextPage`
   - dispara `captureWorkoutError` no `isError` (não em `ApiUnauthorizedError`)
   - erro em página subsequente (`pages.length > 0` e `isError`) → `Toast.show` chamado uma vez (mock do `react-native-toast-message`)

## Critérios de sucesso

- Lista carrega 10 treinos do backend em ambiente de desenvolvimento.
- Rolar até o fim dispara mais 10 (visualmente: spinner no rodapé, depois novos cards).
- `hasMore: false` na última página → não dispara mais requests.
- Pull-to-refresh recarrega a primeira página.
- Erro de rede mostra estado de retry; clicar no botão refaz a query.
- `bun run test` passa.
- Sem warnings de chaves duplicadas, sem `console.error` no console.
- Manualmente: alternar idioma (pt→en) atualiza os textos da lista (subtitle, duration unit, plural).

## Notas / decisões pendentes

- **Estimated item size do FlashList**: 156 é chute. Medir com `__DEV__` warning depois.
- **Locale do date-fns**: pequeno mapa local (`pt → ptBR`, `en → enUS`). Caso `language$ === 'system'`, resolver como o `LanguageBridge` faz hoje.

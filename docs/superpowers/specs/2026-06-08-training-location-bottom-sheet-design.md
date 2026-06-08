# Eliminar a tela de Locais de Treino → seleção e gestão na bottom sheet

**Data:** 2026-06-08
**Status:** Aprovado para implementação

## Problema

Hoje a gestão de locais de treino vive em uma tela dedicada
(`app/(stacks)/(settings)/training-locations.tsx`), acessada por um `MenuCard` no
settings. A escolha do *local de preferência* é separada, num `Select` dropdown
(`DefaultLocationSelect`) dentro das preferências. São dois lugares para o mesmo
conceito.

Queremos unificar: a gestão dos locais passa a acontecer **junto da seleção do
local de preferência**, que deixa de ser um `Select` e vira uma **bottom sheet**
com a lista de locais. A sheet permite **selecionar**, **adicionar** e
**excluir** um local. Não há busca por nome. **Editar fica para depois.**

## Escopo

### Remover
- `apps/mobile/src/app/(stacks)/(settings)/training-locations.tsx` (tela inteira).
- Registro da rota em `apps/mobile/src/app/_layout.tsx` (`Stack.Screen` de
  `(stacks)/(settings)/training-locations`).
- O `MenuCard` de "Locais de treino" em
  `apps/mobile/src/app/(tabs)/(settings)/index.tsx` (linhas ~56-61). A última
  linha do grid fica só com o card de Assinatura — aceitável, o grid é `flex-row`.
- O componente `DefaultLocationSelect`
  (`apps/mobile/src/features/preferences/components/default-location-select.tsx`).
- A chave i18n `settings.trainingLocations` (en + pt) e o import do ícone `MapPin`
  se ficar órfão no settings index.

### Manter intacto
- Camada de API e hooks: `useTrainingLocations`, `useCreateTrainingLocation`,
  `useDeleteTrainingLocation`. **`useUpdateTrainingLocation` deixa de ser usado**
  (editar adiado) — pode permanecer no arquivo de hooks, sem consumidores.
- DB, rotas do backend, adapters de infraestrutura.
- `SessionLocationPrompt` (prompt de local na execução do treino).

## Novo componente: `DefaultLocationField`

Substitui o `DefaultLocationSelect`. Segue o padrão consolidado do
`DefaultRestSecondsField` (trigger `Pressable` + `BottomSheet` com `ref` local,
sem ref imperativo customizado).

Localização:
`apps/mobile/src/features/preferences/components/default-location-field.tsx`.

Props (idênticas ao componente que substitui, para troca limpa):
```ts
type DefaultLocationFieldProps = {
  value: string | null;
  onValueChange: (value: string | null) => void;
};
```

### Trigger
Um `Pressable` estilizado como input — mesma classe do `DefaultRestSecondsField`:
`h-10 w-full flex-row items-center rounded-md border border-input bg-background px-3`.
Mostra o nome do local selecionado (resolvido de `useTrainingLocations` por
`value`) ou "Sem local" (`preferencesScreen.defaultLocation.none`) com a cor
`text-muted-foreground/50` quando `value == null`. Ao tocar, `sheetRef.current?.present()`.

### Bottom sheet
`BottomSheet` + `BottomSheetView` (`className="gap-4 px-5 pt-2 pb-8"`).

- **Título**: `Text variant="h4"` — "Local de treino padrão"
  (reaproveita `preferencesScreen.defaultLocation.label`).

- **Adicionar**: linha `flex-row items-center gap-2` com `BottomSheetInput`
  (placeholder `trainingLocationsScreen.namePlaceholder`) + `Button` "Adicionar"
  (ícone `Plus`, label `trainingLocationsScreen.add`). Reaproveita a lógica de
  `handleAdd` da tela antiga: `name = newName.trim()`; se vazio ou
  `createLocation.isPending`, retorna; `await createLocation.mutateAsync({ name })`;
  limpa o input. Botão desabilitado quando `newName.trim().length === 0 ||
  createLocation.isPending`.

- **Lista**:
  - Carregando (`isLoading`): **`Skeleton`** (padrão do projeto — não
    `ActivityIndicator`), ex. 3 linhas `h-12 w-full`.
  - Primeiro item sempre **"Sem local"** (sentinela `null`), selecionável.
  - Depois os locais reais. Se não houver locais reais, mostra
    `trainingLocationsScreen.empty` abaixo do item "Sem local".
  - Cada item é um `Pressable` `rounded-lg border border-border p-3`; quando
    selecionado (`value === location.id`, ou `value == null` para o item "Sem
    local"), aplica `border-primary bg-primary/5` (padrão visual do
    `SetTypePickerSheet`), com `accessibilityState={{ selected }}`.
  - Tocar num local → `onValueChange(location.id)` e **fecha a sheet**
    (`sheetRef.current?.dismiss()`). Tocar em "Sem local" → `onValueChange(null)`
    e fecha.

- **Excluir**: somente nos locais reais (não no item "Sem local"). Ícone `Trash2`
  (`text-destructive`) dentro do item, como ação separada (`Pressable` com
  `hitSlop`), de modo que tocar na lixeira **não** dispara a seleção do item.
  Tocar abre um **`AlertDialog` de confirmação** (mesmo componente usado em
  `SessionLocationPrompt`). Ao confirmar:
  - Se `location.id === value`, chama `onValueChange(null)` (volta para "Sem
    local") — decisão de UX aprovada.
  - `deleteLocation.mutate(location.id)`.
  - A sheet **permanece aberta** após excluir.

### Estado interno
- `sheetRef = useRef<BottomSheetRef>(null)`
- `newName` (string) para o input de adicionar
- `pendingDelete` (TrainingLocation | null) para controlar o `AlertDialog`

Sem `useMemo`/`useCallback` manuais (React Compiler ligado neste app).

## Wiring nas preferências

`apps/mobile/src/app/(stacks)/(settings)/preferences.tsx` (~157-162): trocar
`<DefaultLocationSelect ... />` por `<DefaultLocationField ... />` com as mesmas
props (`value={draft.defaultTrainingLocationId}` / `onValueChange={...}`).

O `Label` "Local de treino padrão" e a descrição permanecem **fora** do
componente (em `preferences.tsx`), como está hoje — decisão aprovada.

## i18n

- **Reaproveitar** o arquivo `trainingLocationsScreen.ts` (en + pt) para as 3
  chaves usadas pela sheet: `namePlaceholder`, `add`, `empty`. Não migrar para
  `preferencesScreen`.
- **Adicionar** em `preferencesScreen.defaultLocation` (en + pt) as chaves de
  confirmação de exclusão:
  - `deleteConfirm.title`
  - `deleteConfirm.message`
  - `deleteConfirm.confirm`
  - `deleteConfirm.cancel`
- **Remover** `settings.trainingLocations` (en + pt).

## Testes

`default-location-field.test.tsx` (ao lado do componente):
- Trigger renderiza o nome do local selecionado e cai para "Sem local" quando
  `value == null`.
- Abrir a sheet revela a lista (com "Sem local" + locais mockados).
- Selecionar um local chama `onValueChange(id)`.
- Adicionar chama a mutation de create com o nome digitado.
- Excluir o local que está selecionado chama `onValueChange(null)` após confirmar
  no `AlertDialog`.

Mocks: `useTrainingLocations` / `useCreateTrainingLocation` /
`useDeleteTrainingLocation`. Seguir os padrões de teste existentes do projeto
(`test()` em vez de `it()`).

## Fora de escopo
- Editar/renomear local (adiado).
- Busca por nome.
- Mudanças em DB, rotas de backend, ou no `SessionLocationPrompt`.

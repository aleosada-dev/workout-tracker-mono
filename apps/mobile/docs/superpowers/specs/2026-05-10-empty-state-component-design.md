# Empty State Component — Design

## Goal

Componente UI genérico para mensagens de estado vazio (lista filtrada sem resultados, ainda sem dados, etc.), com título, subtítulo e CTA opcional. Substitui ad-hoc `<View><Text /></View>` espalhados pelo app.

## Location

`src/components/ui/empty-state.tsx` — segue convenção shadcn do projeto (mesmo lugar de `card`, `button`, `text`).

Teste: `src/__tests__/components/ui/empty-state.test.tsx` (mirror de `__tests__/`).

## API

```tsx
type EmptyStateProps = {
  title: string;
  subtitle: string;
  cta?: { label: string; onPress: () => void };
  testID?: string;
};

export function EmptyState(props: EmptyStateProps): JSX.Element;
```

Decisões:

- **`title` e `subtitle` obrigatórios** — empty states sem subtítulo são raros e ficam pobres; forçar evita o caso ruim.
- **`cta` como prop objeto** — encapsula a regra "sempre `Button` variant primary"; consumidor não consegue passar outro variant.
- **Strings já traduzidas** — consumidor chama `t()` e passa o resultado. Padrão do projeto.
- **Sem prop de ícone** — não pedido; YAGNI.

## Visual

Wrapper centralizado com borda tracejada (igual à imagem de referência):

```
View: items-center + justify-center + gap-3 + rounded-lg + border + border-dashed + border-border + p-6
├─ Text (className="font-sans-semibold text-center")            ← title
├─ Text (variant="muted", className="text-center")              ← subtitle
└─ Button (default variant) com Text dentro                     ← cta (se passado)
```

Tokens via NativeWind. Sem cores hardcoded. Não cria token novo — usa `border-border` e o `bg-muted` já corrigido.

## Tests

Casos cobertos em `empty-state.test.tsx`:

1. Renderiza `title` e `subtitle`.
2. Não renderiza botão quando `cta` é `undefined`.
3. Renderiza botão com `cta.label` quando passado.
4. Chama `cta.onPress` ao apertar o botão.
5. Aplica `testID` no wrapper.

Sem teste de "variant primary" do botão — a tipagem força `cta: { label, onPress }` e o componente sempre instancia `<Button>` (default = primary). Teste seria de implementação, não de contrato.

## Out of scope

- Ícone ilustrativo (pode ser adicionado depois com prop `icon` se virar necessário).
- Múltiplos CTAs (primário + secundário). Atual regra "sempre primary" exclui isso.
- Animação de entrada.
- Responsividade extra além do que o stack centralizado já oferece.

## Migration

Não migrar empty states existentes neste PR. Esta entrega cria o componente; consumir nas telas é trabalho separado quando cada tela for tocada.

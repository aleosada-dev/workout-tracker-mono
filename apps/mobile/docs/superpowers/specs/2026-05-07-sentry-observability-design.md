# Sentry Observability — Design

**Data:** 2026-05-07
**Status:** Draft (aguardando review do usuário)
**Plano Sentry:** Free (5K erros/mês, 10K spans, 50 replays, 30 dias retenção, 1 seat)

## Objetivo

Implementar observabilidade no app Workout Tracker com **Sentry**, com foco em **registrar erros com contexto suficiente para resolver e reproduzir bugs**. A integração deve ser fina o bastante para permitir troca de provedor no futuro sem reescrever call sites espalhados pelo app.

## Decisões fundacionais

| Tópico | Decisão | Razão |
|---|---|---|
| Ambientes ativos | `preview` + `production` | `development` usa adapter local; evita gastar quota com erros conhecidos. |
| Recursos do Sentry | Error tracking + native crashes + Tracing/Performance | Replay e Profiling descartados nesta fase. |
| PII | `user_id` apenas (UUID Supabase), `sendDefaultPii: false` | Suficiente para correlacionar usuários impactados sem expor email. |
| Filtros | Conservadores (lista de patterns explícita) | Reduzir ruído e proteger quota. |
| Tracing sample rate | `1.0` em preview, `0.1` em production | Visibilidade total em testes internos, conservador em produção. |
| Contexto customizado | Médio (workout_id, exercise atual, breadcrumbs em ações importantes) | Bom equilíbrio entre reprodução de bugs e custo de implementação. |
| DSN config | `EXPO_PUBLIC_SENTRY_DSN` (env var direta) | Convenção atual da Expo SDK 49+. |
| Auth binding | Auto-bind via Provider escutando `supabase.auth.onAuthStateChange` | Sem dependência de telas de login/logout chamarem `setUser`. |
| Adapter em dev | Console adapter (logs estruturados) | Você vê localmente o que iria pro Sentry, sem gastar quota. |
| Arquitetura | Fachada de observability com adapter pattern | Possibilidade real de troca de provedor no futuro. |

## Arquitetura

### Estrutura de arquivos

```
src/lib/observability/
├── index.ts                  # API pública — único ponto de import no app
├── config.ts                 # leitura de EXPO_PUBLIC_SENTRY_DSN, variant, etc.
├── provider.tsx              # <ObservabilityProvider> — init + bind ao auth
├── error-boundary.tsx        # <ObservabilityErrorBoundary>
├── workout-helpers.ts        # captureWorkoutError, trackWorkoutAction
├── types.ts                  # contratos provider-agnósticos
└── adapters/
    ├── sentry.ts             # implementação @sentry/react-native
    └── console.ts            # logs estruturados em __DEV__
```

**Regra de isolamento:** nenhum arquivo fora de `src/lib/observability/adapters/sentry.ts` importa `@sentry/react-native`. Trocar de provedor = escrever um novo arquivo em `adapters/` e mudar uma linha em `index.ts`.

### Contrato (provider-agnóstico)

```ts
// src/lib/observability/types.ts
export type ObservabilityUser = { id: string } | null;

export type BreadcrumbCategory =
  | 'navigation' | 'auth' | 'workout' | 'sync' | 'ui' | 'http';

export type Breadcrumb = {
  category: BreadcrumbCategory;
  message: string;
  data?: Record<string, string | number | boolean>;
  level?: 'info' | 'warning' | 'error';
};

export type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export type ObservabilityConfig = {
  dsn: string;
  environment: 'preview' | 'production';
  release: string;          // ex: workout-tracker-app@1.0.0+abc123fingerprint
  runtimeVersion: string;   // fingerprint da build nativa (vai como tag)
  updateId?: string;        // EAS Update id, se OTA estiver carregada
  tracesSampleRate: number;
  appVariant: string;
  locale: string;
};

export interface ObservabilityAdapter {
  init(config: ObservabilityConfig): void;
  setUser(user: ObservabilityUser): void;
  captureException(err: unknown, ctx?: CaptureContext): void;
  captureMessage(
    msg: string,
    ctx?: CaptureContext & { level?: 'info' | 'warning' | 'error' },
  ): void;
  addBreadcrumb(crumb: Breadcrumb): void;
  setTag(key: string, value: string): void;
  startSpan<T>(name: string, op: string, fn: () => Promise<T> | T): Promise<T> | T;
}
```

### API pública

```ts
// src/lib/observability/index.ts
import { sentryAdapter } from './adapters/sentry';
import { consoleAdapter } from './adapters/console';

const adapter = __DEV__ ? consoleAdapter : sentryAdapter;

export const observability = adapter;
export { ObservabilityProvider } from './provider';
export { ObservabilityErrorBoundary } from './error-boundary';
export { captureWorkoutError, trackWorkoutAction } from './workout-helpers';
export type { Breadcrumb, CaptureContext, ObservabilityConfig } from './types';
```

### Uso no app

```ts
import { observability, captureWorkoutError, trackWorkoutAction } from '@/lib/observability';

try {
  await saveSet(setData);
  trackWorkoutAction('Set saved', { workoutId, setNumber: 3 });
} catch (err) {
  captureWorkoutError(err, { workoutId, exerciseId, action: 'save_set' });
  throw err;
}
```

## Configuração

### Variáveis de ambiente

```
# .env.example
EXPO_PUBLIC_SENTRY_DSN=
```

- DSN é público — pode ficar versionado em `.env.example`. O valor real vai em `.env` local (gitignored).
- Em EAS: `eas env:create --environment preview --name EXPO_PUBLIC_SENTRY_DSN` e similar para production.
- Mesmo DSN para preview e production — separação acontece via `environment` tag no Sentry init.

### Pré-requisitos de setup (fase de implementação)

1. Criar conta no Sentry e projeto **react-native** (chamado `workout-tracker-app`).
2. Anotar o DSN.
3. Gerar **auth token** em Sentry (`Settings → Account → Auth Tokens`) com scopes `project:releases`, `project:read`, `org:read`. Configurar como segredo no EAS:
   ```bash
   eas env:create --scope project --name SENTRY_AUTH_TOKEN --type secret --value <token>
   ```
4. Adicionar `EXPO_PUBLIC_SENTRY_DSN` em `.env`, `.env.example` e EAS env.

### Adapter Sentry — `init`

```ts
// src/lib/observability/adapters/sentry.ts (resumo)
import * as Sentry from '@sentry/react-native';

const EXPECTED_ERROR_PATTERNS = [
  /Network request failed/i,
  /Aborted/i,
  /AuthApiError.*refresh_token_not_found/i,
  /AuthSessionMissingError/i,
];

const NOISY_BREADCRUMB_URL_PATTERNS = [
  /\/auth\/v1\/token/,  // Supabase auth refresh
];

function filterExpectedErrors(event, hint) {
  const msg = hint?.originalException?.message ?? event.message ?? '';
  if (EXPECTED_ERROR_PATTERNS.some(p => p.test(msg))) return null;
  return event;
}

function filterNoiseBreadcrumbs(crumb) {
  if (crumb.level === 'debug') return null;
  if (crumb.category === 'console' && crumb.level === 'log') return null;
  if (
    crumb.category === 'http' &&
    typeof crumb.data?.url === 'string' &&
    NOISY_BREADCRUMB_URL_PATTERNS.some(p => p.test(crumb.data.url))
  ) {
    return null;
  }
  return crumb;
}

export const sentryAdapter: ObservabilityAdapter = {
  init(config) {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      dist: config.updateId ?? 'native',  // separa OTAs dentro de um release
      enableNative: true,
      enableAutoSessionTracking: true,
      enableAppStartTracking: true,
      enableNativeFramesTracking: true,
      enableStallTracking: true,
      tracesSampleRate: config.tracesSampleRate,
      attachStacktrace: true,
      sendDefaultPii: false,
      beforeSend: filterExpectedErrors,
      beforeBreadcrumb: filterNoiseBreadcrumbs,
      // reactNativeTracingIntegration adicionada automaticamente pelo SDK
      // quando tracesSampleRate > 0.
    });

    // Tags globais
    Sentry.setTag('app_variant', config.appVariant);
    Sentry.setTag('locale', config.locale);
    Sentry.setTag('runtime_version', config.runtimeVersion);
    if (config.updateId) Sentry.setTag('update_id', config.updateId);
  },
  // ... setUser, captureException, captureMessage, addBreadcrumb, setTag, startSpan
};
```

### Adapter Console (dev)

Logs estruturados completos. Cada chamada é uma linha de cabeçalho + payload em JSON pretty-print:

```
[obs] init env=development variant=development locale=pt-BR
[obs] setUser id=550e8400-e29b-41d4-a716-446655440000
[obs] addBreadcrumb category=workout message="Set saved"
       data: { workoutId: "abc-123", setNumber: 3 }
[obs] captureException feature=workout action=save_set
       extra: { workoutId: "abc-123", exerciseId: "bench-press" }
       Error: Failed to save set
         at SetForm.tsx:42:8
         at handleSubmit (...)
```

### Provider

```tsx
// src/lib/observability/provider.tsx
import { useEffect } from 'react';
import i18n from '@/internacionalization';
import { supabase } from '@/lib/supabase';
import { observability } from './index';
import { resolveConfig } from './config';

export function ObservabilityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    observability.init(resolveConfig());

    // Bind ao auth do Supabase
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      observability.setUser(session?.user ? { id: session.user.id } : null);
    });
    supabase.auth.getSession().then(({ data }) => {
      observability.setUser(data.session?.user ? { id: data.session.user.id } : null);
    });

    // Atualiza tag locale quando o idioma mudar em runtime
    const onLanguageChange = (lang: string) => observability.setTag('locale', lang);
    i18n.on('languageChanged', onLanguageChange);

    return () => {
      sub.subscription.unsubscribe();
      i18n.off('languageChanged', onLanguageChange);
    };
  }, []);

  return <>{children}</>;
}
```

### `resolveConfig`

```ts
// src/lib/observability/config.ts
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import i18n from '@/internacionalization';
import type { ObservabilityConfig } from './types';

export function resolveConfig(): ObservabilityConfig {
  const variant = Constants.expoConfig?.extra?.appVariant ?? 'development';
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const runtimeVersion = String(Updates.runtimeVersion ?? 'unknown');

  return {
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    environment: variant === 'production' ? 'production' : 'preview',
    release: `workout-tracker-app@${version}+${runtimeVersion}`,
    runtimeVersion,
    updateId: Updates.updateId ?? undefined,
    tracesSampleRate: variant === 'production' ? 0.1 : 1.0,
    appVariant: variant,
    locale: i18n.language,
  };
}
```

**Sobre `release`, `runtimeVersion` e `updateId`:**

- `release`: identifica uma **build nativa**. Formato `workout-tracker-app@{version}+{runtimeVersion}`. Versões nativas distintas (qualquer mudança que altere o fingerprint nativo) viram releases distintas no Sentry — isso é fundamental para que source maps e dSYMs casem com o binário certo.
- `runtimeVersion`: vai como **tag** (não como release) para facilitar busca/filtro.
- `updateId`: identifica uma **OTA específica** dentro de uma build nativa. O adapter Sentry mapeia para `dist` (campo nativo do Sentry), mas o contrato genérico expõe apenas `updateId` para portabilidade. Quando ausente (build nativo recém-instalado), o adapter usa `'native'` como dist.

### Integração no `_layout.tsx`

```tsx
// src/app/_layout.tsx (esboço — manter providers existentes)
<ObservabilityErrorBoundary>
  <ObservabilityProvider>
    {/* providers atuais (theme, i18n, supabase, etc) */}
    <Stack />
  </ObservabilityProvider>
</ObservabilityErrorBoundary>
```

## Helpers de domínio

```ts
// src/lib/observability/workout-helpers.ts
import { observability } from './index';

type WorkoutErrorContext = {
  workoutId?: string;
  exerciseId?: string;
  action: string;  // ex: 'save_set', 'start_workout', 'sync'
};

export function captureWorkoutError(err: unknown, ctx: WorkoutErrorContext) {
  observability.captureException(err, {
    tags: { feature: 'workout', action: ctx.action },
    extra: { workoutId: ctx.workoutId, exerciseId: ctx.exerciseId },
  });
}

export function trackWorkoutAction(
  action: string,
  data: Record<string, string | number>,
) {
  observability.addBreadcrumb({
    category: 'workout',
    message: action,
    data,
  });
}
```

Pontos de instrumentação iniciais (a confirmar na fase de implementação, mas previstos):

- `start_workout`, `complete_workout`, `cancel_workout`
- `save_set`, `delete_set`
- `sync_workout` (sync com Supabase)
- Auth: `sign_in`, `sign_out` (já vêm via auth state listener — não duplicar)

## Releases e source maps

O config plugin oficial `@sentry/react-native/expo` automatiza:
- Geração de release `workout-tracker-app@{version}+{runtimeVersion}` em EAS Build (mesmo formato usado em runtime pelo `resolveConfig`)
- Upload de source maps de iOS e Android
- Upload de dSYMs (iOS) e mappings (Android)

Para EAS Update (OTAs), adicionar ao `package.json`:

```json
"scripts": {
  "update:preview": "eas update --branch preview --auto && npx sentry-expo-upload-sourcemaps",
  "update:prod": "eas update --branch production --auto && npx sentry-expo-upload-sourcemaps"
}
```

Configuração do plugin em `app.config.ts` (os valores `organization` e `project` ficam definidos só após criar conta/projeto Sentry — são preenchidos no passo 1 dos pré-requisitos):

```ts
plugins: [
  // ...existing
  [
    '@sentry/react-native/expo',
    {
      organization: process.env.SENTRY_ORG,    // ex: 'osada-inc'
      project: process.env.SENTRY_PROJECT,     // ex: 'workout-tracker-app'
    },
  ],
],
```

`SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` ficam apenas no ambiente de build (EAS env), não em runtime. Não precisam de prefixo `EXPO_PUBLIC_`.

## Error Boundary

```tsx
// src/lib/observability/error-boundary.tsx (esboço)
import { observability } from './index';

export class ObservabilityErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    observability.captureException(error, {
      tags: { source: 'react_error_boundary' },
      extra: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return <FallbackErrorScreen onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

`<FallbackErrorScreen />` é um componente novo a ser criado em `src/lib/observability/fallback-error-screen.tsx`. Conteúdo mínimo: título traduzido (`i18n.t('errors.unexpected.title')`), mensagem genérica, botão "Tentar novamente" que chama `onRetry`. Reutiliza primitivos `Text`/`Button` existentes em `src/components/ui/`. Sem dependência de navegação para evitar loops em caso de erro no router.

## Verificação

Antes de declarar feito:

1. **Erro proposital em build preview**: tela `debug/` ganha um botão "Trigger test error" (apenas em variants `development` e `preview`). Build com `eas build --profile preview --platform ios`.
2. Disparar o erro → confirmar em sentry.io:
   - Stack trace **deobfuscado** (source maps OK)
   - `user.id` presente
   - Tags: `app_variant=preview`, `locale`, `runtime_version`, `update_id` (se OTA)
   - Breadcrumbs visíveis incluindo navegação e ações de workout
3. **Crash nativo**: testar `Sentry.nativeCrash()` para validar que crashes nativos chegam (com source maps + dSYM/mappings).
4. **Filtros**: forçar erro com mensagem `Network request failed` → confirmar que **não** chega ao Sentry.
5. **Logout**: chamar logout, gerar erro → confirmar que `user` é `null` no evento.

## Edge cases tratados

| Caso | Comportamento |
|---|---|
| Init timing | `init` chama no `useEffect` do Provider, mas crashes nativos pré-init são capturados pelo SDK nativo do Sentry. |
| App offline | SDK do Sentry tem queue offline próprio. Eventos enfileirados localmente e enviados ao reconectar. |
| App em background | Crashes nativos pelo SDK nativo, JS errors também. |
| Logout | Listener `onAuthStateChange` chama `setUser(null)` automaticamente. |
| Quota guard | Filtros `beforeSend` são primeira linha. Segunda linha: regras Inbound em sentry.io para silenciar erros conhecidos sem deploy. |
| `EXPO_PUBLIC_SENTRY_DSN` ausente | `init` é chamado com DSN vazio → SDK do Sentry vira no-op (não crasha). Em dev usamos console adapter, então sequer chamamos Sentry. |
| Mudança de idioma em runtime | Provider escuta `i18n.on('languageChanged')` e chama `observability.setTag('locale', newLang)`. |

## O que está fora do escopo desta entrega

- **Session Replay** (decidiu-se não usar nesta fase)
- **Profiling** (decidiu-se não usar)
- **User Feedback widget** (pode entrar em fase futura)
- **Alertas/notificações em sentry.io** (configurados no dashboard, não no código)
- **Dashboards customizados** (idem)
- **Breadcrumbs em "quase toda interação do usuário"** (escolheu-se nível Médio, não Completo)

## Critérios de aceite

- [ ] Nenhum arquivo fora de `src/lib/observability/adapters/sentry.ts` importa `@sentry/react-native` (verificável via `grep`)
- [ ] Build preview consegue capturar erro JS proposital com stack trace deobfuscado
- [ ] Build preview consegue capturar `Sentry.nativeCrash()` com símbolos resolvidos
- [ ] `user.id` aparece nos eventos quando o usuário está logado, e some após logout
- [ ] Tags `app_variant`, `locale`, `runtime_version` e `update_id` (quando aplicável) presentes em todos eventos
- [ ] Erros com mensagem em `EXPECTED_ERROR_PATTERNS` **não** chegam ao Sentry
- [ ] Em `__DEV__`, nenhum evento é enviado ao Sentry; logs aparecem no console com formato estruturado
- [ ] EAS Update dispara upload de source maps automaticamente

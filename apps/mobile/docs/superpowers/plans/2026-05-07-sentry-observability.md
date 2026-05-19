# Sentry Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma camada de observability sobre Sentry no app Expo (workout-tracker-app), com fachada provider-agnóstica, captura automática de erros, contexto de domínio e source maps via EAS.

**Architecture:** Fachada com adapter pattern em `src/lib/observability/`. Apenas `adapters/sentry.ts` importa `@sentry/react-native`. Em `__DEV__` usa `consoleAdapter` (logs estruturados); em builds preview/production usa `sentryAdapter`. `ObservabilityProvider` faz init e bind ao auth do Supabase + listener de i18n. Helpers de domínio (`captureWorkoutError`, `trackWorkoutAction`) abstraem chamadas comuns.

**Tech Stack:** Expo SDK 55 · React Native 0.83 · Expo Router · `@sentry/react-native` (config plugin oficial) · Supabase (`@supabase/supabase-js`) · i18next · NativeWind

**Spec:** `docs/superpowers/specs/2026-05-07-sentry-observability-design.md`

> **Notas operacionais (importante):**
> - **Não há passos de `git commit`** neste plano. O usuário prefere agrupar/revisar mudanças e commitar manualmente. Cada task termina com um checkpoint manual ("Pause point") para você decidir se quer commitar ou seguir.
> - O projeto **não tem framework de unit test** configurado. Validação acontece via console adapter em dev e smoke test em build preview.
> - O usuário usa **bun** como package manager (vide `bun.lock`), mas para libs com código nativo a recomendação é `npx expo install ...` (resolve versão compatível com SDK 55).

---

## File Structure

Arquivos novos:

| Caminho | Responsabilidade |
|---|---|
| `src/lib/observability/types.ts` | Contratos provider-agnósticos (`ObservabilityAdapter`, `Breadcrumb`, etc). Sem dependências externas. |
| `src/lib/observability/config.ts` | `resolveConfig()`: lê variant, version, runtime version, locale, DSN. |
| `src/lib/observability/adapters/console.ts` | Adapter para `__DEV__`: logs estruturados em `console.log`/`console.warn`. |
| `src/lib/observability/adapters/sentry.ts` | Adapter para builds preview/prod: importa `@sentry/react-native`, define filtros, faz init. |
| `src/lib/observability/index.ts` | API pública (`observability` singleton, exports). Escolhe adapter via `__DEV__`. |
| `src/lib/observability/provider.tsx` | `ObservabilityProvider`: init + bind ao Supabase auth + listener i18n. |
| `src/lib/observability/error-boundary.tsx` | `ObservabilityErrorBoundary`: React Error Boundary que captura e mostra fallback. |
| `src/lib/observability/fallback-error-screen.tsx` | UI de fallback para o Error Boundary (Text + Button + i18n). |
| `src/lib/observability/workout-helpers.ts` | `captureWorkoutError`, `trackWorkoutAction`. |
| `src/app/debug/sentry-test.tsx` | Tela de debug com botão "Trigger test error" (apenas para variants dev/preview). |
| `.env.example` | Template com `EXPO_PUBLIC_SENTRY_DSN=`. |

Arquivos modificados:

| Caminho | Mudança |
|---|---|
| `app.config.ts` | Adicionar `@sentry/react-native/expo` plugin. |
| `src/app/_layout.tsx` | Envolver com `<ObservabilityErrorBoundary>` e `<ObservabilityProvider>`. |
| `src/internacionalization/locales/pt.ts` | Adicionar `errors.unexpected.{title,message,retry}`. |
| `src/internacionalization/locales/en.ts` | Mesmo, em inglês. |
| `package.json` | Adicionar `@sentry/react-native`; atualizar scripts `update:preview`/`update:prod` para upload de source maps. |
| `.gitignore` | Adicionar `.env` (atualmente só `.env*.local` está ignorado e há um `.env` no root). |

---

## Task 1: Pré-requisitos externos do Sentry (manual)

> Setup que **não envolve código** — você (humano) executa antes de programar.

**Files:** nenhum.

- [ ] **Step 1.1: Criar conta/organização e projeto no Sentry**

Vá em https://sentry.io e crie uma conta (plano free). Crie:
- Organização (anote o slug, ex: `osada-inc`)
- Projeto **React Native** com nome `workout-tracker-app` (anote o slug)

Anote:
- DSN (`https://xxx@oNNN.ingest.sentry.io/yyy`)
- Org slug
- Project slug

- [ ] **Step 1.2: Gerar auth token para upload de releases/source maps**

No Sentry: `Settings → Account → Auth Tokens → Create New Token`. Scopes mínimos:
- `project:releases`
- `project:read`
- `org:read`

Anote o token (formato `sntrys_...`).

- [ ] **Step 1.3: Configurar variáveis no EAS**

Rode os comandos abaixo (substituindo valores). Os comandos só funcionam no diretório do projeto.

```bash
# Runtime DSN (preview)
eas env:create --environment preview --name EXPO_PUBLIC_SENTRY_DSN --value "<dsn>"
eas env:create --environment preview --name SENTRY_ORG --value "<org-slug>"
eas env:create --environment preview --name SENTRY_PROJECT --value "workout-tracker-app"

# Runtime DSN (production)
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value "<dsn>"
eas env:create --environment production --name SENTRY_ORG --value "<org-slug>"
eas env:create --environment production --name SENTRY_PROJECT --value "workout-tracker-app"

# Auth token (secret, ambos ambientes)
eas env:create --environment preview --name SENTRY_AUTH_TOKEN --type secret --value "<token>"
eas env:create --environment production --name SENTRY_AUTH_TOKEN --type secret --value "<token>"
```

Verificar com:
```bash
eas env:list --environment preview
eas env:list --environment production
```

Esperado: ver as 4 vars listadas em cada (a `SENTRY_AUTH_TOKEN` aparece como `[secret]`).

- [ ] **Step 1.4: Pause point**

Conferir que tem em mãos: DSN, org slug, project slug, auth token, e que `eas env:list` mostra as 4 vars em ambos ambientes.

---

## Task 2: Instalar `@sentry/react-native`

**Files:**
- Modify: `package.json`, `bun.lock`

- [ ] **Step 2.1: Instalar lib com versão compatível com SDK 55**

Use `npx expo install` (não `bun add` direto) para resolver a versão alinhada com Expo SDK 55:

```bash
npx expo install @sentry/react-native
```

Esperado: linha como `Installed @sentry/react-native@<x.y.z>` em `package.json` `dependencies`. Bun lock atualizado.

- [ ] **Step 2.2: Verificar versão compatível**

Confirmar versão instalada:
```bash
grep '"@sentry/react-native"' package.json
```

Não há ação adicional aqui — só sanity check.

- [ ] **Step 2.3: Pause point**

Decidir se quer commitar `package.json + bun.lock` neste ponto ou continuar.

---

## Task 3: Configurar variáveis de ambiente locais

**Files:**
- Create: `.env.example`
- Modify: `.env` (adicionar var; arquivo já existe)
- Modify: `.gitignore`

- [ ] **Step 3.1: Criar `.env.example`**

```bash
# .env.example
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_SENTRY_DSN=
```

(Inclui as duas Supabase vars para servir como template completo, mesmo que o foco aqui seja Sentry.)

- [ ] **Step 3.2: Adicionar DSN ao `.env` local**

Editar `.env` e adicionar a linha:

```bash
EXPO_PUBLIC_SENTRY_DSN=<o-dsn-do-passo-1.1>
```

(Não substituir nem remover linhas existentes.)

- [ ] **Step 3.3: Adicionar `.env` ao `.gitignore`**

Atualmente `.gitignore` tem apenas `.env*.local`. O arquivo `.env` deveria também ser ignorado.

Localizar a linha:
```
.env*.local
```

E substituir por:
```
.env
.env*.local
```

- [ ] **Step 3.4: Verificar status git**

```bash
git status
```

Esperado: `.env` **não** aparece em untracked nem em modified (deve estar ignorado agora).

- [ ] **Step 3.5: Pause point**

Conferir que `.env.example` está versionado, `.env` está ignorado, e `EXPO_PUBLIC_SENTRY_DSN` está definido localmente.

---

## Task 4: Adicionar config plugin do Sentry em `app.config.ts`

**Files:**
- Modify: `app.config.ts`

- [ ] **Step 4.1: Adicionar plugin no array `plugins`**

Localizar:

```ts
plugins: [
  'expo-router',
  'expo-font',
  'expo-secure-store',
  'expo-localization',
  './plugins/withGradleJvmArgs',
  [
    'expo-splash-screen',
    {
      backgroundColor: '#0A0A0A',
      image: './assets/images/splash-icon.png',
      imageWidth: 200,
    },
  ],
],
```

Adicionar como último item antes do `]`:

```ts
plugins: [
  'expo-router',
  'expo-font',
  'expo-secure-store',
  'expo-localization',
  './plugins/withGradleJvmArgs',
  [
    'expo-splash-screen',
    {
      backgroundColor: '#0A0A0A',
      image: './assets/images/splash-icon.png',
      imageWidth: 200,
    },
  ],
  [
    '@sentry/react-native/expo',
    {
      organization: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
  ],
],
```

- [ ] **Step 4.2: Validar que o config carrega**

Rodar:
```bash
npx expo config --type prebuild
```

Esperado: comando termina com exit 0 e não printa erros sobre o plugin Sentry. Em ambiente local sem `SENTRY_ORG`/`SENTRY_PROJECT`, o plugin pode logar warning mas não pode falhar — isso é esperado em dev local.

- [ ] **Step 4.3: Pause point**

Decidir se commit ou seguir.

---

## Task 5: Criar `types.ts` (contratos)

**Files:**
- Create: `src/lib/observability/types.ts`

- [ ] **Step 5.1: Escrever o arquivo completo**

```ts
// src/lib/observability/types.ts
export type ObservabilityUser = { id: string } | null;

export type BreadcrumbCategory =
  | 'navigation'
  | 'auth'
  | 'workout'
  | 'sync'
  | 'ui'
  | 'http';

export type BreadcrumbLevel = 'info' | 'warning' | 'error';

export type Breadcrumb = {
  category: BreadcrumbCategory;
  message: string;
  data?: Record<string, string | number | boolean>;
  level?: BreadcrumbLevel;
};

export type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export type CaptureMessageContext = CaptureContext & {
  level?: BreadcrumbLevel;
};

export type ObservabilityConfig = {
  dsn: string;
  environment: 'preview' | 'production';
  release: string; // workout-tracker-app@{version}+{runtimeVersion}
  runtimeVersion: string;
  updateId?: string;
  tracesSampleRate: number;
  appVariant: string;
  locale: string;
};

export interface ObservabilityAdapter {
  init(config: ObservabilityConfig): void;
  setUser(user: ObservabilityUser): void;
  captureException(err: unknown, ctx?: CaptureContext): void;
  captureMessage(msg: string, ctx?: CaptureMessageContext): void;
  addBreadcrumb(crumb: Breadcrumb): void;
  setTag(key: string, value: string): void;
  startSpan<T>(name: string, op: string, fn: () => Promise<T> | T): Promise<T> | T;
}
```

- [ ] **Step 5.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Esperado: sem erros novos vindos de `src/lib/observability/types.ts`.

- [ ] **Step 5.3: Pause point**

---

## Task 6: Criar `config.ts` (`resolveConfig`)

**Files:**
- Create: `src/lib/observability/config.ts`

- [ ] **Step 6.1: Escrever o arquivo completo**

```ts
// src/lib/observability/config.ts
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import i18n from '@/internacionalization/i18n';
import type { ObservabilityConfig } from './types';

export function resolveConfig(): ObservabilityConfig {
  const variant = (Constants.expoConfig?.extra?.appVariant as string) ?? 'development';
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

> O import do i18n usa o caminho explícito `@/internacionalization/i18n` porque o módulo `index` do diretório não existe — `i18n.ts` é o entrypoint nomeado.

- [ ] **Step 6.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6.3: Pause point**

---

## Task 7: Criar adapter Console

**Files:**
- Create: `src/lib/observability/adapters/console.ts`

- [ ] **Step 7.1: Escrever o arquivo completo**

```ts
// src/lib/observability/adapters/console.ts
import type {
  Breadcrumb,
  CaptureContext,
  CaptureMessageContext,
  ObservabilityAdapter,
  ObservabilityConfig,
  ObservabilityUser,
} from '../types';

const PREFIX = '[obs]';

function fmtCtx(ctx?: CaptureContext): string {
  if (!ctx) return '';
  const parts: string[] = [];
  if (ctx.tags) {
    for (const [k, v] of Object.entries(ctx.tags)) parts.push(`${k}=${v}`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

export const consoleAdapter: ObservabilityAdapter = {
  init(config: ObservabilityConfig) {
    console.log(
      `${PREFIX} init env=${config.environment} variant=${config.appVariant} locale=${config.locale} runtime=${config.runtimeVersion}${
        config.updateId ? ` update=${config.updateId}` : ''
      }`,
    );
  },

  setUser(user: ObservabilityUser) {
    if (user) console.log(`${PREFIX} setUser id=${user.id}`);
    else console.log(`${PREFIX} setUser <anonymous>`);
  },

  captureException(err: unknown, ctx?: CaptureContext) {
    console.warn(`${PREFIX} captureException${fmtCtx(ctx)}`);
    if (ctx?.extra) console.warn('       extra:', ctx.extra);
    console.warn('      ', err);
  },

  captureMessage(msg: string, ctx?: CaptureMessageContext) {
    const level = ctx?.level ?? 'info';
    const fn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
    fn(`${PREFIX} captureMessage [${level}]${fmtCtx(ctx)} ${msg}`);
    if (ctx?.extra) fn('       extra:', ctx.extra);
  },

  addBreadcrumb(crumb: Breadcrumb) {
    console.log(`${PREFIX} addBreadcrumb category=${crumb.category} message="${crumb.message}"`);
    if (crumb.data) console.log('       data:', crumb.data);
  },

  setTag(key: string, value: string) {
    console.log(`${PREFIX} setTag ${key}=${value}`);
  },

  async startSpan<T>(name: string, op: string, fn: () => Promise<T> | T): Promise<T> {
    console.log(`${PREFIX} startSpan op=${op} name="${name}"`);
    const start = Date.now();
    try {
      const result = await fn();
      console.log(`${PREFIX} endSpan op=${op} name="${name}" duration=${Date.now() - start}ms`);
      return result;
    } catch (err) {
      console.warn(`${PREFIX} endSpan op=${op} name="${name}" duration=${Date.now() - start}ms ERROR`);
      throw err;
    }
  },
};
```

- [ ] **Step 7.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 7.3: Pause point**

---

## Task 8: Criar adapter Sentry

**Files:**
- Create: `src/lib/observability/adapters/sentry.ts`

- [ ] **Step 8.1: Escrever o arquivo completo**

```ts
// src/lib/observability/adapters/sentry.ts
import * as Sentry from '@sentry/react-native';
import type {
  Breadcrumb,
  CaptureContext,
  CaptureMessageContext,
  ObservabilityAdapter,
  ObservabilityConfig,
  ObservabilityUser,
} from '../types';

// --- Filtros ---

const EXPECTED_ERROR_PATTERNS: RegExp[] = [
  /Network request failed/i,
  /Aborted/i,
  /AuthApiError.*refresh_token_not_found/i,
  /AuthSessionMissingError/i,
];

const NOISY_BREADCRUMB_URL_PATTERNS: RegExp[] = [
  /\/auth\/v1\/token/, // Supabase auth refresh
];

export function isExpectedError(message: string): boolean {
  return EXPECTED_ERROR_PATTERNS.some((p) => p.test(message));
}

function filterExpectedErrors(
  event: Sentry.ErrorEvent,
  hint: { originalException?: unknown },
): Sentry.ErrorEvent | null {
  const exc = hint?.originalException as { message?: string } | undefined;
  const msg = exc?.message ?? event.message ?? '';
  if (isExpectedError(msg)) return null;
  return event;
}

function filterNoiseBreadcrumbs(
  crumb: Sentry.Breadcrumb,
): Sentry.Breadcrumb | null {
  if (crumb.level === 'debug') return null;
  if (crumb.category === 'console' && crumb.level === 'log') return null;
  if (
    crumb.category === 'http' &&
    typeof (crumb.data as { url?: unknown } | undefined)?.url === 'string' &&
    NOISY_BREADCRUMB_URL_PATTERNS.some((p) =>
      p.test((crumb.data as { url: string }).url),
    )
  ) {
    return null;
  }
  return crumb;
}

// --- Adapter ---

export const sentryAdapter: ObservabilityAdapter = {
  init(config: ObservabilityConfig) {
    if (!config.dsn) {
      // Sem DSN, init é no-op (SDK ainda funciona mas não envia eventos).
      return;
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      dist: config.updateId ?? 'native',
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
      // reactNativeTracingIntegration is added automatically by the SDK
      // when tracesSampleRate > 0 (see @sentry/react-native default integrations).
    });

    Sentry.setTag('app_variant', config.appVariant);
    Sentry.setTag('locale', config.locale);
    Sentry.setTag('runtime_version', config.runtimeVersion);
    if (config.updateId) Sentry.setTag('update_id', config.updateId);
  },

  setUser(user: ObservabilityUser) {
    Sentry.setUser(user ? { id: user.id } : null);
  },

  captureException(err: unknown, ctx?: CaptureContext) {
    Sentry.withScope((scope) => {
      if (ctx?.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      }
      if (ctx?.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      Sentry.captureException(err);
    });
  },

  captureMessage(msg: string, ctx?: CaptureMessageContext) {
    Sentry.withScope((scope) => {
      if (ctx?.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      }
      if (ctx?.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      Sentry.captureMessage(msg, ctx?.level ?? 'info');
    });
  },

  addBreadcrumb(crumb: Breadcrumb) {
    Sentry.addBreadcrumb({
      category: crumb.category,
      message: crumb.message,
      data: crumb.data,
      level: crumb.level ?? 'info',
    });
  },

  setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  },

  startSpan<T>(name: string, op: string, fn: () => Promise<T> | T): Promise<T> | T {
    return Sentry.startSpan({ name, op }, fn);
  },
};
```

> A função `isExpectedError` é exportada para que possa ser inspecionada manualmente no REPL/dev se necessário (e dá uma extensibilidade futura sem precisar de framework de testes agora).

- [ ] **Step 8.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 8.3: Smoke test manual dos filtros (opcional)**

Em algum ponto temporário (ex: REPL ou um console.log no `_layout.tsx` em dev), verifique:

```ts
import { isExpectedError } from '@/lib/observability/adapters/sentry';
console.log(isExpectedError('Network request failed when calling /api')); // true
console.log(isExpectedError('Random error')); // false
```

Remover o teste após verificar.

- [ ] **Step 8.4: Pause point**

---

## Task 9: Criar `index.ts` (API pública)

**Files:**
- Create: `src/lib/observability/index.ts`

- [ ] **Step 9.1: Escrever o arquivo**

```ts
// src/lib/observability/index.ts
import { consoleAdapter } from './adapters/console';
import { sentryAdapter } from './adapters/sentry';

const adapter = __DEV__ ? consoleAdapter : sentryAdapter;

export const observability = adapter;

export { ObservabilityProvider } from './provider';
export { ObservabilityErrorBoundary } from './error-boundary';
export { captureWorkoutError, trackWorkoutAction } from './workout-helpers';
export type {
  Breadcrumb,
  BreadcrumbCategory,
  BreadcrumbLevel,
  CaptureContext,
  CaptureMessageContext,
  ObservabilityAdapter,
  ObservabilityConfig,
  ObservabilityUser,
} from './types';
```

> Nota: este arquivo importa `provider`, `error-boundary` e `workout-helpers` que ainda não existem (Tasks 12, 13, 14). TypeScript vai apontar erro até essas tasks completarem. Isso é esperado e ok — quem executar este plano deve seguir as tasks em ordem ou aceitar erros temporários.

- [ ] **Step 9.2: Pause point**

---

## Task 10: Adicionar i18n keys (`errors.unexpected`)

**Files:**
- Modify: `src/internacionalization/locales/pt.ts`
- Modify: `src/internacionalization/locales/en.ts`

- [ ] **Step 10.1: Adicionar chaves em pt.ts**

Localizar dentro de `translation: { ... }`, adicionar **antes** da chave `tabs:` (mantendo formatação alinhada com o resto):

```ts
errors: {
  unexpected: {
    title: 'Algo deu errado',
    message: 'Encontramos um erro inesperado. Você pode tentar novamente.',
    retry: 'Tentar novamente',
  },
},
```

O arquivo final fica como:

```ts
const pt = {
  translation: {
    signInScreen: {
      // ...existing
    },
    errors: {
      unexpected: {
        title: 'Algo deu errado',
        message: 'Encontramos um erro inesperado. Você pode tentar novamente.',
        retry: 'Tentar novamente',
      },
    },
    tabs: {
      // ...existing
    },
    common: {
      // ...existing
    },
    profileScreen: {
      // ...existing
    },
  },
};
```

- [ ] **Step 10.2: Adicionar chaves em en.ts**

Mesma posição. Conteúdo:

```ts
errors: {
  unexpected: {
    title: 'Something went wrong',
    message: 'We hit an unexpected error. You can try again.',
    retry: 'Try again',
  },
},
```

- [ ] **Step 10.3: Verificar tipagem**

```bash
npx tsc --noEmit
```

Esperado: sem erros (o tipo das traduções é estrutural; novas chaves não quebram nada).

- [ ] **Step 10.4: Pause point**

---

## Task 11: Criar `fallback-error-screen.tsx`

**Files:**
- Create: `src/lib/observability/fallback-error-screen.tsx`

- [ ] **Step 11.1: Escrever o componente**

```tsx
// src/lib/observability/fallback-error-screen.tsx
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export type FallbackErrorScreenProps = {
  onRetry: () => void;
};

export function FallbackErrorScreen({ onRetry }: FallbackErrorScreenProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-4 p-6">
      <Text variant="h2" className="text-center">
        {t('errors.unexpected.title')}
      </Text>
      <Text className="text-center text-muted-foreground">
        {t('errors.unexpected.message')}
      </Text>
      <Button onPress={onRetry} variant="default">
        <Text>{t('errors.unexpected.retry')}</Text>
      </Button>
    </View>
  );
}
```

> Sem dependência de navegação (router) — o boundary pode ser disparado por um erro no próprio router, então `useRouter` é arriscado.

- [ ] **Step 11.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

- [ ] **Step 11.3: Pause point**

---

## Task 12: Criar `error-boundary.tsx`

**Files:**
- Create: `src/lib/observability/error-boundary.tsx`

- [ ] **Step 12.1: Escrever o componente**

```tsx
// src/lib/observability/error-boundary.tsx
import { Component, type ErrorInfo, Fragment, type ReactNode } from 'react';
import { observability } from './index';
import { FallbackErrorScreen } from './fallback-error-screen';

type Props = { children: ReactNode };
type State = { hasError: boolean; resetKey: number };

export class ObservabilityErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    observability.captureException(error, {
      tags: { source: 'react_error_boundary' },
      extra: { componentStack: info.componentStack ?? '<no stack>' },
    });
  }

  reset = () => {
    // Incrementa resetKey para forçar remount dos children — limpa
    // qualquer state interno que estivesse causando o erro.
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return <FallbackErrorScreen onRetry={this.reset} />;
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
```

> Sem `key`, o reset volta `hasError` para `false` mas mantém os children montados — qualquer state interno que causou o erro persiste e ele re-dispara em loop. Trocar a `key` força React a desmontar e remontar a árvore, dando "fresh start".

- [ ] **Step 12.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

- [ ] **Step 12.3: Pause point**

---

## Task 13: Criar `provider.tsx`

**Files:**
- Create: `src/lib/observability/provider.tsx`

- [ ] **Step 13.1: Escrever o componente**

```tsx
// src/lib/observability/provider.tsx
import { type ReactNode, useEffect } from 'react';
import i18n from '@/internacionalization/i18n';
import { supabase } from '@/lib/supabase';
import { resolveConfig } from './config';
import { observability } from './index';

export function ObservabilityProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    observability.init(resolveConfig());

    // Bind ao auth do Supabase
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      observability.setUser(session?.user ? { id: session.user.id } : null);
    });

    supabase.auth.getSession().then(({ data }) => {
      observability.setUser(
        data.session?.user ? { id: data.session.user.id } : null,
      );
    });

    // Tag locale acompanha mudanças de idioma em runtime
    const onLanguageChange = (lang: string) =>
      observability.setTag('locale', lang);
    i18n.on('languageChanged', onLanguageChange);

    return () => {
      sub.subscription.unsubscribe();
      i18n.off('languageChanged', onLanguageChange);
    };
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 13.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

- [ ] **Step 13.3: Pause point**

---

## Task 14: Criar `workout-helpers.ts`

**Files:**
- Create: `src/lib/observability/workout-helpers.ts`

- [ ] **Step 14.1: Escrever o arquivo**

```ts
// src/lib/observability/workout-helpers.ts
import { observability } from './index';

export type WorkoutErrorContext = {
  workoutId?: string;
  exerciseId?: string;
  /** Ação que causou o erro: 'save_set', 'start_workout', 'sync', etc. */
  action: string;
};

export function captureWorkoutError(err: unknown, ctx: WorkoutErrorContext) {
  observability.captureException(err, {
    tags: { feature: 'workout', action: ctx.action },
    extra: {
      workoutId: ctx.workoutId,
      exerciseId: ctx.exerciseId,
    },
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

- [ ] **Step 14.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Esperado: agora **todos** os erros temporários da Task 9 estão resolvidos. Sem erros.

- [ ] **Step 14.3: Pause point**

---

## Task 15: Integrar no `_layout.tsx`

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 15.1: Adicionar imports**

No topo do arquivo, adicionar a linha abaixo junto aos outros imports — a ordem exata é irrelevante porque o passo 15.5 roda `bun run check` e o biome reorganiza tudo:

```tsx
import {
  ObservabilityErrorBoundary,
  ObservabilityProvider,
} from '@/lib/observability';
```

- [ ] **Step 15.2: Envolver o JSX retornado**

Localizar o JSX que começa com `<GestureHandlerRootView style={{ flex: 1 }}>` e termina com `</GestureHandlerRootView>`. Envolver com `<ObservabilityErrorBoundary>` (mais externo) e `<ObservabilityProvider>` (logo dentro):

```tsx
return (
  <ObservabilityErrorBoundary>
    <ObservabilityProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          {/* ...existing inner content... */}
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ObservabilityProvider>
  </ObservabilityErrorBoundary>
);
```

> O Provider precisa estar **dentro** do error boundary para que erros de init (ex: Supabase indisponível ao buscar sessão) sejam capturados pelo boundary. Mas precisa estar **fora** dos providers que dependem de auth (não há nenhum aqui), o que é o caso.

- [ ] **Step 15.3: Verificar tipagem**

```bash
npx tsc --noEmit
```

- [ ] **Step 15.4: Format/lint**

```bash
bun run check
```

Esperado: biome reorganiza imports e não reporta erros. Se reportar, corrigir manualmente conforme a saída.

- [ ] **Step 15.5: Smoke test em dev**

Rodar:
```bash
bun run start
```

Apertar `i` para iOS simulator. Verificar no terminal logs estruturados do console adapter:

```
[obs] init env=preview variant=development locale=pt-BR runtime=...
[obs] setUser <anonymous>     # se não logado
[obs] setUser id=<uuid>        # depois que logar
```

Esperado: aparecem essas linhas no Metro logs. Sem crash do app.

- [ ] **Step 15.6: Pause point**

---

## Task 16: Adicionar tela de teste em `debug/`

**Files:**
- Create: `src/app/debug/sentry-test.tsx`

- [ ] **Step 16.1: Escrever a tela**

> Importante: erros lançados dentro de event handlers (`onPress`) **não** são capturados por React Error Boundaries. Para testar o boundary, precisamos disparar um erro durante o render. Esta tela tem testes separados para os dois caminhos:
> - **Captura direta** (`observability.captureException`): testa o adapter sem passar pelo boundary.
> - **Render error** (via state): testa o boundary + adapter ao mesmo tempo.

```tsx
// src/app/debug/sentry-test.tsx
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  captureWorkoutError,
  observability,
  trackWorkoutAction,
} from '@/lib/observability';

function CrashOnRender({ enabled }: { enabled: boolean }) {
  if (enabled) {
    throw new Error('Test render error from Sentry test screen');
  }
  return null;
}

export default function SentryTestRoute() {
  const variant = Constants.expoConfig?.extra?.appVariant as string;
  const [crashOnRender, setCrashOnRender] = useState(false);

  useEffect(() => {
    if (variant === 'production') {
      router.replace('/');
    }
  }, [variant]);

  if (variant === 'production') return null;

  return (
    <View className="flex-1 items-center justify-center gap-4 p-6">
      <CrashOnRender enabled={crashOnRender} />

      <Text variant="h2">Sentry test</Text>
      <Text className="text-muted-foreground">
        Use os botões para validar a integração de observability.
      </Text>

      <Button
        onPress={() => {
          trackWorkoutAction('debug_breadcrumb', { source: 'sentry-test' });
          observability.captureMessage('Test message from debug screen', {
            level: 'info',
            tags: { feature: 'debug' },
          });
        }}
      >
        <Text>Send test message</Text>
      </Button>

      <Button
        onPress={() => {
          trackWorkoutAction('about_to_capture', { source: 'sentry-test' });
          observability.captureException(
            new Error('Test JS error (direct capture) from Sentry test screen'),
            { tags: { feature: 'debug', path: 'direct-capture' } },
          );
        }}
      >
        <Text>Capture exception (direct)</Text>
      </Button>

      <Button
        variant="destructive"
        onPress={() => {
          trackWorkoutAction('about_to_render_crash', { source: 'sentry-test' });
          setCrashOnRender(true);
        }}
      >
        <Text>Trigger render error (via boundary)</Text>
      </Button>

      <Button
        variant="outline"
        onPress={() => {
          captureWorkoutError(new Error('Manual workout error'), {
            workoutId: 'debug-workout',
            exerciseId: 'debug-exercise',
            action: 'save_set',
          });
        }}
      >
        <Text>captureWorkoutError</Text>
      </Button>
    </View>
  );
}
```

- [ ] **Step 16.2: Verificar tipagem**

```bash
npx tsc --noEmit
```

- [ ] **Step 16.3: Smoke test em dev**

Com `bun run start` rodando, navegar (no app rodando) para `/debug/sentry-test` digitando a URL no dev menu (ou via `router.push('/debug/sentry-test')` em alguma tela existente — opcional).

Apertar **Send test message** → observar Metro logs:
```
[obs] addBreadcrumb category=workout message="debug_breadcrumb"
[obs] captureMessage [info] feature=debug Test message from debug screen
```

Apertar **Capture exception (direct)** → observar logs:
```
[obs] addBreadcrumb category=workout message="about_to_capture"
[obs] captureException feature=debug path=direct-capture
       Error: Test JS error (direct capture) from Sentry test screen
```
A tela **não** muda — captura direta não vai pelo boundary.

Apertar **Trigger render error (via boundary)** → app mostra a `FallbackErrorScreen` (com texto traduzido) e logs:
```
[obs] addBreadcrumb category=workout message="about_to_render_crash"
[obs] captureException source=react_error_boundary
       extra: { componentStack: ... }
       Error: Test render error from Sentry test screen
```

Apertar **Try again** na fallback screen → volta para a tela anterior (ou re-renderiza com `crashOnRender = false` graças ao `reset()`).

- [ ] **Step 16.4: Pause point**

---

## Task 17: Atualizar scripts npm para upload de source maps em OTAs

**Files:**
- Modify: `package.json`

- [ ] **Step 17.1: Confirmar nome do bin de upload de source maps**

A versão de `@sentry/react-native` instalada na Task 2 expõe um bin para upload de source maps de OTAs. O nome típico (a partir de v6) é `sentry-expo-upload-sourcemaps`. Confirmar:

```bash
ls node_modules/.bin/ | grep -i sentry
```

Anote o nome exato. Se for diferente (ex: `sentry-cli`), ajuste o comando do passo 17.2 — a doc do `@sentry/react-native` em https://docs.sentry.io/platforms/react-native/manual-setup/expo/ tem o comando atualizado.

- [ ] **Step 17.2: Atualizar scripts `update:preview` e `update:prod`**

Localizar:

```json
"update:dev": "eas update --branch development --auto",
"update:preview": "eas update --branch preview --auto",
"update:prod": "eas update --branch production --auto",
```

Substituir `update:preview` e `update:prod` por (usando o nome do bin confirmado em 17.1):

```json
"update:dev": "eas update --branch development --auto",
"update:preview": "eas update --branch preview --auto && npx sentry-expo-upload-sourcemaps",
"update:prod": "eas update --branch production --auto && npx sentry-expo-upload-sourcemaps",
```

> `update:dev` fica **sem** upload de source maps porque o adapter dev não envia eventos para o Sentry.

- [ ] **Step 17.3: Validar shape do package.json**

```bash
node -e "console.log(require('./package.json').scripts['update:preview'])"
```

Esperado: imprime a string com `&& npx sentry-expo-upload-sourcemaps` no fim.

- [ ] **Step 17.4: Pause point**

---

## Task 18: Verificação end-to-end (build preview)

> Esta task é **manual** — exige builds reais e console do Sentry.

**Files:** nenhum.

- [ ] **Step 18.1: Build preview iOS local**

```bash
bun run build:preview:ios
```

Esperado: build completa em `builds/preview-ios-simulator.tar.gz`. Sem erros do plugin Sentry. No log você deve ver upload de source maps acontecendo no fim do build (mensagens de `> Bundling` seguidas de `> Uploading source maps`).

- [ ] **Step 18.2: Instalar build no simulador**

Extrair e instalar no simulador booted:

```bash
mkdir -p /tmp/wt-preview && tar -xzf builds/preview-ios-simulator.tar.gz -C /tmp/wt-preview
xcrun simctl install booted /tmp/wt-preview/*.app
xcrun simctl launch booted br.com.osadainc.workouttracker.preview
```

- [ ] **Step 18.3: Logar no app**

Logar com uma conta de teste do Supabase. Anotar o user_id (UUID) — virá pelo logs ou direto do Supabase.

- [ ] **Step 18.4: Disparar erro de teste**

Navegar para `/debug/sentry-test`. Apertar **Trigger JS error (sync)**.

- [ ] **Step 18.5: Validar evento no Sentry**

Em sentry.io → projeto → Issues. Verificar:

- [ ] Erro `Test JS error from Sentry test screen` aparece em até 30s
- [ ] **Stack trace deobfuscado** (mostra `sentry-test.tsx`, não bundle minificado)
- [ ] Tag `app_variant=preview`
- [ ] Tag `locale` (pt ou en)
- [ ] Tag `runtime_version` presente
- [ ] Tag `update_id` (se OTA aplicada — pode estar ausente em build nativo recém-instalado)
- [ ] Sob "User", ID do usuário logado (UUID que você anotou no passo 18.3)
- [ ] Em "Breadcrumbs", entrada `workout: about_to_throw` antes do erro
- [ ] Em "Tags", `source=react_error_boundary`

- [ ] **Step 18.6: Validar filtro de erros esperados**

Em `src/app/debug/sentry-test.tsx`, adicionar **temporariamente** um quarto botão:

```tsx
<Button
  variant="outline"
  onPress={() => {
    observability.captureException(new Error('Network request failed'), {
      tags: { feature: 'debug' },
    });
  }}
>
  <Text>Test filter (should NOT appear in Sentry)</Text>
</Button>
```

Rebuild + reinstalar. Apertar o botão.

Esperado: este erro **não** aparece no Sentry (foi filtrado por `EXPECTED_ERROR_PATTERNS`).

Após validar, **remover** o botão temporário.

- [ ] **Step 18.7: Validar logout**

No app, fazer logout. Voltar para `/debug/sentry-test`. Disparar o erro JS novamente.

Esperado: novo evento no Sentry **sem `user.id`** (campo User ausente ou nulo).

- [ ] **Step 18.8: Validar adapter dev**

Rodar `bun run start`. Apertar `i`. Disparar qualquer erro do `sentry-test`. 

Esperado:
- Logs `[obs] ...` aparecem no Metro
- Em sentry.io → **nenhum** novo evento aparece (porque dev usa console adapter)

- [ ] **Step 18.9: Critérios de aceite (recap)**

Conferir contra a lista do spec (`docs/superpowers/specs/2026-05-07-sentry-observability-design.md` § "Critérios de aceite"):

- [ ] Nenhum arquivo fora de `src/lib/observability/adapters/sentry.ts` importa `@sentry/react-native`
  ```bash
  grep -rn "@sentry/react-native" src/ --include="*.ts" --include="*.tsx"
  ```
  Esperado: **apenas** `src/lib/observability/adapters/sentry.ts`.
- [ ] Build preview captura erro JS proposital com stack trace deobfuscado (validado em 18.5)
- [ ] `user.id` aparece em eventos quando logado, some após logout (18.5 + 18.7)
- [ ] Tags `app_variant`, `locale`, `runtime_version` e `update_id` (quando aplicável) presentes (18.5)
- [ ] Erros em `EXPECTED_ERROR_PATTERNS` não chegam ao Sentry (18.6)
- [ ] Em `__DEV__`, nenhum evento ao Sentry; logs estruturados no console (18.8)
- [ ] EAS Update dispara upload de source maps automaticamente (validar rodando `bun run update:preview` após uma mudança e ver upload no log)

- [ ] **Step 18.10: Native crash (opcional)**

Se quiser validar crashes nativos: deixar o app rodando em foreground, rodar
```bash
xcrun simctl spawn booted launchctl reboot
```
ou usar a opção "Force quit" do simulador. Não é elegante, mas valida o pipeline nativo.

Para uma validação mais limpa, é possível adicionar **temporariamente** ao `sentry-test.tsx`:

```tsx
import * as Sentry from '@sentry/react-native'; // ⚠ TEMP — remover após teste

<Button onPress={() => Sentry.nativeCrash()}>
  <Text>Trigger native crash</Text>
</Button>
```

Após validar, **remover** o import e o botão (não comprometer a regra de isolamento).

- [ ] **Step 18.11: Pause point — fim**

Tudo validado. O usuário decide quando commitar. Sugestão de mensagens (apenas se você for commitar manualmente):

- `feat(observability): add Sentry adapter facade and provider`
- `feat(observability): integrate Sentry on _layout and EAS scripts`
- `chore(observability): add debug screen for Sentry validation`

---

## Resumo dos pontos de instrumentação previstos (não cobertos por este plano)

> Estes **não** estão neste plano — são candidatos para um plano posterior, depois que o plumbing estiver validado.

- `start_workout`, `complete_workout`, `cancel_workout` (em telas/handlers de workout)
- `save_set`, `delete_set` (em handlers de set)
- `sync_workout` (sync com Supabase)

A forma de instrumentar segue o padrão:

```ts
try {
  await saveSet(setData);
  trackWorkoutAction('save_set', { workoutId, setNumber });
} catch (err) {
  captureWorkoutError(err, { workoutId, exerciseId, action: 'save_set' });
  throw err;
}
```

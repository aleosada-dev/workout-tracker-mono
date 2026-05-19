# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development checklist

Before declaring any feature, fix or refactor done, walk through these four lenses. They are not optional ceremony — each one has caught real bugs in this repo before.

1. **Observability** — Does this code path need telemetry? Errors that reach the user should go through `captureWorkoutError`; meaningful user actions through `trackWorkoutAction` (or `observability.*` for ad-hoc cases). Never `console.error` user-visible failures and never import `@sentry/react-native` directly from features. See the Observability section.
2. **Karpathy guidelines** (skill `andrej-karpathy-skills:karpathy-guidelines`):
   - **Think before coding** — surface assumptions and tradeoffs; if multiple interpretations exist, ask instead of picking silently.
   - **Simplicity first** — minimum code that solves the problem; no speculative abstractions, no error handling for impossible cases.
   - **Surgical changes** — every changed line must trace to the request; don't "improve" adjacent code, match existing style.
   - **Goal-driven execution** — define a verifiable success criterion (a failing test, a manual check) before writing code, and loop until it passes.
3. **Unit tests (Jest)** — Add or update `*.test.tsx` next to the source file for new logic, regressions, and component contracts. Run `bun run test -- <pattern>` while iterating.
4. **E2E tests (Maestro)** — When the change touches a user-visible flow (auth, navigation, forms, deep links), add or extend a flow under `.maestro/flows/`. Each flow must start by including `subflows/launch-fresh.yaml` so the auth state is reset between runs.

## Stack

Expo SDK 55 / React Native 0.83 app using expo-router (file-based routing under `src/app/`), NativeWind v4 + Tailwind, `@legendapp/state` with MMKV persistence, Supabase auth, react-i18next (en/pt, fallback pt), Sentry, Biome (lint+format). Package manager: **bun**. Path alias: `@/*` → `./src/*`.

## App variants

`APP_VARIANT` (development | preview | production) is read by `app.config.ts` and switches **app name, bundle ID, and URL scheme** at config-resolution time. Three independent installs can coexist on a device. When debugging deep links or store metadata, the variant matters — confirm which one is running.

| Variant | Bundle ID | Scheme |
|---|---|---|
| development | `br.com.osadainc.workouttracker.dev` | `workouttrackerappdev` |
| preview | `br.com.osadainc.workouttracker.preview` | `workouttrackerapppreview` |
| production | `br.com.osadainc.workouttracker` | `workouttrackerapp` |

Prebuild scripts (`prebuild:dev` / `prebuild:preview` / `prebuild:prod`) regenerate `ios/` and `android/` for a given variant.

## Routing & auth

`src/app/_layout.tsx` is the root layout. It uses `Stack.Protected` with `isAuthenticated` from `useSession()` (`src/features/auth/hooks/useSession.ts`) to gate `(tabs)` vs `(auth)/signIn`. Supabase session state drives `isAuthenticated` and is observed via `supabase.auth.onAuthStateChange`.

Tabs live under `src/app/(tabs)/` with three groups: `(workouts)`, `(reports)`, `(profile)`.

## Supabase / secure storage

`src/features/shared/lib/supabase.ts` wires Supabase to an **encrypted MMKV** instance (`supabase-auth`). The encryption key is generated lazily on first launch via `expo-crypto`, stored in `expo-secure-store` under `WT_MMKV_KEY`, and then reused for the lifetime of the install — it is never rotated.

For a normal **logout**, `supabase.auth.signOut()` is enough: it invalidates the server-side session and removes the auth keys via the MMKV storage adapter.

`src/features/shared/lib/debug-reset.ts` (`debugResetAuth`) does something stronger — it simulates a **fresh install** for E2E flows: signs out, then `authStorage.clearAll()` (wipes the entire MMKV instance, not only Supabase-managed keys), then deletes `WT_MMKV_KEY` from SecureStore so the next launch generates a brand new encryption key. Don't copy this pattern into a regular logout; it's intentionally destructive for Maestro.

Required env vars (`.env`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Missing values throw at module load.

## State & bridges

User settings (`themeMode$`, `language$`) live in `src/features/settings/state/settings-store.ts` as `@legendapp/state` observables persisted to MMKV (`app-storage`). Two bridge components in `_layout.tsx` — `ThemeBridge` and `LanguageBridge` — subscribe to these observables and push changes into NativeWind's `useColorScheme` and i18next respectively. **Don't call `setColorScheme` or `i18n.changeLanguage` directly from features**; mutate the observables and let the bridges fan out.

## Observability

`src/features/observability/lib/index.ts` selects the adapter at module load: `consoleAdapter` when `__DEV__`, otherwise `sentryAdapter`. New telemetry should go through `observability.*` or the `captureWorkoutError` / `trackWorkoutAction` helpers — never call `@sentry/react-native` directly from features. `ObservabilityProvider` in the root layout wires the Supabase user ID and current locale onto the adapter.

Source maps are uploaded to Sentry via `npx sentry-expo-upload-sourcemaps` after `eas update:preview` / `update:prod`.

## API client

`src/features/api/lib/index.ts` exposes `apiClient` (typed `get/post/put/patch/delete`) and the error classes (`ApiError`, `ApiUnauthorizedError`, `ApiNetworkError`). All HTTP calls to the workout-tracker backend MUST go through `apiClient`. Never call `fetch` directly from features and never re-implement the auth header or base URL.

The base URL comes from `EXPO_PUBLIC_API_URL` in `.env`, validated at module load. Auth is automatic: the client reads the current Supabase access token and adds `Authorization: Bearer <token>`. For the rare public endpoint, pass `{ authenticated: false }`.

Errors are thrown, never logged inside the client. Features decide whether to surface them; the `QueryClient` in `src/features/query/lib/client.ts` reacts to `ApiUnauthorizedError` globally via `QueryCache`/`MutationCache` listeners and triggers `supabase.auth.signOut()`. Other errors propagate to the calling hook.

Required env var: `EXPO_PUBLIC_API_URL`. Missing values throw at module load (same pattern as Supabase).

## i18n

Translations live in `src/internationalization/locales/{en,pt}.ts`. `language$` of `'system'` resolves through `resolveLanguage` in `language-bridge.tsx`. Default UI copy is **Portuguese**.

## Styling

NativeWind v4 + Tailwind, configured in `tailwind.config.js` and `src/global.css`. UI primitives in `src/components/ui/` follow shadcn conventions (`components.json` is configured for the New York style; aliases match the `@/*` paths). Biome's `useSortedClasses` rule enforces class ordering inside `clsx`, `cva`, `cn`, `tw`, `twMerge`.

## Design context

Strategic design context lives in `PRODUCT.md` at the repo root (register, users, brand personality, anti-references, design principles, a11y). Read it before non-trivial UI work, or when the `/impeccable` skill is invoked. Visual system (tokens, components, typography) will live in `DESIGN.md` once generated via `/impeccable document`.

Core principles, distilled: progressive disclosure (iniciante ao avançado); cor codifica significado nunca decora (daltonismo é first-class); tipografia carrega o "premium" (não gradient/glow); voz adulta e técnica (zero clichês motivacionais); cada tela serve UM contexto principal (execução tátil vs. histórico denso vs. planejamento navegável).

## Tests

Unit tests use `jest-expo` + `@testing-library/react-native`. Test files live next to source as `*.test.tsx`. The `transformIgnorePatterns` in `package.json` allow-lists Expo and a curated set of RN libraries — adding a new ESM-only RN dependency may require extending it.

E2E uses Maestro (`.maestro/`). Each flow starts with `subflows/launch-fresh.yaml`, which deep-links to `<scheme>://debug/reset` (handled in `src/app/_layout.tsx` → `debugResetAuth`) to fully reset auth between flows. Maestro CLI does **not** support `--env-file`; load env with `set -a && . .maestro/.env && set +a` before invoking `maestro` (the `test:e2e` script already does this). See `.maestro/README.md` for the dedicated test-account setup.

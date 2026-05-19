# NativeWind v4 + Expo SDK 55 — guia de configuração e fix do Metro

Documenta dois problemas encontrados ao configurar NativeWind v4 num projeto Expo SDK 55 (Metro 0.83.x / RN 0.83.x) e a solução aplicada para cada um. Reutilizável em projetos futuros com a mesma stack.

**Stack alvo deste guia:**
- `expo` ~55.x
- `react-native` 0.83.x
- `metro` 0.83.x (vem com o Expo SDK)
- `nativewind` 4.2.x
- `react-native-css-interop` 0.2.3 (peer do nativewind)
- `tailwindcss` 3.4.x
- `bun` como package manager

---

## Problema 1: classes Tailwind não aplicam estilo nenhum

### Sintoma
`className="bg-red-500"` não pinta nada. Nenhum utility class funciona — como se o Tailwind não existisse.

### Causa
Três erros de configuração comuns em projetos Expo com estrutura `src/`:

1. **`metro.config.js`** apontando para um `global.css` que não existe na raiz.
2. **`tailwind.config.js`** com `content` apontando para diretórios errados (template default usa `./App.tsx` e `./components/**`, mas projetos com Expo Router moderno usam `./src/**`).
3. **`babel.config.js`** com o preset legado `nativewind/babel` (do v2), que não é mais necessário no v4 com `babel-preset-expo`.

### Solução

**`metro.config.js`** — input deve apontar para o CSS real:
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./src/global.css" });
```

**`tailwind.config.js`** — content deve cobrir onde estão os arquivos com `className`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
```

**`babel.config.js`** — apenas `babel-preset-expo` com `jsxImportSource`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
  };
};
```

**`src/global.css`** — diretivas Tailwind v3:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`src/app/_layout.tsx`** — importar o CSS na raiz do layout:
```tsx
import "../global.css";
```

**`nativewind-env.d.ts`** (na raiz) — tipos do `className`:
```ts
/// <reference types="nativewind/types" />
```

E referenciá-lo no `tsconfig.json`:
```json
{
  "include": ["**/*.ts", "**/*.tsx", "nativewind-env.d.ts"]
}
```

### Após aplicar
Limpar cache do Metro/Babel ao reiniciar:
```bash
bun expo start --clear
```

---

## Problema 2: Metro crasha ao salvar arquivo

### Sintoma
Após salvar qualquer arquivo `.tsx` em dev, o processo do Metro morre com:

```
TypeError: Cannot read properties of undefined (reading 'addedFiles')
    at DependencyGraph._onHasteChange (metro/src/node-haste/DependencyGraph.js:99:18)
    at FileMap.<anonymous>          (metro/src/node-haste/DependencyGraph.js:68:14)
    at Object.onChange              (react-native-css-interop/src/metro/index.ts:344:15)
    at ChildProcess.<anonymous>     (nativewind/src/metro/tailwind/v3/index.ts:70:23)
```

### Causa
Incompatibilidade de formato de evento entre `react-native-css-interop@0.2.3` e o Metro do Expo SDK 55.

`react-native-css-interop` ainda emite o evento `change` no formato **antigo** do Metro:
```js
haste.emit("change", { eventsQueue: [{ filePath, metadata, type: "change" }] });
```

Mas Metro 0.83.x espera o formato **novo**:
```js
_onHasteChange({ changes, rootDir }) {
  ...changes.addedFiles,      // crash: changes é undefined
  ...changes.modifiedFiles,
  ...changes.removedFiles,
}
```

Resultado: toda vez que o Tailwind CLI (em watch dentro do nativewind) recompila o CSS após uma mudança, ele dispara o `onChange` que tenta notificar o Metro com o payload errado, e o processo morre inteiro.

Não há fix upstream em stable nas versões mais recentes (`react-native-css-interop@0.2.3`, `nativewind@4.2.3`).

### Solução: patch local com `bun patch`

**1. Preparar o patch:**
```bash
bun patch react-native-css-interop@0.2.3
```

**2. Editar `node_modules/react-native-css-interop/dist/metro/index.js`** (em torno da linha 179, dentro de `startCSSProcessor`).

Trocar:
```js
haste.emit("change", {
    eventsQueue: [
        {
            filePath,
            metadata: {
                modifiedTime: Date.now(),
                size: 1,
                type: "virtual",
            },
            type: "change",
        },
    ],
});
```

Por:
```js
haste.emit("change", {
    changes: {
        addedDirectories: [],
        removedDirectories: [],
        addedFiles: [],
        modifiedFiles: [[filePath, { isSymlink: false, modifiedTime: Date.now() }]],
        removedFiles: [],
    },
    logger: null,
    rootDir: "",
});
```

**Por que `rootDir: ""`:** Metro faz `path.join(rootDir, canonicalPath)` no handler. Como `filePath` aqui é absoluto, `path.join("", "/abs/path") === "/abs/path"` — o caminho se mantém íntegro.

**3. Salvar o patch:**
```bash
bun patch --commit 'node_modules/react-native-css-interop'
```

Isso gera `patches/react-native-css-interop@0.2.3.patch` e atualiza o `bun.lock`. Commitar **ambos** no git para o fix sobreviver a `bun install` em outros checkouts.

### Equivalente para outros gerenciadores

- **npm/yarn/pnpm:** usar [`patch-package`](https://github.com/ds300/patch-package) com a mesma edição. O patch gerado fica em `patches/` igualmente.

### Verificação
1. `bun expo start --clear`
2. Salvar várias mudanças seguidas em arquivos `.tsx` (5–10 saves rápidos).
3. Esperado: Tailwind recompila, app atualiza, Metro **não** crasha.

---

## Patch completo (para referência)

```diff
--- a/dist/metro/index.js
+++ b/dist/metro/index.js
@@ -177,17 +177,15 @@ async function startCSSProcessor(filePath, platform, isDev, { input, getCSSForPl
                 : getNativeJS((0, css_to_rn_1.cssToReactNativeRuntime)(css, options), debug)));
             debug(`virtualStyles.emit ${platform}`);
             haste.emit("change", {
-                eventsQueue: [
-                    {
-                        filePath,
-                        metadata: {
-                            modifiedTime: Date.now(),
-                            size: 1,
-                            type: "virtual",
-                        },
-                        type: "change",
-                    },
-                ],
+                changes: {
+                    addedDirectories: [],
+                    removedDirectories: [],
+                    addedFiles: [],
+                    modifiedFiles: [[filePath, { isSymlink: false, modifiedTime: Date.now() }]],
+                    removedFiles: [],
+                },
+                logger: null,
+                rootDir: "",
             });
         }).then((css) => {
             debug(`virtualStyles.initial ${platform}`);
```

---

## Quando descontinuar este patch

Remover assim que **uma** das condições for verdadeira:
- `react-native-css-interop` publicar uma versão > 0.2.3 que use o novo formato de evento do Metro.
- Migrar para `nativewind@5.x` (rewrite major; lança a partir das previews `5.0.0-preview.x`).

Para conferir, periodicamente:
```bash
npm view react-native-css-interop version
npm view nativewind versions --json
```

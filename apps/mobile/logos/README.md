# Workout Tracker — Logo Ring

Conceito escolhido: anel de progresso (estilo Apple Activity) com "W" estilizado em halter no centro.

## Arquivos

```
options/
├── ring-dark.svg     # tema dark (neutral-950 bg, emerald-500 anel)
├── ring-light.svg    # tema light (neutral-50 bg, emerald-600 anel)
└── preview/          # PNGs gerados via qlmanage
```

## Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| Emerald 500 | `#10B981` | Anel de progresso (dark) |
| Emerald 600 | `#059669` | Anel de progresso (light) |
| Neutral 950 | `#0A0A0A` | Fundo dark, fill do W (light) |
| Neutral 50 | `#FAFAFA` | Fundo light, fill do W (dark) |
| Neutral 800 | `#262626` | Trilha do anel (dark) |
| Neutral 200 | `#E5E5E5` | Trilha do anel (light) |
| Neutral 400 | `#A3A3A3` | Borda dos círculos (dark) |
| Neutral 600 | `#525252` | Borda dos círculos (light) |

## Geometria

- Canvas: 512×512, raio de canto 112
- Anel: centro (256, 256), raio 150, stroke 36, progresso 75%
- W: 5 vértices conectados por barras (estilo halter)
  - Picos externos: (184, 196) e (328, 196)
  - Pico central: (256, 220) — 24px mais baixo (assimetria nas pernas)
  - Vales: (220, 316) e (292, 316)
  - Círculos r=26, stroke 2.5; barras stroke 22
- Z-order: anel → círculos (com borda) → barras (por cima, interrompendo borda nas conexões)

## Próximos passos

1. Exportar tamanhos finais:
   - `1024×1024` — App Store
   - `512×512` — Play Store / icon principal
   - `192×192` — Android adaptive icon
   - `180×180` — apple-touch-icon
   - `32×32` — favicon
2. Versão monocromática (silhueta) para splash screen / status bar
3. Substituir os arquivos em `/logos/` (icon-512x512.png, apple-touch-icon.png, favicon.ico)

Exportar SVG → PNG:
```bash
# Com rsvg-convert (brew install librsvg)
rsvg-convert -w 1024 -h 1024 ring-dark.svg -o icon-1024.png

# Ou com Inkscape
inkscape ring-dark.svg -w 1024 -h 1024 -o icon-1024.png
```

---
name: Workout Tracker
description: Strength training companion from first set to advanced periodization
colors:
  primary: "#008762"
  primary-dark: "#127053"
  primary-foreground: "#EBFAF3"
  success: "#059669"
  warning: "#D97706"
  warning-dark: "#F59E0B"
  destructive: "#DC2626"
  destructive-dark: "#EF4444"
  background: "#FFFFFF"
  background-dark: "#18181B"
  foreground: "#18181B"
  foreground-dark: "#FAFAFA"
  card: "#FAFAFA"
  card-dark: "#27272A"
  muted: "#E4E4E7"
  muted-dark: "#3F3F46"
  muted-foreground: "#71717A"
  muted-foreground-dark: "#A1A1AA"
  border: "#E4E4E7"
  border-dark: "#3F3F46"
  chart-1: "#7ED3A9"
  chart-2: "#10B981"
  chart-3: "#059669"
  chart-4: "#008762"
  chart-5: "#127053"
typography:
  display:
    fontFamily: "Geist_800ExtraBold"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: "40px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist_600SemiBold"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: "36px"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist_600SemiBold"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist_400Regular"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "Geist_500Medium"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.05em"
rounded:
  sm: "8.4px"
  md: "11.2px"
  lg: "14px"
  xl: "19.6px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "40px"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Workout Tracker

## 1. Overview

**Creative North Star: "The Strength Instrument"**

The interface is a precision instrument in the athlete's hands. A workshop tool, not a coach yelling encouragement. The vocabulary is correct (drop set, RPE, cluster) because the user is treated as someone who knows or is learning seriously. Numbers are protagonists. Typography breathes. Color is reserved and meaningful. The motion is small and purposeful, never decorative.

Density scales with the user: a beginner sees the essentials, a periodizing athlete sees aggregates, charts, and historical depth. Surfaces never compete for attention. The tool disappears into the task during execution, returns into focus during review. Borders carry more visual weight than shadows; the system is flat by inclination, with whisper-soft elevation only where it earns its place.

The system explicitly rejects four neighboring aesthetics: gamified-puerile (Duolingo confetti and badges), fitness-influencer hype (neon gradients, shouted caps, motivational slogans), cold spreadsheet (raw numbers, no hierarchy, backoffice ergonomics), and bodybuilding old-school (red-on-black, hardcore-2000s grit). Living between those four constraints is the strategic line.

**Key Characteristics:**
- Numbers and progression are the protagonists, not chrome or copy.
- Color codes meaning and nothing else; never decoration.
- Typography carries the "premium" feeling, not gradients or glass.
- Components are restrained, confident, and consistent screen to screen.
- Motion is modest, meaningful, and always state-driven.

## 2. Colors: The Athletic Teal Palette

A reserved palette built around a single committed brand hue. Athletic Teal is the only saturated voice; everything else recedes into tinted neutrals and semantic state colors. The palette is intentionally narrow so when color appears, it carries meaning.

### Primary
- **Athletic Teal** (light `#008762`, dark `#127053`): the brand voice. Used for primary CTAs, the focus ring, the selected state of metric chips, primary actions in dialogs. Reserved enough to never become decoration: a screen with ten Athletic Teal accents is broken.

### Secondary (state colors, not chromatic siblings)
- **Achievement Emerald** (`#059669`): success state, including personal-record highlights, completed-set indicators, the primary-muscle badge. Slightly more saturated than Athletic Teal so achievements read as a celebration without shouting.
- **Caution Amber** (light `#D97706`, dark `#F59E0B`): warnings and pending states. Used sparingly; if everything's amber, nothing is.
- **Signal Crimson** (light `#DC2626`, dark `#EF4444`): destructive actions, errors, validation failures. Never used for emphasis or decoration.

### Neutral

Zinc-family neutrals carry every non-semantic surface. The light theme leans warm-white; the dark theme leans forge-black. Both share the same character vocabulary.

- **Pure White** (`#FFFFFF`) / **Anvil Black** (`#18181B`): canvas backgrounds.
- **Brushed Cream** (`#FAFAFA`) / **Cast Iron** (`#27272A`): card surfaces.
- **Quiet Stone** (`#E4E4E7`) / **Tempered Steel** (`#3F3F46`): borders, muted backgrounds, dividers.
- **Steel Mist** (`#71717A`) / **Brushed Steel** (`#A1A1AA`): muted foreground (captions, metadata, secondary labels).
- **Anvil Black** (`#18181B`) / **Frost White** (`#FAFAFA`): primary foreground (body text, titles).

### Chart Palette (data viz)

A single-hue ramp from light mint (`chart-1: #7ED3A9`) to deep teal (`chart-5: #127053`), all family of Athletic Teal. Charts read as variations of the brand voice, not a kaleidoscope. When five distinct categories are needed, the ramp stretches; when two are needed, use chart-2 and chart-4 for clearest contrast.

### Named Rules

**The Achievement Reservation Rule.** Achievement Emerald is reserved for completed-set indicators, personal records, and the primary-muscle badge. Never for selected nav tabs, never for buttons, never for headers. Its rarity is what makes it read as achievement.

**The One Voice Rule.** Athletic Teal carries primary action and current selection only. A screen has at most one zone of Athletic Teal at a time. If two CTAs both want it, one is wrong.

**The Second-Channel Rule.** Color never carries meaning alone. Every state expressed in color also expresses through icon, position, weight, or label. Verify in deuteranopia before shipping any new color decision.

## 3. Typography

**Display Font:** Geist (sans-serif, full weight family from 400 to 800)
**Mono Font:** Geist Mono (for fixed-width numerics, weights 400 to 600)
**Label/Mono Use:** Geist Mono only for fixed-width numerical alignment in dense tables; never for body or labels.

**Character:** Geist is workhorse Swiss-tradition sans: geometric construction, neutral character, readable at any size. It performs all roles in this system; no display/body pairing is needed. The weight family carries hierarchy that other systems would split across two faces.

### Hierarchy

The fixed point scale (12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 px) is the only typographic scale. No fluid clamps. No invented sizes.

- **Display** (ExtraBold 800, 36px, line 40px, tracking -0.02em): hero numbers on summary cards, large key metrics during a workout. Rare.
- **Headline** (SemiBold 600, 30px, line 36px, tracking -0.02em): page-level h2 with bottom border. Section divisions.
- **Title** (SemiBold 600, 24px, line 32px, tracking -0.02em): h3 for screen titles such as the exercise name on the detail screen.
- **Body** (Regular 400, 16px, line 24px): all running text. Comfortable line length applies (65–75ch on web; on mobile, the screen width naturally enforces it).
- **Strong Body** (SemiBold 600, 14px to 16px): emphasized values inside dense rows. Last-session weights, current-set targets.
- **Label** (Medium 500, 10px, line 16px, tracking 0.05em, uppercase): micro-typography for metadata pairs ("PRINCIPAL Glúteos"). The capitalization plus tracking is the signal.
- **Muted Body** (Regular 400, 14px, color muted-foreground): captions, helper text, deemphasized secondary values such as the auxiliary muscle name.

### Named Rules

**The Micro-Caption Rule.** When a metadata pair needs an explicit role label (Principal/Auxiliar, Tipo/Peso, Última-sessão), the role is rendered in the **Label** style and the value in **Strong Body** or **Body**. Never use Body-case for role labels; the case + tracking is what disambiguates "metadata" from "content".

**The Numeric Alignment Rule.** Stacked numerical columns (weight, reps, set count in tables and history rows) right-align and use a single weight per column. Switch to Geist Mono only when numbers must align across rows of variable text content.

**The Tracking-Tight Rule.** All title-class typography (Display, Headline, Title, h4) uses `tracking-tight` (~-0.02em). Body and below run with default tracking. Labels use positive tracking (`0.05em`+). The three regimes are non-negotiable.

## 4. Elevation

The system is flat by inclination. Elevation is whisper-quiet: an almost-imperceptible shadow under cards, buttons, and inputs (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`, the Tailwind `shadow-sm` recipe), combined with hairline borders (`1px` of `border` token) for delineation. Borders do most of the work; shadows confirm that an element sits *slightly* above the canvas, never that it "pops".

Hover states never raise elevation; they shift background tint by 10% opacity. Focus states use a ring (`3px` at 50% opacity of the ring color, which is Athletic Teal). Pressing reduces opacity to 90% on the background, never adds shadow.

There is no concept of a "lifted" surface, a modal that hovers, or a card-within-card. Nested elevation is forbidden.

### Shadow Vocabulary

- **Whisper** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`, applied via Tailwind's `shadow-sm shadow-black/5`): cards, buttons, inputs. The only shadow in production use.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The whisper shadow is so subtle it functions as a tint, not depth. No drop shadows beyond `shadow-sm`. No `shadow-md`/`lg`/`xl` anywhere in the system.

**The Border-Carries-The-Weight Rule.** Where two surfaces meet, a 1px border in the `border` token does the visual job. Never a colored stripe (no `border-left: 3px solid …`), never a gradient seam, never a glow.

**The No-Nested-Cards Rule.** A card containing a card is forbidden. If hierarchy is needed inside a card, use spacing and typography, not nested surfaces.

## 5. Components

Components follow shadcn New York vocabulary: clean borders, restrained shadows, semantic color use, consistent radius scale. The base radius `--radius: 14px` scales the rest of the system (`sm` 8.4px, `md` 11.2px, `lg` 14px, `xl` 19.6px).

### Buttons

- **Shape:** rounded medium (11.2px), height 40px (36px on small breakpoints).
- **Primary** (`Button variant="default"`): Athletic Teal background, foreground in `primary-foreground` (a desaturated mint), `font-sans-medium` 14px. Press shifts background to 90% opacity. The button never grows on hover; it only reveals a soft state shift.
- **Destructive** (`variant="destructive"`): Signal Crimson background, white text. Reserved for irreversible actions.
- **Outline** (`variant="outline"`): transparent background with `border` color, foreground text. On press, fills with `accent`.
- **Ghost** (`variant="ghost"`): no background, no border; press fills with `accent`. Used in toolbars and dense rows where chrome would compete.
- **Link** (`variant="link"`): Athletic Teal text, no background. Press underlines.
- **Sizes:** default (40px), sm (36px), lg (44px), icon (40×40). Tap targets always ≥40px to satisfy the WCAG AA accommodation for touch.

### Cards

- **Corner:** rounded xl (19.6px). Deliberately softer than buttons or inputs to feel like a "page".
- **Background:** Brushed Cream / Cast Iron, against canvas of Pure White / Anvil Black. The card is the page's surface; the canvas is the void.
- **Border:** 1px `border` token, always present.
- **Shadow:** Whisper (`shadow-sm`).
- **Internal Padding:** 24px (`py-6`, `px-6` via slot subcomponents).
- **Composition:** `CardHeader` (gap 1.5) + `CardTitle` (SemiBold, leading-none) + `CardDescription` (muted, 14px) + `CardContent` (24px horizontal padding) + `CardFooter` (row, 24px horizontal padding).

### Inputs

- **Shape:** rounded medium (11.2px), height 40px (36px sm).
- **Background:** canvas color (Pure White / Anvil Black). Subtle whisper shadow under it.
- **Border:** 1px `input` token. On focus, the border shifts to Athletic Teal and a 3px ring at 50% opacity surrounds it. On invalid, the border becomes Signal Crimson with a matching ring.
- **Typography:** body size (16px on native to defeat iOS zoom-on-focus; 14px on web at sm+).
- **Placeholder:** muted-foreground at 50% opacity on native, full muted-foreground on web.
- **Disabled:** opacity 50%, no interaction.

### Badges

- **Shape:** rounded full pill.
- **Padding:** 2px vertical, 8px horizontal.
- **Typography:** Medium 500, 12px (xs).
- **Variants in active use:**
  - **Success** (Achievement Emerald background, white text): completed set, personal record, primary muscle indicator.
  - **Outline** (transparent, foreground text, 1px border): chip state for unselected metrics, auxiliary muscle indicator, neutral tags.
  - **Primary** (Athletic Teal tinted, 10% bg, primary text, 50%-opacity border): emphasis without committing to filled brand color. Used for the selected metric chip on the detail screen.
  - **Default** (filled foreground, foreground-inverted text): rare, neutral high-emphasis.
  - **Secondary** (filled muted-bg, foreground text): low-emphasis chips for neutral tags.
  - **Destructive** (filled Signal Crimson, white text): only for destructive context (warnings inside flows).
- **No icon-in-badge convention by default**: badges carry text. If an icon is needed, it sits adjacent to the badge, not inside it.

### Section Heading

A leading lucide icon (e.g., `LineChart`, `Dumbbell`, `Trophy`) in 14–16px, with `iconClassName` overriding color to convey state (`muted-foreground` for neutral sections, `warning` for the Personal Records section). Followed by a title in Strong Body weight. This is the only place an icon and a section header live side by side; do not use it elsewhere.

### Signature Pattern: The Metadata Pair

A common micro-component for screen-level descriptors: a small uppercase **Label** (10px, tracking 0.05em, muted) horizontally aligned by baseline with a **Strong Body** value (14px, semibold). Multiple pairs sit on the same row with `gap-x-4` and wrap on narrow screens. No fixed-width label column; no card wrapper. This pattern is what lives between the exercise title and the video on the detail screen, and it should be the default for any future "principal X / auxiliar Y" or "data X / valor Y" disclosure.

### Empty States

Title in SemiBold body weight + subtitle in muted body. Centered, padded generously. No illustrations, no decorative ornaments. The empty state explains the system, not "no data".

## 6. Do's and Don'ts

### Do:

- **Do** reserve Athletic Teal for the primary action and current selection on each screen. One zone per screen.
- **Do** treat Achievement Emerald as the *reward* color. Use it on completed sets, personal records, and primary-muscle indicators. Never on buttons or selected tabs.
- **Do** carry a second channel (icon, weight, position, label) whenever color expresses state. Run a deuteranopia simulation before shipping a new color decision.
- **Do** use the **Metadata Pair** signature pattern (uppercase label 10px + semibold value 14px) for any "role + name" disclosure. Never invent a new pattern for that job.
- **Do** keep cards flat: 1px border + whisper shadow. Use 24px internal padding via the slot subcomponents.
- **Do** match Tailwind sizes to the fixed scale (12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48). Do not invent sizes like `text-[13px]` or `text-[22px]` unless you know exactly why.
- **Do** use `font-sans-medium` for buttons and labels, `font-sans-semibold` for titles and emphasized values, `font-sans` for body. Stick to those three lanes.
- **Do** make tap targets ≥40px tall on touchable elements, especially in execution-screen rows where users have sweaty hands and seconds between sets.
- **Do** localize every user-visible string through `react-i18next`. No hard-coded text. Render dates via `date-fns` + locale; render numbers via `Intl.NumberFormat`.

### Don't:

- **Don't** add gamified ornaments. No confetti animations, no streak flames, no achievement-style trophy decorations. PRODUCT.md anti-reference 1 (gamificação pueril) excludes Duolingo-tier celebration in its entirety.
- **Don't** use neon gradients, shouted-caps motivational copy, or hype typography. PRODUCT.md anti-reference 2 (fitness-influencer hype) excludes the entire neon-fitness-IG aesthetic family.
- **Don't** render data tables without typographic hierarchy. Raw zinc-on-white tables with `YYYY-MM-DD` dates and no formatted numbers fail PRODUCT.md anti-reference 3 (planilha fria sem alma).
- **Don't** lean on red+black+grit. No `border-left: 3px solid red` on alert rows, no charcoal-graphite gradients, no "hardcore" iconography. PRODUCT.md anti-reference 4 (bodybuilding old-school agressivo) excludes the entire 2000s muscle-site lineage.
- **Don't** use side-stripe borders (`border-left` / `border-right` greater than 1px as a colored accent). Rewrite with a full border, a background tint, a leading icon, or nothing. This is an absolute ban from the impeccable shared laws.
- **Don't** use gradient text (`background-clip: text` with a gradient fill). Use a solid color and emphasize through weight or size.
- **Don't** use glassmorphism (backdrop blur + translucent surface) as decorative default. Rare and purposeful, or never.
- **Don't** nest cards inside cards. If a card needs internal hierarchy, use spacing and typography.
- **Don't** use em dashes in UI copy. Use commas, colons, periods, or parentheses instead.
- **Don't** invent `text-[13px]`, `text-[15px]`, or other off-scale sizes without an explicit reason. The fixed scale exists.
- **Don't** orchestrate page-load motion sequences. Motion is 150–250 ms and confined to state changes (open/close, hover/press, focus). The user is in flow.
- **Don't** show shadows beyond `shadow-sm`. No `shadow-md`/`lg`/`xl` exists in production. If something looks like it needs more depth, you're missing a border or some spacing.
- **Don't** use Geist Mono for body copy or labels. It is reserved for fixed-width numerical alignment only.
- **Don't** call drop sets "extra sets" or RPE "intensity rating" in UI copy. The vocabulary of training is part of the brand voice.

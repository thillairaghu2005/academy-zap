# Zapsters Design System

The interface defaults to a soft light canvas with blue as the accent. Dark remains available
through the theme toggle, using the same semantic token system and restrained glow language.
Components consume semantic tokens instead of page-level color literals.

## Color Tokens

| Token | Light | Dark |
| --- | --- | --- |
| `background` | `#ffffff` | `#07090c` |
| `surface-1` | `#fafbfc` | `#0b0f15` |
| `surface-2` / `card` | `#ffffff` | `#10151d` |
| `surface-3` | `#f5f7fa` | `#161d27` |
| `foreground` | `#111827` | `#e8ecf2` |
| `muted-foreground` | `#6b7280` | `#8b96a8` |
| `border` | `#e5e7eb` | `#ffffff14` |
| `border-strong` | `#cbd5e1` | `#ffffff26` |
| `primary` | `#2563eb` | `#2f7bff` |
| `primary-hover` | `#3b82f6` | `#5b9dff` |
| `secondary-accent` | `#60a5fa` | `#5b9dff` |
| `primary-deep` | `#1d4ed8` | `#0056d2` |
| `primary-glow` | `#60a5fa` | `#5b9dff` |
| `primary-light` | `#eff6ff` | `#12284d` |
| `ring` | `#2563eb` | `#5b9dff` |

The following values are spec-locked and appear verbatim in both theme definitions: verdict
colors, bronze/silver/gold/platinum/obsidian tier colors, `xp-completion` `#0284c7`,
`xp-mastery` `#7c3aed`, and verified/flagged/reversed/revoked status colors. Additional
`*-on-dark` tokens exist for readable small status text without changing the source literals.

## Typography

- Geist Variable is the display and heading face, with SF Pro Display as the system fallback.
- Inter Variable is the body and interface face.
- The monospace stack is reserved for code, terminals, IDs, and technical values.
- Fluid roles are `text-hero`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-small`, and `text-caption`.

## Motion Scale

| Token | Duration |
| --- | --- |
| `fast` | 160ms |
| `base` | 320ms |
| `slow` | 640ms |
| `cinematic` | 1100ms |

The primary ease-out is `[0.22, 1, 0.36, 1]`; the shared in-out ease is `[0.65, 0, 0.35, 1]`.
Framer surfaces use `useReducedMotion()` and become static, fully legible content when motion is
disabled. Global CSS also disables loops and transitions under `prefers-reduced-motion`.

## Primitives

- `Card`: `default`, `glass`, `glow`, `bento`, and `outline` variants. Glass uses a layered fill, a hairline, a top highlight, and limited backdrop blur.
- `Button`: all existing variants and sizes remain; `sheen` adds a travelling highlight and `glow` adds a blue halo. `ghost` is tuned for dark surfaces.
- `GradientBorder`: one-pixel gradient border wrapper.
- `GlowOrb` and `AuroraBackdrop`: pointer-inert ambient light layers.
- `NoiseOverlay`: reusable `bg-noise` layer.
- `SectionShell`: shared max-width section rhythm with optional eyebrow, title, subtitle, and ambient light.
- `Eyebrow` and `Chip`: compact labels with low-contrast hairlines and optional blue emphasis.
- `components/motion/`: `Reveal`, `StaggerGroup`, `Parallax`, `CountUp`, `Marquee`, `TiltCard`, `Magnetic`, `Spotlight`, and `TextReveal`.

## Utilities

Use `glass`, `glow-primary`, `glow-subtle`, `glow-card`, `hairline`, `aurora`, `bg-grid-dark`,
`bg-noise`, and `text-glow` for shared presentation treatments. Keep glow layers absolute,
pointer-inert, and in their own stacking context. Animate only transform and opacity in loops.

## Do / Don't

- Do use semantic tokens and blue ambient light.
- Do keep body text at accessible contrast and preserve visible focus rings.
- Do reserve cinematic motion for marketing composition; keep app surfaces calm.
- Don't add raw hexadecimal colors to components.
- Don't use green as an accent; green remains reserved for accepted/success semantics.
- Don't use heavy drop shadows, purple-to-pink gradients, or unbounded backdrop blur.

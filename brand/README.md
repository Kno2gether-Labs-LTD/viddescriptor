# Viddescriptor brand pack

Everything needed to represent Viddescriptor outside the app — marketing pages,
social, decks, thumbnails, partner material. Source of truth for the mark, the
wordmark, colours and type. The site itself consumes the same tokens
(`src/styles.css`) and the same mark (`public/brand/mark.svg`).

## The mark
A prompt caret (the sentence you type) beside a play wedge (the film you get
back), on a rounded near-black tile with an amber gradient wedge.

| File | Use |
|---|---|
| `logo/mark.svg` · `logo/mark-dark-1024.png` | Primary. App icon, avatars, favicon source, dark surfaces |
| `logo/mark-light-tile.svg` · `logo/mark-light-1024.png` | Light-surface variant (off-white tile) |
| `logo/mark-notile.svg` | Caret + wedge only, transparent — for placing on photos/video |
| `logo/mark-mono-ink.svg` / `logo/mark-mono-black.svg` | Single-colour (embossing, mono print, watermarks) |

Clear space: keep at least the caret's width free on all sides. Never rotate,
recolour the wedge to non-amber, add drop shadows, or place the dark tile on
busy imagery (use `mark-notile.svg` there).

## The wordmark
`VID` in amber + `DESCRIPTOR` in ink, Anton, uppercase, `letter-spacing: .02em`.
`logo/wordmark-dark@2x.png`, `logo/wordmark-light@2x.png`; lockups with the mark:
`logo/lockup-dark@2x.png`, `logo/lockup-light@2x.png` (mark height = cap
height × 1.1, gap = 0.3 × mark height). To recreate in any tool: font Anton 400,
colours below. Live HTML version: `<span style="color:#f0b429">VID</span>DESCRIPTOR`.

## Colour
| Token | Value | Role |
|---|---|---|
| Ink | `#f5f3ee` | text, caret |
| Amber (accent) | `oklch(0.78 0.19 85)` ≈ `#f0b429` | CTAs, accent word, VID |
| Amber deep | `#e08e0b` | wedge gradient end |
| Background | `#0a0a09` | page |
| Raised / card | `#0d0d0b` / `#0e0e0c` | panels |
| Violet | `oklch(0.7 0.23 300)` | secondary kickers |
| Green | `oklch(0.75 0.2 145)` | open-source / status |

Machine-readable: `tokens/tokens.css`, `tokens/tokens.json`.

## Type
- **Anton** — every headline, uppercase, line-height 0.86–0.92, ONE amber accent word per headline.
- **Archivo** — body, buttons (400/500/600/700).
- **JetBrains Mono** — kickers, captions, labels, uppercase with .1em tracking.
Google Fonts URL is in `tokens/tokens.json`.

## Voice
Direct, cinematic, honest. Claims must be true of the product (4K = stills only;
video is 1080p; never invent stats or events). Headline pattern:
"Describe your **film**. Get it back in minutes."

## Favicon & app icons
`favicon/` — `favicon.svg`, `favicon.ico` (16/32/48), PNG 16–512,
`favicon-180.png` (Apple touch), `site.webmanifest`, and `head-snippet.html`
to paste into `<head>`.

## Social
`social/og-image-1200x630.png` (Open Graph / Twitter card),
`social/x-header-1500x500.png`.

## Regenerating rasters
The PNGs were rendered from HTML with the real web fonts in a browser at 2×.
To re-render after changing the SVG or copy, rebuild a sheet with the fonts
loaded and screenshot the elements (any headless browser works).

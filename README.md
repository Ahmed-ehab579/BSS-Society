# Best Speech Society website

A front-end mockup in plain HTML, CSS and JavaScript (no framework, no build step).

Live: https://ahmed-ehab579.github.io/BSS-Society/

## Folder map

| Path | What it holds |
|---|---|
| `*.html` (root) | The pages: `index` (home), `start-here`, `article`, `library`, `material`, `new-muslim`, `new-muslim-step`, `about`, `404`. They stay at the root so the live links keep working |
| `css/` | Styles. `tokens.css` (design tokens) and `base.css` are shared; `motion.css` holds the shared motion. The other files are named after a page or component |
| `js/` | Scripts, named after a page or component. Shared state: `progress.js` (Start here), `saved.js` (Saved), `done.js` (New Muslim) |
| `assets/icons`, `assets/flags` | SVG icons and language flags |
| `assets/images` | Photos and book covers |
| `assets/samples` | A sample PDF and audio file used by the material pages |

Every CSS and JS link carries `?v=N`: raise it on every page when that file changes.

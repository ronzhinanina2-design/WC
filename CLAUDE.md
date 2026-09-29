# WC — project rules for Claude Code

Wardrobe Catalog — a personal, single-password web app for cataloging one man's
(large, partly historical-costume) wardrobe. See `wardrobe-app-design-brief.md`
and `wardrobe-app-design-brief-overview.md` in the project root for the full brief,
and `WC Wardrobe Catalog.dc.html` for the Claude Design click-through prototype
this build is based on.

---

## Hosting & tech stack

- Deployed to `wc.ninahayden.design` via GitHub Pages (same pattern as `portia.ninahayden.design`)
- Plain HTML + CSS + vanilla JavaScript — no frameworks, no build step
- Data: Supabase, single JSONB row (`wc_app_data`, id `main`), local-first with a
  localStorage write-through cache. All storage access lives in `data.js` — no
  other file reads/writes it. See the "Sync model" section below.
- Background removal: a separate tiny Vercel project (`api/remove-bg.js`) proxies
  to the Poof.bg API so the API key stays server-side. Called cross-origin from
  the static site, same pattern as Portia's `api/scan-label.js` on `portia-rouge.vercel.app`.
- Fonts: EB Garamond (display/wordmark only) + General Sans (everything else),
  loaded from Google Fonts / Fontshare — keep the same `<link>` tags already in `index.html`/`login.html`.
- Icons: flat black silhouette SVGs in `icons/`, rendered via CSS `mask-image`
  (not `<img>`) so they can be tinted to the theme's fog-gray/bone — see `.wc-icon` in `styles.css`.

## Design system

### Colour palette (dark theme only, MVP)
| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0E0E13` | Background |
| `--smoke` | `#1B1B22` | Surface / cards |
| `--violet` | `#7C6FEF` | Primary accent — CTAs, active states, selected chips |
| `--dust` | `#4A3F73` | Secondary accent — muted buttons, dashed borders |
| `--bone` | `#F2F0F5` | Primary text |
| `--fog` | `#9A97A8` | Secondary text — labels, metadata |

Never pair `--dust` text directly on `--ink` — contrast is too low.

### Typography
`EB Garamond` for the wordmark, item names, category/group headings.
`General Sans` for everything else (labels, buttons, body).

## Data model

Single row in `wc_app_data`, shape:
```
{
  items: [{ id, name, cat, material, season, color, img (base64 data URL), addedAt }],
  extraCats: [ "user-added category name", ... ],
  ovCollapsed: { "Category name": true },  // Overview modal collapse state
  deletedIds: [ ... ]                       // tombstones so deletes survive merge
}
```
Categories/groups are fixed (`BASE_GROUPS` in `app.js`) plus whatever the user
adds, which land in a synthetic "Curiosities" group. Material options are
category-dependent (`MATERIALS_BY_CAT`); season and colour are the same for
every category.

## Sync model

Local-first: every read goes through the in-memory `cache` (backed by
localStorage), so the UI never waits on the network. Every write does
pull-merge-push against Supabase with compare-and-swap on `updated_at`, so two
devices writing at nearly the same time both survive (merged by item id,
deletes tracked via tombstones) instead of one clobbering the other. On top of
that, a Realtime subscription (`postgres_changes` on `wc_app_data`) pushes
merged remote writes into any other open tab immediately — this is the one
thing added beyond Portia's `data.js`, since WC's brief calls live sync (no
manual refresh) a hard requirement, and Portia's original only pulls on load.

## File structure

```
/
├── index.html       → app shell (protected by auth.js), loads data.js + app.js
├── login.html        → password entry
├── auth.js            → redirect guard, included in index.html's <head>
├── data.js            → all data access — only file that reads/writes storage
├── app.js             → view state machine + rendering + event handling
├── styles.css         → shared tokens, base styles, component classes
├── icons/*.svg         → category icons (mask-tinted, see .wc-icon)
├── api/remove-bg.js    → Poof.bg proxy (separate Vercel project — see below)
├── CNAME               → wc.ninahayden.design
└── favicon*, apple-touch-icon.png
```

## Deploying

1. GitHub Pages: push this folder to a GitHub repo, enable Pages on the `main`
   branch, add the `wc.ninahayden.design` CNAME record at the registrar
   (same setup as `portia`: `dns1/dns2.registrar-servers.com`, i.e. Namecheap).
2. Supabase: run the SQL in `supabase-setup.sql` once, in the SQL editor of the
   same Supabase project Portia uses (or a new one — update `SUPABASE_URL` /
   `SUPABASE_ANON_KEY` in `data.js` if so).
3. Poof.bg proxy: deploy `api/remove-bg.js` (+ `package.json`) as its own small
   Vercel project (same shape as `portia-rouge`), set `POOF_BG_API_KEY` as an
   env var there (never commit it), then update `REMOVE_BG_ENDPOINT` at the top
   of `app.js` to that project's URL.

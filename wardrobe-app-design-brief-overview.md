# WC — Wardrobe Catalog App
### Design brief for prototyping (Claude Design)

*Name "WC" (Wardrobe Catalog) is a working name, pending final confirmation — favicon plays on the British "water closet" joke.*

---

## What it is
A minimalist web app for cataloging a personal wardrobe — photograph a clothing item or accessory, tag it, and browse the full collection from any device. Built first for one user (a British man with a large, partly historical-costume wardrobe), with architecture that could support more users later via password-only access.

## Target user
One primary user for MVP. Appreciates dry, understated British humor. Wants something that feels personal and characterful — explicitly not corporate or sterile like a shopping app.

## Success looks like
- Adding an item from the phone takes ~30 seconds
- Item appears on desktop without any manual refresh/sync step
- Catalog reflects the real wardrobe, not a snapshot that goes stale after a month

---

## MVP feature scope
- Photo capture/upload from mobile, background auto-removed via the Poof.bg API (items render as clean cutouts, not on their original messy background)
- Single shared password for access — no login/email, no per-user accounts in the UI (architecture allows it later)
- Real-time sync between mobile and desktop — a hard requirement, not best-effort
- Catalog browsing with a **grid/list toggle** in the top-right corner:
  - Grid: full-bleed photo card, tags (material/season/color) shown below the photo on the card itself
  - List: compact rows — small thumbnail + name, for scanning large categories fast
- Item card (grid mode): bleed photo fills the top of the card, assigned tags shown below it. *(Whether quick actions like edit/delete live directly on the card, or only inside the detail screen, is still open — see Open items.)*
- Item detail screen: full-bleed photo at top (edge-to-edge, bleeding into the top of the viewport), tag selectors below (material, season, color) — no scroll-jump between photo and metadata
- Add/edit category and subcategory: free-text input, duplicate check (case- and whitespace-insensitive) before allowing save
- Floating "add item" button on the main catalog view
- Responsive: mobile-first, but must hold up as a full desktop layout too — same interface, not a separate desktop design
- **Overview** — a "Overview" text/icon button on the Home screen, top-right, next to the "X ITEMS · Y CATEGORIES" summary line. Opens a full-screen modal (X to close, top-right) for scanning the whole wardrobe at a glance and catching duplicates:
  - One long scroll, no pagination
  - Structure: category name + item count as a header (e.g. `T-Shirts · 20`), with a plain bullet list of item names underneath
  - Every section is **expanded by default** — the point is seeing the full list in one pass
  - Each category header has a chevron to manually collapse/expand it afterward (for re-checking already-reviewed sections)

## Category structure (fixed, English UI)
| Group | Categories |
|---|---|
| Tops | T-Shirts, Shirts, Hoodies |
| Outerwear | Coats |
| Bottoms | Jeans, Jogging bottoms |
| Sleepwear | Pajamas |
| Footwear | Boots, Shoes, Trainers |
| Accessories | Hats, Scarves, Gloves, Belts |
| Basics | Underwear, Socks |

User can also add fully custom categories and subcategories on top of this list.

## Tags & attributes

### Material — depends on category
The material options shown depend on the selected category (a t-shirt shouldn't offer "Leather"). Every category's list ends with **Other**, for anything unusual (e.g. historical-costume fabrics like silk or brocade).

| Category | Materials |
|---|---|
| T-Shirts | Cotton, Linen, Jersey/Knit, Synthetic blend, Other |
| Shirts | Cotton, Linen, Flannel, Synthetic blend, Other |
| Hoodies | Cotton, Jersey/Knit fleece, Synthetic blend, Other |
| Coats | Wool, Cotton/Canvas, Leather, Down, Technical/Synthetic, Other |
| Jeans | Denim, Other |
| Jogging bottoms | Cotton/Jersey, Synthetic blend, Other |
| Pajamas | Cotton, Jersey/Knit, Flannel, Silk, Other |
| Boots | Leather, Suede, Rubber, Synthetic, Other |
| Shoes | Leather, Suede, Canvas, Synthetic, Other |
| Trainers | Mesh/Synthetic, Leather, Canvas, Other |
| Hats | Wool, Knit, Cotton, Straw, Leather, Other |
| Scarves | Wool, Cashmere, Silk, Cotton, Knit, Other |
| Gloves | Leather, Wool, Knit, Synthetic, Other |
| Belts | Leather, Canvas, Synthetic, Other |
| Underwear | Cotton, Synthetic blend, Modal, Other |
| Socks | Cotton, Wool, Synthetic blend, Other |

Custom categories (user-added) get a generic material list: Cotton, Wool, Leather, Silk, Synthetic, Other.

### Season — same for every category
All-season, Spring/Autumn, Summer, Winter

### Color — same for every category
Fixed swatch palette, not a full-spectrum picker. Rendered as a grid of rounded-square swatches, sized for a comfortable tap target (not tiny dots):

Black, White, Gray, Charcoal, Navy, Beige, Brown, Tan, Olive, Burgundy, Red, Green, Blue, Purple, Yellow, Orange, Other/Multicolor

---

## Screens to prototype
1. Password entry / access screen
2. Home — category groups (grid of group cards, like "Nature / Animals" style grouping)
3. Category view — items in grid mode
4. Category view — items in list mode (with the grid/list toggle visible in both)
5. Item detail screen (full-bleed photo + selects)
6. Add item flow: photo capture/upload → category select → subcategory (optional, free text with duplicate check) → material/season/color selects → save
   - **Prototype note:** a clickable prototype can't request real camera/gallery access. On "add photo," show a pre-loaded demo photo (a t-shirt graphic, provided separately) instead of a real capture — the click-through flow matters here, not a working camera.
7. Add custom category/subcategory screen
8. Overview modal — full-screen, opened from Home, all category sections expanded by default with item counts and bullet-listed item names, collapsible via chevrons

---

## Brand identity

### Color palette (dark theme only for MVP)

| Hex | Name | Role | Notes |
|---|---|---|---|
| `#0E0E13` | Ink Black | Background | Base canvas, near-black not pure black |
| `#1B1B22` | Smoke | Surface / cards | Item cards, input fields, modals |
| `#7C6FEF` | Signal Violet | Primary accent | Primary CTAs, active states, selected toggle |
| `#4A3F73` | Dust Violet | Secondary accent | Muted buttons, inactive icons, secondary badges |
| `#F2F0F5` | Bone White | Primary text | Headlines, item names |
| `#9A97A8` | Fog Gray | Secondary text | Metadata, labels, placeholder text |

**Never pair:** Dust Violet text directly on Ink Black background — contrast is too low to read comfortably. Dust Violet is for fills/icons, not body text.

### Typography
- **Garamond** — accent/display only. Use for the brand name/wordmark and possibly category group headers. Never for body text or UI labels.
- **General Sans** (Fontshare, free) — everything else: selects, labels, buttons, item names, body copy.

### Visual language
- Photography-first: item photos are the hero, UI chrome stays quiet around them
- Full-bleed photos on detail screens, no card border cutting off the top of the image
- Purple used sparingly — accent, not wallpaper (per the "First/Secondary button" reference)
- No gradients or glow effects in MVP — flat dark surfaces, keep build complexity low
- Grid cards feel editorial/retro (Burberry-trunkshow inspired), not like a generic e-commerce grid

---

## Style references gathered
- Minimalist item grid + full-bleed detail screen with selects below (primary UX reference)
- Stylebook: flat top-level category list with item counts and thumbnails
- Floating "+" add button over the catalog grid
- Dark app with grouped category cards under section headers (Nature/Animals-style grouping)
- Burberry trunkshow product cards: clean, cutout product photography, slightly retro — depends on background removal to work
- TextNow app: saturated violet on black, rounded cards, accent used sparingly on buttons/badges only
- Focus app: muted violet + serif display font ("Focus") mixed with a sans UI — direct precedent for the Garamond + General Sans pairing
- UI kit reference: two violet shades (saturated for primary buttons, muted for secondary), warm dark gray surface
- Relaxation app: violet gradient with glow — noted as a style option but **not** used for MVP (adds build complexity)

---

## Open items
- Final brand name confirmation (currently "WC")
- Whether the grid item card gets quick actions (edit/delete) directly on it, or those only live inside the detail screen

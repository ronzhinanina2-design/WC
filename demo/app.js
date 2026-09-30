/* ============ WC — app (demo build) ============ */
/* Identical to the production app.js except: no real Poof.bg call (a demo
   visitor's upload shouldn't spend the real API quota) — removeBackground()
   below just simulates the delay locally instead of calling
   REMOVE_BG_ENDPOINT. Everything else — view state machine, rendering,
   event handling — is unchanged, so this stays a faithful preview of the
   real product. View preference uses sessionStorage (not localStorage) to
   match the rest of the demo's storage isolation. */

const BASE_GROUPS = [
  { id: 'tops', name: 'Tops', cats: ['T-Shirts', 'Shirts', 'Hoodies'] },
  { id: 'outerwear', name: 'Outerwear', cats: ['Coats'] },
  { id: 'bottoms', name: 'Bottoms', cats: ['Jeans', 'Jogging bottoms'] },
  { id: 'sleepwear', name: 'Sleepwear', cats: ['Pajamas'] },
  { id: 'footwear', name: 'Footwear', cats: ['Boots', 'Shoes', 'Trainers'] },
  { id: 'accessories', name: 'Accessories', cats: ['Hats', 'Scarves', 'Gloves', 'Belts'] },
  { id: 'basics', name: 'Basics', cats: ['Underwear', 'Socks'] },
];

const ICONS = {
  'T-Shirts': 'tshirt.svg', 'Shirts': 'shirt.svg', 'Hoodies': 'hoodie.svg',
  'Coats': 'coat.svg', 'Jeans': 'jeans.svg', 'Jogging bottoms': 'sweatpants.svg',
  'Boots': 'boot.svg', 'Shoes': 'sneaker.svg', 'Trainers': 'sneaker.svg',
  'Hats': 'cap.svg', 'Scarves': 'scarf.svg', 'Gloves': 'glove.svg',
  'Underwear': 'underwear.svg', 'Socks': 'socks.svg',
};
const FALLBACK_ICON = 'hanger.svg';

const MATERIALS_BY_CAT = {
  'T-Shirts': ['Cotton', 'Linen', 'Jersey/Knit', 'Synthetic blend', 'Other'],
  'Shirts': ['Cotton', 'Linen', 'Flannel', 'Synthetic blend', 'Other'],
  'Hoodies': ['Cotton', 'Jersey/Knit fleece', 'Synthetic blend', 'Other'],
  'Coats': ['Wool', 'Cotton/Canvas', 'Leather', 'Down', 'Technical/Synthetic', 'Other'],
  'Jeans': ['Denim', 'Other'],
  'Jogging bottoms': ['Cotton/Jersey', 'Synthetic blend', 'Other'],
  'Pajamas': ['Cotton', 'Jersey/Knit', 'Flannel', 'Silk', 'Other'],
  'Boots': ['Leather', 'Suede', 'Rubber', 'Synthetic', 'Other'],
  'Shoes': ['Leather', 'Suede', 'Canvas', 'Synthetic', 'Other'],
  'Trainers': ['Mesh/Synthetic', 'Leather', 'Canvas', 'Other'],
  'Hats': ['Wool', 'Knit', 'Cotton', 'Straw', 'Leather', 'Other'],
  'Scarves': ['Wool', 'Cashmere', 'Silk', 'Cotton', 'Knit', 'Other'],
  'Gloves': ['Leather', 'Wool', 'Knit', 'Synthetic', 'Other'],
  'Belts': ['Leather', 'Canvas', 'Synthetic', 'Other'],
  'Underwear': ['Cotton', 'Synthetic blend', 'Modal', 'Other'],
  'Socks': ['Cotton', 'Wool', 'Synthetic blend', 'Other'],
};
const GENERIC_MATERIALS = ['Cotton', 'Wool', 'Leather', 'Silk', 'Synthetic', 'Other'];

const SEASONS = ['All-season', 'Spring/Autumn', 'Summer', 'Winter'];

const COLORS = [
  { name: 'Black', hex: '#111114' }, { name: 'White', hex: '#F2F0F5' },
  { name: 'Gray', hex: '#8B8B93' }, { name: 'Charcoal', hex: '#35353D' },
  { name: 'Navy', hex: '#1F2A44' }, { name: 'Beige', hex: '#D8C7A6' },
  { name: 'Brown', hex: '#6B4A32' }, { name: 'Tan', hex: '#C9A374' },
  { name: 'Olive', hex: '#6B6B3A' }, { name: 'Burgundy', hex: '#6E1F2A' },
  { name: 'Red', hex: '#C1352B' }, { name: 'Green', hex: '#3C6B3C' },
  { name: 'Blue', hex: '#3060C9' }, { name: 'Purple', hex: '#6C4CC4' },
  { name: 'Yellow', hex: '#D9B23C' }, { name: 'Orange', hex: '#D9752E' },
  { name: 'Other/Multicolor', hex: null },
];

let state = {
  screen: 'home',
  view: sessionStorage.getItem('wc_view') === 'list' ? 'list' : 'grid',
  group: null,
  cat: null,
  itemId: null,
  overview: false,
  addingCat: false,
  newCatInput: '',
  dupeNote: '',
  draft: null,
  toast: null,
};

function normCat(s) { return String(s).replace(/\s+/g, ' ').trim().toLowerCase(); }

function groupsData() {
  const g = BASE_GROUPS.map((x) => ({ ...x }));
  const extra = Data.getExtraCats();
  if (extra.length) g.push({ id: 'custom', name: 'Curiosities', cats: extra });
  return g;
}
function allCats() { return groupsData().reduce((a, g) => a.concat(g.cats), []); }
function findGroupForCat(cat) { return groupsData().find((g) => g.cats.includes(cat)) || null; }

function iconUrl(cat) { return 'icons/' + (ICONS[cat] || FALLBACK_ICON); }

function formatAdded(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Date.now() - d.getTime() < 60000) return 'Added just now';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Added ${d.getDate()} ${months[d.getMonth()]}`;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showToast(msg, ms) {
  state.toast = msg;
  render();
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { state.toast = null; render(); }, ms || 2600);
}

/* ---- photo helpers ---- */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function resizeDataUrl(dataUrl, maxDim, mime, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL(mime || 'image/jpeg', quality || 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Demo stand-in for the real Poof.bg-backed removeBackground(): no network
// call, just the same visual pacing so the add-item flow still feels right.
function removeBackground(dataUrl) {
  return new Promise((resolve) => setTimeout(() => resolve(dataUrl), 1200));
}

/* ---- actions ---- */
function goHome() { state.screen = 'home'; state.group = null; state.cat = null; render(); }
function goGroup() { state.screen = 'group'; state.cat = null; render(); }
function openGroup(id) { state.screen = 'group'; state.group = id; render(); }
function openCategory(cat) { state.screen = 'items'; state.cat = cat; render(); }
function openItem(id) { state.screen = 'detail'; state.itemId = id; render(); }
function backToItems() { state.screen = 'items'; render(); }
function setView(v) { state.view = v; sessionStorage.setItem('wc_view', v); render(); }

function startAdd() {
  state.screen = 'add';
  state.addingCat = false;
  state.newCatInput = '';
  state.dupeNote = '';
  state.draft = { name: '', cat: state.cat || null, material: null, season: null, color: null, photo: null, processingPhoto: false, bgRemoved: false };
  render();
}
function cancelAdd() { state.screen = state.cat ? 'items' : 'home'; render(); }

async function onPhotoChosen(file) {
  if (!file) return;
  const raw = await fileToDataUrl(file);
  const resized = await resizeDataUrl(raw, 1400, 'image/jpeg', 0.85);
  state.draft.photo = resized;
  state.draft.processingPhoto = true;
  state.draft.bgRemoved = false;
  render();
  try {
    const cut = await removeBackground(resized);
    state.draft.photo = cut;
    state.draft.bgRemoved = true;
  } catch (e) {
    console.warn('Background removal unavailable', e);
    showToast('Background removal unavailable — saved with the original background.');
  } finally {
    state.draft.processingPhoto = false;
    render();
  }
}

function addCategory() {
  const raw = state.newCatInput;
  const norm = normCat(raw);
  if (!norm) { state.dupeNote = 'A category needs a name, however dull.'; render(); return; }
  const twin = allCats().find((c) => normCat(c) === norm);
  if (twin) {
    state.draft.cat = twin;
    state.newCatInput = ''; state.addingCat = false; state.dupeNote = '';
    showToast(`"${twin}" already exists. Selected that one instead.`);
    return;
  }
  const name = raw.replace(/\s+/g, ' ').trim();
  Data.addExtraCat(name);
  state.draft.cat = name;
  state.newCatInput = ''; state.addingCat = false; state.dupeNote = '';
  render();
}

function saveDraft() {
  const d = state.draft;
  if (!d.cat) { showToast('Pick a category first.'); return; }
  if (!d.photo) { showToast('Add a photo first.'); return; }
  const item = Data.addItem({
    name: d.name.trim() || 'Untitled garment',
    cat: d.cat,
    material: d.material || null,
    season: d.season || null,
    color: d.color || null,
    img: d.photo,
  });
  state.screen = 'items';
  state.cat = d.cat;
  const group = findGroupForCat(d.cat);
  if (group) state.group = group.id;
  state.draft = null;
  render();
  showToast('Filed. It is already on the desktop.');
}

function saveDetailPatch(patch) {
  if (!state.itemId) return;
  Data.updateItem(state.itemId, patch);
  render();
}
function deleteCurrentItem() {
  if (!state.itemId) return;
  Data.deleteItem(state.itemId);
  state.screen = 'items';
  state.itemId = null;
  render();
  showToast('Removed from the wardrobe.');
}

function openOverview() { state.overview = true; render(); }
function closeOverview() { state.overview = false; render(); }

Data.onRemoteChange(() => render());

/* ---- render: pieces ---- */
function chipsHtml(options, selected, action, extraAttr) {
  return options.map((o) => `<button class="wc-chip${o === selected ? ' is-selected' : ''}" data-action="${action}" data-value="${esc(o)}" ${extraAttr || ''}>${esc(o)}</button>`).join('');
}

function swatchesHtml(selected, action) {
  return `<div class="wc-swatch-grid">` + COLORS.map((c) => {
    const isSel = c.name === selected;
    const bg = c.hex ? `background:${c.hex};` : `background: conic-gradient(#C1352B,#D9B23C,#3C6B3C,#3060C9,#6C4CC4,#C1352B);`;
    const check = isSel ? `<svg viewBox="0 0 24 24" fill="none" stroke="${c.hex === '#F2F0F5' || c.hex === '#D8C7A6' || c.hex === '#C9A374' ? '#0E0E13' : '#F2F0F5'}" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>` : '';
    return `<button class="wc-swatch${isSel ? ' is-selected' : ''}" style="${bg}" title="${esc(c.name)}" data-action="${action}" data-value="${esc(c.name)}">${check}</button>`;
  }).join('') + `</div>`;
}

function iconSpanHtml(cat, size, opacity) {
  return `<span class="wc-icon" style="width:${size}px;height:${size}px;color:var(--fog);${opacity ? `opacity:${opacity};` : ''}-webkit-mask-image:url(${iconUrl(cat)});mask-image:url(${iconUrl(cat)});"></span>`;
}

function topbarHtml(title, backAction) {
  return `
    <div style="display:flex;align-items:center;gap:8px;padding:0 16px 14px;">
      <button class="wc-back" data-action="${backAction}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7"/></svg></button>
      <span style="flex:1;min-width:0;font-family:var(--font-display);font-size:29px;line-height:1.05;overflow-wrap:break-word;">${esc(title)}</span>
      ${viewToggleHtml()}
    </div>`;
}
function viewToggleHtml() {
  const g = state.view === 'grid';
  return `
    <div class="wc-toggle">
      <button class="${g ? 'is-active' : ''}" title="Grid" data-action="set-view" data-value="grid"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg></button>
      <button class="${!g ? 'is-active' : ''}" title="List" data-action="set-view" data-value="list"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>`;
}

/* ---- render: screens ---- */
function renderHome() {
  const groups = groupsData();
  const items = Data.getItems();
  const count = (cats) => items.filter((i) => cats.includes(i.cat)).length;
  const totalLine = `${items.length} item${items.length === 1 ? '' : 's'} · ${allCats().length} categories`;
  return `
    <div class="screen wc-container" style="flex:1;overflow-y:auto;padding:22px 16px 120px;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;">
        <div>
          <div style="font-family:var(--font-display);font-size:46px;line-height:1;letter-spacing:-.02em;color:var(--violet);">WC</div>
          <div style="margin-top:6px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--fog);">${esc(totalLine)}</div>
        </div>
        <button data-action="open-overview" style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;border:1px solid var(--dust);background:none;color:var(--violet);font-size:13px;font-weight:600;cursor:pointer;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>
          Overview
        </button>
      </div>
      <div style="margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${groups.map((g, idx) => `
          <button class="wc-group-card" style="min-height:122px;display:flex;flex-direction:column;justify-content:space-between;${idx === groups.length - 1 && groups.length % 2 === 1 ? 'grid-column:span 2;' : ''}" data-action="open-group" data-value="${esc(g.id)}">
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;">
              <span style="font-family:var(--font-display);font-size:25px;line-height:1;">${esc(g.name)}</span>
              <span style="font-family:var(--font-display);font-size:25px;line-height:1;color:var(--violet);">${count(g.cats)}</span>
            </div>
            <div style="font-size:11.5px;line-height:1.45;color:var(--fog);">${esc(g.cats.join('  ·  '))}</div>
          </button>`).join('')}
      </div>
    </div>`;
}

function renderGroup() {
  const group = groupsData().find((g) => g.id === state.group);
  const items = Data.getItems();
  if (!group) { state.screen = 'home'; return renderHome(); }
  const cats = group.cats.map((c) => {
    const n = items.filter((i) => i.cat === c).length;
    return { name: c, countLine: n === 1 ? '1 item' : `${n} items` };
  });
  const grid = state.view === 'grid';
  return `
    <div class="screen wc-container" style="flex:1;overflow-y:auto;padding:18px 0 120px;">
      ${topbarHtml(group.name, 'go-home')}
      ${grid ? `
        <div style="padding:0 16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;">
          ${cats.map((c) => `
            <button class="wc-cat-card" style="display:flex;flex-direction:column;gap:20px;" data-action="open-category" data-value="${esc(c.name)}">
              ${iconSpanHtml(c.name, 64)}
              <div>
                <div style="font-family:var(--font-display);font-size:21px;line-height:1.15;">${esc(c.name)}</div>
                <div style="margin-top:3px;font-size:12px;color:var(--fog);">${esc(c.countLine)}</div>
              </div>
            </button>`).join('')}
        </div>` : `
        <div style="border-top:1px solid var(--line);">
          ${cats.map((c) => `
            <button style="width:100%;text-align:left;display:flex;align-items:center;gap:14px;padding:12px 16px;border:none;border-bottom:1px solid var(--line);background:none;color:var(--bone);cursor:pointer;" data-action="open-category" data-value="${esc(c.name)}">
              <div style="width:52px;height:52px;border-radius:13px;background:var(--smoke);flex:none;display:flex;align-items:center;justify-content:center;">${iconSpanHtml(c.name, 42)}</div>
              <div style="flex:1;">
                <div style="font-family:var(--font-display);font-size:21px;line-height:1.15;">${esc(c.name)}</div>
                <div style="margin-top:3px;font-size:12px;color:var(--fog);">${esc(c.countLine)}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--dust)" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
            </button>`).join('')}
        </div>`}
    </div>`;
}

function renderItems() {
  const items = Data.getItems().filter((i) => i.cat === state.cat);
  const grid = state.view === 'grid';
  return `
    <div class="screen wc-container" style="flex:1;overflow-y:auto;overflow-x:hidden;padding:18px 0 120px;">
      ${topbarHtml(state.cat || '', state.group ? 'go-group' : 'go-home')}
      ${items.length === 0 ? `
        <div style="padding:40px 16px;text-align:center;color:var(--fog);font-size:14px;">Nothing filed here yet.</div>` :
      grid ? `
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);background:var(--ink);border-top:1px solid var(--line-hi);">
          ${items.map((it) => `
            <button style="min-width:0;overflow:hidden;background:var(--ink);border:none;border-right:1px solid var(--line-hi);border-bottom:1px solid var(--line-hi);padding:0 0 14px;color:var(--bone);cursor:pointer;text-align:center;" data-action="open-item" data-value="${esc(it.id)}">
              <div style="position:relative;width:100%;height:208px;display:flex;align-items:center;justify-content:center;padding:14px;">
                ${it.img ? `<div style="width:100%;height:100%;background-image:url('${it.img}');background-size:contain;background-position:center;background-repeat:no-repeat;"></div>` : iconSpanHtml(it.cat, 80, 0.55)}
              </div>
              <div style="padding:0 12px;min-height:52px;">
                <div style="font-family:var(--font-display);font-size:18px;line-height:1.2;">${esc(it.name)}</div>
                <div style="margin-top:4px;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--fog);">${esc([it.material, it.color].filter(Boolean).join(' · '))}</div>
              </div>
            </button>`).join('')}
        </div>` : `
        <div style="border-top:1px solid var(--line);">
          ${items.map((it) => `
            <button style="width:100%;display:flex;align-items:center;gap:13px;padding:9px 16px;border:none;border-bottom:1px solid var(--line);background:none;color:var(--bone);cursor:pointer;text-align:left;" data-action="open-item" data-value="${esc(it.id)}">
              <div style="width:44px;height:52px;flex:none;border-radius:6px;background:var(--smoke);overflow:hidden;display:flex;align-items:center;justify-content:center;padding:4px;">
                ${it.img ? `<div style="width:100%;height:100%;background-image:url('${it.img}');background-size:contain;background-position:center;background-repeat:no-repeat;"></div>` : `<span style="font-family:var(--font-display);font-size:16px;color:var(--dust);">${esc(it.name.charAt(0))}</span>`}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-family:var(--font-display);font-size:19px;line-height:1.2;">${esc(it.name)}</div>
                <div style="margin-top:2px;font-size:11.5px;color:var(--fog);">${esc([it.material, it.color].filter(Boolean).join(' · '))}</div>
              </div>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--dust)" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
            </button>`).join('')}
        </div>`}
    </div>`;
}

function renderDetail() {
  const item = Data.getItemById(state.itemId);
  if (!item) { state.screen = 'items'; return renderItems(); }
  const materials = MATERIALS_BY_CAT[item.cat] || GENERIC_MATERIALS;
  return `
    <div class="screen" style="flex:1;overflow-y:auto;padding-bottom:40px;">
      <div style="position:relative;width:100%;height:min(430px,55vh);background:#16161D;display:flex;align-items:center;justify-content:center;padding:26px;">
        ${item.img ? `<div style="width:100%;height:100%;background-image:url('${item.img}');background-size:contain;background-position:center;background-repeat:no-repeat;"></div>` : iconSpanHtml(item.cat, 120, 0.5)}
        <button class="wc-back" style="position:absolute;top:16px;left:16px;z-index:2;width:38px;height:38px;border-radius:50%;background:rgba(14,14,19,.72);backdrop-filter:blur(8px);" data-action="back-to-items"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7"/></svg></button>
        <button style="position:absolute;top:16px;right:16px;z-index:2;width:38px;height:38px;border-radius:50%;border:none;background:rgba(14,14,19,.72);backdrop-filter:blur(8px);color:var(--bone);cursor:pointer;display:flex;align-items:center;justify-content:center;" data-action="confirm-delete" title="Delete item"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>
      </div>
      <div class="wc-container">
        <div style="padding:20px 16px 0;">
          <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--violet);">${esc(item.cat)}</div>
          <input class="wc-input-name" value="${esc(item.name)}" data-field="detail-name" style="margin-top:6px;width:100%;border:none;background:none;padding:0;color:var(--bone);outline:none;">
          <div style="margin-top:8px;font-size:13px;color:var(--fog);">${esc(formatAdded(item.addedAt))}</div>
        </div>
        <div style="margin-top:22px;padding:0 16px;display:flex;flex-direction:column;gap:20px;">
          <div>
            <div class="wc-label">Material</div>
            <div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:7px;">${chipsHtml(materials, item.material, 'detail-material')}</div>
          </div>
          <div>
            <div class="wc-label">Season</div>
            <div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:7px;">${chipsHtml(SEASONS, item.season, 'detail-season')}</div>
          </div>
          <div>
            <div class="wc-label">Colour</div>
            <div style="margin-top:9px;">${swatchesHtml(item.color, 'detail-color')}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderAdd() {
  const d = state.draft;
  const materials = d.cat ? (MATERIALS_BY_CAT[d.cat] || GENERIC_MATERIALS) : null;
  return `
    <div class="screen" style="flex:1;overflow-y:auto;padding-bottom:108px;">
      <div style="position:relative;width:100%;height:min(340px,48vh);background:#16161D;display:flex;align-items:center;justify-content:center;padding:26px 30px 22px;">
        ${d.photo ? `<div style="width:100%;height:100%;background-image:url('${d.photo}');background-size:contain;background-position:center;background-repeat:no-repeat;"></div>` : `
          <button data-action="pick-photo" style="width:100%;height:100%;border:1.5px dashed var(--line-hi);border-radius:16px;background:none;color:var(--fog);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-size:13px;">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg>
            Add a photo
          </button>`}
        ${d.processingPhoto ? `
          <div style="position:absolute;inset:0;background:rgba(14,14,19,.72);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
            <div style="width:40px;height:40px;border-radius:50%;border:2px solid rgba(124,111,239,.22);border-top-color:var(--violet);animation:wc-spin .9s linear infinite;"></div>
            <div style="font-size:13px;color:var(--fog);">Removing the background&hellip;</div>
          </div>` : ''}
        ${d.photo ? `<button class="wc-back" style="position:absolute;top:16px;left:16px;z-index:2;width:38px;height:38px;border-radius:50%;background:rgba(14,14,19,.72);" data-action="cancel-add"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ''}
        ${d.photo && d.bgRemoved ? `<div style="position:absolute;bottom:14px;right:16px;padding:6px 11px;border-radius:999px;background:rgba(74,63,115,.6);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--bone);">Background removed</div>` : ''}
        ${d.photo ? `<button data-action="pick-photo" style="position:absolute;bottom:14px;left:16px;padding:6px 11px;border-radius:999px;background:rgba(14,14,19,.72);border:none;font-size:11px;letter-spacing:.06em;color:var(--fog);cursor:pointer;">Retake</button>` : ''}
      </div>
      <input type="file" accept="image/*" capture="environment" id="wc-photo-input" hidden>

      <div class="wc-container">
        <div style="padding:20px 16px 0;">
          <div class="wc-label">New item</div>
          <input class="wc-input wc-input-name" value="${esc(d.name)}" placeholder="Name it" data-field="draft-name" style="margin-top:8px;">
        </div>
        <div style="margin-top:22px;padding:0 16px;display:flex;flex-direction:column;gap:20px;">
          <div>
            <div class="wc-label">Category</div>
            <div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:7px;">
              ${chipsHtml(allCats(), d.cat, 'draft-cat')}
              <button class="wc-chip-add" data-action="toggle-new-cat">+ New category</button>
            </div>
            ${state.addingCat ? `
              <div style="margin-top:10px;display:flex;gap:8px;">
                <input class="wc-input" style="flex:1;padding:11px 13px;font-size:14px;" value="${esc(state.newCatInput)}" placeholder="e.g. Frock coats" data-field="new-cat">
                <button style="padding:0 18px;border-radius:12px;border:none;background:var(--dust);color:var(--bone);font-size:14px;font-weight:600;cursor:pointer;" data-action="add-category">Add</button>
              </div>
              <div style="margin-top:7px;font-size:12px;color:var(--fog);">${esc(state.dupeNote || 'Case and spacing are ignored when checking for a twin.')}</div>` : ''}
          </div>
          <div>
            <div class="wc-label">Material</div>
            <div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:7px;">
              ${materials ? chipsHtml(materials, d.material, 'draft-material') : `<span style="font-size:13px;color:var(--fog);">Pick a category first</span>`}
            </div>
          </div>
          <div>
            <div class="wc-label">Season</div>
            <div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:7px;">${chipsHtml(SEASONS, d.season, 'draft-season')}</div>
          </div>
          <div>
            <div class="wc-label">Colour</div>
            <div style="margin-top:9px;">${swatchesHtml(d.color, 'draft-color')}</div>
          </div>
        </div>
      </div>
    </div>
    <div style="position:fixed;bottom:0;left:0;right:0;z-index:30;padding:14px 16px 24px;background:linear-gradient(to top, var(--ink) 55%, rgba(14,14,19,0));">
      <div class="wc-container">
        <button class="wc-btn-primary" data-action="save-draft" ${(!d.cat || !d.photo) ? 'disabled' : ''}>Save to wardrobe</button>
      </div>
    </div>`;
}

function renderOverview() {
  if (!state.overview) return '';
  const items = Data.getItems();
  const collapsed = Data.getOvCollapsed();
  const cats = [];
  allCats().forEach((c) => { if (!cats.includes(c)) cats.push(c); });
  items.forEach((i) => { if (!cats.includes(i.cat)) cats.push(i.cat); });
  const sections = cats.map((c) => {
    const inCat = items.filter((i) => i.cat === c);
    if (!inCat.length) return null;
    const open = !collapsed[c];
    return { name: c, count: inCat.length, open, names: inCat.map((i) => i.name) };
  }).filter(Boolean);
  const totalLine = `${items.length} item${items.length === 1 ? '' : 's'} · ${allCats().length} categories`;
  return `
    <div style="position:fixed;inset:0;z-index:70;background:var(--ink);display:flex;flex-direction:column;" class="screen">
      <div style="flex:none;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:22px 16px 14px;border-bottom:1px solid var(--line);">
        <div>
          <div style="font-family:var(--font-display);font-size:34px;line-height:1;">Overview</div>
          <div style="margin-top:6px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--fog);">${esc(totalLine)}</div>
        </div>
        <button style="flex:none;width:38px;height:38px;border-radius:50%;border:1px solid var(--line-hi);background:var(--smoke);color:var(--bone);cursor:pointer;display:flex;align-items:center;justify-content:center;" data-action="close-overview"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="wc-container" style="flex:1;overflow-y:auto;padding:6px 16px 40px;">
        ${sections.length === 0 ? `<div style="padding:40px 0;text-align:center;color:var(--fog);font-size:14px;">Nothing filed yet.</div>` : sections.map((sec) => `
          <div style="border-bottom:1px solid var(--line);">
            <button style="width:100%;display:flex;align-items:baseline;gap:10px;padding:16px 0 10px;border:none;background:none;color:var(--bone);cursor:pointer;text-align:left;" data-action="toggle-ov-cat" data-value="${esc(sec.name)}">
              <span style="flex:1;min-width:0;font-family:var(--font-display);font-size:18px;line-height:1.1;">${esc(sec.name)}</span>
              <span style="font-family:var(--font-display);font-size:18px;line-height:1.1;color:var(--violet);">${sec.count}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dust)" stroke-width="2.2" style="flex:none;transform:rotate(${sec.open ? '0' : '-90'}deg);transition:transform .18s;"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            ${sec.open ? `
              <ul style="margin:0 0 14px;padding:0 0 0 18px;list-style:none;display:flex;flex-direction:column;gap:6px;">
                ${sec.names.map((n) => `<li style="position:relative;font-size:14px;line-height:1.4;"><span style="position:absolute;left:-14px;color:var(--dust);">&middot;</span>${esc(n)}</li>`).join('')}
              </ul>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

/* ---- root render ---- */
function render() {
  const showFab = state.screen === 'home' || state.screen === 'group' || state.screen === 'items';
  let body;
  if (state.screen === 'home') body = renderHome();
  else if (state.screen === 'group') body = renderGroup();
  else if (state.screen === 'items') body = renderItems();
  else if (state.screen === 'detail') body = renderDetail();
  else if (state.screen === 'add') body = renderAdd();
  else body = renderHome();

  document.getElementById('app').innerHTML = `
    <div style="position:relative;width:100%;min-height:100vh;min-height:100dvh;background:var(--ink);color:var(--bone);display:flex;flex-direction:column;">
      ${body}
      ${showFab ? `<button class="wc-fab" data-action="start-add"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg></button>` : ''}
      ${renderOverview()}
      ${state.toast ? `<div class="wc-toast">${esc(state.toast)}</div>` : ''}
    </div>`;

  const photoInput = document.getElementById('wc-photo-input');
  if (photoInput) photoInput.addEventListener('change', (e) => onPhotoChosen(e.target.files[0]));
}

/* ---- event delegation ---- */
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  app.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const value = btn.getAttribute('data-value');
    switch (action) {
      case 'go-home': goHome(); break;
      case 'go-group': goGroup(); break;
      case 'open-group': openGroup(value); break;
      case 'open-category': openCategory(value); break;
      case 'open-item': openItem(value); break;
      case 'back-to-items': backToItems(); break;
      case 'set-view': setView(value); break;
      case 'open-overview': openOverview(); break;
      case 'close-overview': closeOverview(); break;
      case 'toggle-ov-cat': Data.toggleOvCollapsed(value); render(); break;
      case 'start-add': startAdd(); break;
      case 'cancel-add': cancelAdd(); break;
      case 'pick-photo': document.getElementById('wc-photo-input').click(); break;
      case 'toggle-new-cat': state.addingCat = !state.addingCat; render(); break;
      case 'add-category': addCategory(); break;
      case 'draft-cat': state.draft.cat = value; render(); break;
      case 'draft-material': state.draft.material = value; render(); break;
      case 'draft-season': state.draft.season = value; render(); break;
      case 'draft-color': state.draft.color = value; render(); break;
      case 'save-draft': saveDraft(); break;
      case 'detail-material': saveDetailPatch({ material: value }); break;
      case 'detail-season': saveDetailPatch({ season: value }); break;
      case 'detail-color': saveDetailPatch({ color: value }); break;
      case 'confirm-delete': if (confirm('Remove this item from the wardrobe?')) deleteCurrentItem(); break;
    }
  });

  app.addEventListener('input', (e) => {
    const field = e.target.getAttribute && e.target.getAttribute('data-field');
    if (!field) return;
    if (field === 'draft-name') state.draft.name = e.target.value;
    else if (field === 'new-cat') state.newCatInput = e.target.value;
    else if (field === 'detail-name') {
      const id = state.itemId;
      clearTimeout(render._nameT);
      render._nameT = setTimeout(() => { if (id) Data.updateItem(id, { name: e.target.value.trim() || 'Untitled garment' }); }, 500);
    }
  });

  render();
});

/* ============ WC — demo data layer ============ */
/* Same Data.* API shape as the real data.js, so demo/app.js is an unmodified
   copy of the production app — only the storage layer differs:
   - no Supabase, ever (no network calls, nothing to misconfigure)
   - sessionStorage instead of localStorage, so every fresh visit/tab starts
     from the same seeded catalog instead of accumulating clicked-through state
   - seeded with a realistic mock wardrobe instead of starting empty */

const STORAGE_KEY = 'wc-demo-data';

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function seedData() {
  const items = [
    ['Plain White Crew', 'T-Shirts', 'Cotton', 'Summer', 'White', 'tee-white.png', 3],
    ['Navy Crew', 'T-Shirts', 'Cotton', 'Spring/Autumn', 'Navy', 'tee-navy.png', 5],
    ['Faded Band Tee, 1998', 'T-Shirts', 'Cotton', 'Summer', 'Black', 'tee-faded.png', 21],
    ['Sabaton Tour Tee, reprint', 'T-Shirts', 'Synthetic blend', 'All-season', 'Black', 'tee-sabaton.png', 1],
    ['Oxford Button-Down', 'Shirts', 'Cotton', 'All-season', 'White', 'shirt-cotton.png', 40],
    ['Mint Poplin Shirt', 'Shirts', 'Cotton', 'Spring/Autumn', 'Green', 'shirt-mint.png', 40],
    ['Black Cotton Shirt', 'Shirts', 'Cotton', 'All-season', 'Black', 'shirt-black.png', 70],
    ['Black Pullover Hoodie', 'Hoodies', 'Cotton', 'Autumn', 'Black', 'hoodie-black.png', 95],
    ['Sky Blue Hoodie', 'Hoodies', 'Jersey/Knit fleece', 'Spring/Autumn', 'Blue', 'hoodie-blue.png', 95],
    ['Burnt Orange Hoodie', 'Hoodies', 'Cotton', 'Autumn', 'Orange', 'hoodie-orange.png', 95],
    ['Tie-Dye Hoodie', 'Hoodies', 'Cotton', 'Summer', 'Other/Multicolor', 'hoodie-tiedye.png', 110],
    ['Heritage Trench', 'Coats', 'Cotton/Canvas', 'Autumn', 'Brown', 'coat-brown.png', 140],
    ['Chesterfield Overcoat', 'Coats', 'Wool', 'Winter', 'Black', 'coat-black.png', 160],
    ['Frock Coat, repro', 'Coats', 'Wool', 'Winter', 'Burgundy', null, 210],
    ['Selvedge Straight', 'Jeans', 'Denim', 'All-season', 'Navy', 'jeans-blue.png', 180],
    ['Black Slim', 'Jeans', 'Denim', 'All-season', 'Black', null, 180],
    ['Charcoal Joggers', 'Jogging bottoms', 'Cotton/Jersey', 'All-season', 'Gray', null, 190],
    ['Striped Cotton Set', 'Pajamas', 'Cotton', 'All-season', 'Navy', null, 230],
    ['Chelsea Boots', 'Boots', 'Leather', 'Autumn', 'Black', null, 250],
    ['Wellingtons', 'Boots', 'Rubber', 'Winter', 'Olive', null, 260],
    ['Black Oxfords', 'Shoes', 'Leather', 'All-season', 'Black', null, 280],
    ['White Leather Trainers', 'Trainers', 'Leather', 'Spring/Autumn', 'White', null, 12],
    ['Green Shamrock Trilby', 'Hats', 'Straw', 'Spring/Autumn', 'Green', 'hat-shamrock.png', 300],
    ["Black Witch's Topper", 'Hats', 'Wool', 'Winter', 'Black', 'hat-witch.png', 320],
    ['Wool Tartan Scarf', 'Scarves', 'Wool', 'Winter', 'Burgundy', 'scarf-plaid.png', 330],
    ['Cozy Red Winter Scarf', 'Scarves', 'Wool', 'Winter', 'Red', 'scarf-red.png', 330],
    ['Driving Gloves', 'Gloves', 'Leather', 'Autumn', 'Brown', null, 340],
    ['Brown Leather Belt', 'Belts', 'Leather', 'All-season', 'Brown', null, 350],
    ['Cotton Boxers', 'Underwear', 'Cotton', 'All-season', 'Navy', null, 355],
    ['Argyle Wool Socks', 'Socks', 'Wool', 'Winter', 'Gray', 'socks-wool.png', 360],
    ['Christmas Socks, novelty', 'Socks', 'Cotton', 'Winter', 'Red', 'socks-christmas.png', 365],
    ["Napoleon-Style Bicorne, stage prop", 'Historical Reenactment', 'Wool', 'Winter', 'Black', null, 400],
  ].map(([name, cat, material, season, color, img, age]) => ({
    id: uid('demo'),
    name, cat, material, season, color,
    img: img ? `assets/${img}` : null,
    addedAt: daysAgo(age),
  }));

  return {
    items,
    extraCats: ['Historical Reenactment'],
    ovCollapsed: {},
    deletedIds: [],
  };
}

function readLocalOrSeed() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  const seeded = seedData();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

let cache = readLocalOrSeed();
const readyPromise = Promise.resolve();

function loadData() { return cache; }
function saveData(data) {
  cache = data;
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* demo tab storage full — fine, in-memory cache still works */ }
}

const Data = {
  ready: readyPromise,
  onRemoteChange() { /* no-op: demo has no remote to change */ },

  getItems() { return loadData().items; },
  getItemById(id) { return loadData().items.find((i) => i.id === id) || null; },
  addItem(item) {
    const data = loadData();
    const newItem = { ...item, id: uid('item'), addedAt: new Date().toISOString() };
    data.items = [newItem, ...data.items];
    saveData(data);
    return newItem;
  },
  updateItem(id, patch) {
    const data = loadData();
    const idx = data.items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    data.items[idx] = { ...data.items[idx], ...patch };
    saveData(data);
    return data.items[idx];
  },
  deleteItem(id) {
    const data = loadData();
    data.items = data.items.filter((i) => i.id !== id);
    data.deletedIds.push(id);
    saveData(data);
  },

  getExtraCats() { return loadData().extraCats; },
  addExtraCat(name) {
    const data = loadData();
    if (!data.extraCats.includes(name)) data.extraCats.push(name);
    saveData(data);
  },

  getOvCollapsed() { return loadData().ovCollapsed; },
  toggleOvCollapsed(cat) {
    const data = loadData();
    data.ovCollapsed = { ...data.ovCollapsed, [cat]: !data.ovCollapsed[cat] };
    saveData(data);
  },
};

window.Data = Data;

/* ============ WC — data layer ============ */
/* Only this file reads/writes storage. All pages go through Data.* below.
   Sync pattern (local-first cache + compare-and-swap push, merge-by-id,
   tombstoned deletes) is carried over from Portia's data.js, which the same
   account has run in production without data loss across concurrent devices.
   Added on top: a Supabase Realtime subscription, since WC's brief calls
   live cross-device sync a hard requirement — Portia only pulls on load. */

const STORAGE_KEY = 'wc-data';
const SUPABASE_URL = 'https://ijtitwrxhswqdfcquqvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdGl0d3J4aHN3cWRmY3F1cXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTU1MDAsImV4cCI6MjA5ODMzMTUwMH0.WAWmR3ixO80Hf-5Pb6QmVIbYJs7xGTzOkBmIXSRlgM8';
const TABLE = 'wc_app_data';
const ROW_ID = 'main';

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedData() {
  return { items: [], extraCats: [], ovCollapsed: {}, deletedIds: [] };
}

function normalizeData(parsed) {
  if (!parsed.items) parsed.items = [];
  if (!parsed.extraCats) parsed.extraCats = [];
  if (!parsed.ovCollapsed) parsed.ovCollapsed = {};
  if (!parsed.deletedIds) parsed.deletedIds = [];
  return parsed;
}

function mergeById(remoteList, localList, deletedIds) {
  const map = new Map();
  (remoteList || []).forEach((e) => { if (!deletedIds.has(e.id)) map.set(e.id, e); });
  (localList || []).forEach((e) => { if (!deletedIds.has(e.id)) map.set(e.id, e); });
  return Array.from(map.values());
}

function mergeStrings(remoteList, localList, deletedIds) {
  const set = new Set();
  (remoteList || []).forEach((s) => { if (!deletedIds.has(s)) set.add(s); });
  (localList || []).forEach((s) => { if (!deletedIds.has(s)) set.add(s); });
  return Array.from(set);
}

// Same rationale as Portia: comparing timestamps and letting the "newer"
// side win wholesale can silently erase an addition made from the other
// device between syncs. Merging by id lets concurrent adds from both
// devices survive; deletedIds stops a stale copy from resurrecting a delete.
function mergeRemoteAndLocal(remote, local) {
  const deletedIds = new Set([...(remote.deletedIds || []), ...(local.deletedIds || [])]);
  return {
    items: mergeById(remote.items, local.items, deletedIds),
    extraCats: mergeStrings(remote.extraCats, local.extraCats, new Set()),
    ovCollapsed: { ...remote.ovCollapsed, ...local.ovCollapsed },
    deletedIds: Array.from(deletedIds),
  };
}

function readLocalOrSeed() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return normalizeData(JSON.parse(raw)); } catch (e) { /* fall through */ }
  }
  const seeded = seedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

let cache = readLocalOrSeed();
let onRemoteChange = null; // set by app.js to re-render when another device pushes

let resolveReady;
const readyPromise = new Promise((resolve) => { resolveReady = resolve; });

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function pushToRemote(data, ts) {
  if (!supabaseClient) return Promise.resolve();
  const updatedAt = new Date(ts || Date.now()).toISOString();
  return supabaseClient
    .from(TABLE)
    .upsert({ id: ROW_ID, data, updated_at: updatedAt })
    .then(({ error }) => { if (error) console.warn('Supabase push failed', error); })
    .catch((e) => console.warn('Supabase push failed', e));
}

async function fetchRemoteRow() {
  const { data: row, error } = await supabaseClient
    .from(TABLE)
    .select('data, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  return { data: normalizeData(row.data), updatedAt: row.updated_at };
}

async function pushWithRetry(baseline) {
  const MAX_ATTEMPTS = 6;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let merged = baseline;
    let expectedUpdatedAt = null;
    let remoteData = null;
    try {
      const remote = await fetchRemoteRow();
      if (remote) {
        merged = mergeRemoteAndLocal(remote.data, baseline);
        expectedUpdatedAt = remote.updatedAt;
        remoteData = remote.data;
      }
    } catch (e) {
      console.warn('Supabase pull-before-push failed, pushing local as-is', e);
    }

    cache = merged;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) {
      console.warn('localStorage save failed (quota?), relying on Supabase', e);
    }

    if (remoteData && JSON.stringify(merged) === JSON.stringify(remoteData)) return;

    const now = new Date().toISOString();
    if (expectedUpdatedAt == null) {
      await pushToRemote(merged, Date.now());
      return;
    }

    const { data: rows, error } = await supabaseClient
      .from(TABLE)
      .update({ data: merged, updated_at: now })
      .eq('id', ROW_ID)
      .eq('updated_at', expectedUpdatedAt)
      .select('id');
    if (error) { console.warn('Supabase push failed', error); return; }
    if (rows && rows.length > 0) return;
    // else: another device won the race — loop and re-merge against the newer remote state.
  }
  console.warn('Supabase push gave up after repeated concurrent-write conflicts; local change is saved and will sync on the next write.');
}

async function syncFromRemote() {
  if (!supabaseClient) { resolveReady(); return; }
  try {
    await pushWithRetry(cache);
  } catch (e) {
    console.warn('Supabase sync failed, using local cache', e);
  } finally {
    resolveReady();
  }
}
syncFromRemote();

// Live cross-device sync: when another device's write lands in Postgres,
// pull it in and merge immediately instead of waiting for this device's
// next own write (which is all pushWithRetry alone would give you).
if (supabaseClient) {
  supabaseClient
    .channel('wc_app_data_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${ROW_ID}` }, async (payload) => {
      const incoming = payload.new && payload.new.data ? normalizeData(payload.new.data) : null;
      if (!incoming) return;
      const merged = mergeRemoteAndLocal(incoming, cache);
      if (JSON.stringify(merged) === JSON.stringify(cache)) return;
      cache = merged;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) { /* ignore quota */ }
      if (onRemoteChange) onRemoteChange();
    })
    .subscribe();
}

function loadData() { return cache; }

let pushChain = Promise.resolve();
function mergeAndPush() {
  const baseline = cache;
  pushChain = pushChain.then(async () => { if (supabaseClient) await pushWithRetry(baseline); });
  return pushChain;
}

function saveData(data) {
  cache = data;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {
    console.warn('localStorage save failed (quota?), relying on Supabase', e);
  }
  mergeAndPush();
}

const Data = {
  ready: readyPromise,
  onRemoteChange(fn) { onRemoteChange = fn; },

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

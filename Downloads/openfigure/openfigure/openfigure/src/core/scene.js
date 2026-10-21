// Scene model: a flat, z-ordered node list inside one frame (artboard).
// Node types: asset | shape | text | connector.  Pure data, JSON-serialisable.

export const SCHEMA = 1;
let counter = 0;
export const uid = (prefix = 'n') =>
  `${prefix}_${Math.random().toString(36).slice(2, 7)}${(counter++).toString(36)}`;

export function createDocument({ width = 1200, height = 800, title = 'Untitled figure', background = '#ffffff' } = {}) {
  return { schema: SCHEMA, title, frame: { width, height, background }, nodes: [] };
}

export function createAssetNode(asset, { x = 0, y = 0, scale = 1 } = {}) {
  return {
    id: uid('a'), type: 'asset', assetId: asset.id, assetVersion: asset.version ?? 1,
    x, y, w: asset.w * scale, h: asset.h * scale, rotation: 0, flipX: false,
    overrides: {}, label: '', labelPos: 'below', group: null, locked: false, hidden: false,
  };
}

export function createShapeNode(kind, { x = 0, y = 0, w = 120, h = 80, fill = '#e8eefc', stroke = '#2f3b52', strokeWidth = 2 } = {}) {
  return { id: uid('s'), type: 'shape', kind, x, y, w, h, rotation: 0, fill, stroke, strokeWidth, label: '', group: null, locked: false, hidden: false };
}

export function createTextNode(text = 'Label', { x = 0, y = 0, fontSize = 20, fill = '#1b2330', align = 'middle', bold = false } = {}) {
  return { id: uid('t'), type: 'text', text, x, y, fontSize, fill, align, bold, rotation: 0, group: null, locked: false, hidden: false };
}

// semantic: activates | inhibits | binds | translocates | plain
export function createConnector(from, to, { semantic = 'activates', routing = 'straight', label = '', color = '#2f3b52', width = 2.5 } = {}) {
  return { id: uid('c'), type: 'connector', from, to, semantic, routing, label, color, width, group: null, locked: false, hidden: false };
}

export const findNode = (doc, id) => doc.nodes.find((n) => n.id === id);

export function validateDocument(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') return ['document is not an object'];
  if (doc.schema !== SCHEMA) errors.push(`unsupported schema ${doc.schema}`);
  if (!doc.frame || !(doc.frame.width > 0) || !(doc.frame.height > 0)) errors.push('frame size invalid');
  if (!Array.isArray(doc.nodes)) return [...errors, 'nodes must be an array'];
  const ids = new Set();
  for (const n of doc.nodes) {
    if (ids.has(n.id)) errors.push(`duplicate id ${n.id}`);
    ids.add(n.id);
  }
  for (const n of doc.nodes) {
    if (n.type === 'connector') {
      for (const end of ['from', 'to']) {
        const e = n[end];
        if (!e) errors.push(`connector ${n.id} missing ${end}`);
        else if (e.node && !ids.has(e.node)) errors.push(`connector ${n.id} ${end} references missing node ${e.node}`);
      }
    }
  }
  return errors;
}

// ---- Document store with undo/redo (snapshot based; fine for figure-sized docs) ----
export class Store {
  constructor(doc = createDocument(), { limit = 100 } = {}) {
    this.doc = doc; this.limit = limit; this.past = []; this.future = []; this.listeners = new Set(); this._lastKey = null; this._lastAt = 0;
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const fn of this.listeners) fn(this.doc); }
  // mutate(fn) receives a draft clone; coalesceKey merges rapid edits (drags, slider moves) into one undo step.
  apply(mutate, { coalesceKey = null, now = Date.now() } = {}) {
    const draft = structuredClone(this.doc);
    mutate(draft);
    const merge = coalesceKey && coalesceKey === this._lastKey && now - this._lastAt < 800;
    if (!merge) { this.past.push(this.doc); if (this.past.length > this.limit) this.past.shift(); }
    this.doc = draft; this.future = []; this._lastKey = coalesceKey; this._lastAt = now;
    this._emit();
    return draft;
  }
  replace(doc) { this.doc = doc; this.past = []; this.future = []; this._lastKey = null; this._emit(); }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  undo() { if (!this.past.length) return false; this.future.push(this.doc); this.doc = this.past.pop(); this._lastKey = null; this._emit(); return true; }
  redo() { if (!this.future.length) return false; this.past.push(this.doc); this.doc = this.future.pop(); this._lastKey = null; this._emit(); return true; }
}

// ---- Editing helpers (all operate on a draft document inside Store.apply) ----
export function removeNodes(doc, ids) {
  const set = new Set(ids);
  doc.nodes = doc.nodes.filter((n) => !set.has(n.id) && !(n.type === 'connector' && (set.has(n.from?.node) || set.has(n.to?.node))));
}

export function duplicateNodes(doc, ids, offset = 24) {
  const map = new Map(); const copies = [];
  for (const n of doc.nodes) if (ids.includes(n.id) && n.type !== 'connector') {
    const c = structuredClone(n); c.id = uid(n.type[0]); c.x += offset; c.y += offset; map.set(n.id, c.id); copies.push(c);
  }
  for (const n of doc.nodes) if (n.type === 'connector' && map.has(n.from?.node) && map.has(n.to?.node)) {
    const c = structuredClone(n); c.id = uid('c'); c.from.node = map.get(n.from.node); c.to.node = map.get(n.to.node); copies.push(c);
  }
  doc.nodes.push(...copies);
  return copies.map((c) => c.id);
}

export function reorder(doc, ids, where) {
  const set = new Set(ids);
  const picked = doc.nodes.filter((n) => set.has(n.id));
  const rest = doc.nodes.filter((n) => !set.has(n.id));
  if (where === 'front') doc.nodes = [...rest, ...picked];
  else if (where === 'back') doc.nodes = [...picked, ...rest];
  else {
    const step = where === 'forward' ? 1 : -1;
    const arr = [...doc.nodes];
    const idxs = arr.map((n, i) => (set.has(n.id) ? i : -1)).filter((i) => i >= 0);
    if (step > 0) idxs.reverse();
    for (const i of idxs) { const j = i + step; if (j < 0 || j >= arr.length || set.has(arr[j].id)) continue; [arr[i], arr[j]] = [arr[j], arr[i]]; }
    doc.nodes = arr;
  }
}

export function groupNodes(doc, ids) {
  const g = uid('g');
  for (const n of doc.nodes) if (ids.includes(n.id)) n.group = g;
  return g;
}
export function ungroupNodes(doc, ids) { for (const n of doc.nodes) if (ids.includes(n.id)) n.group = null; }

// Expand a selection so that picking one group member picks the whole group.
export function expandGroups(doc, ids) {
  const groups = new Set(doc.nodes.filter((n) => ids.includes(n.id) && n.group).map((n) => n.group));
  return doc.nodes.filter((n) => ids.includes(n.id) || (n.group && groups.has(n.group))).map((n) => n.id);
}

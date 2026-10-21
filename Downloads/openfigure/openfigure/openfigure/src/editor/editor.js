import {
  Store, createDocument, createAssetNode, createShapeNode, createTextNode, createConnector, findNode,
  removeNodes, duplicateNodes, reorder, groupNodes, ungroupNodes, expandGroups, validateDocument,
  nodeBounds, unionBounds, snapBox, alignNodes, distributeNodes, nearestPort, portPoint, renderDocument, resolveConnector, DEFAULT_PORTS,
} from '../core/index.js';
import { library, searchAssets, assetSvg, DOMAINS } from '../assets/index.js';

const $ = (s) => document.querySelector(s);
const KEY = 'openfigure:autosave:v1';
const store = new Store(load() ?? createDocument());
const ui = { sel: new Set(), tool: 'select', zoom: 1, snap: true, grid: true, guides: [], marquee: null, pendingFrom: null, domain: null, query: '' };

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); return d && !validateDocument(d).length ? d : null; } catch { return null; }
}
let saveTimer;
function autosave() {
  $('#save-status').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store.doc)); $('#save-status').textContent = 'Saved'; }
    catch { $('#save-status').textContent = 'Not saved (storage blocked)'; }
  }, 400);
}

// ---------- coordinate helpers ----------
const wrap = $('#canvas-wrap');
function svgEl() { return wrap.querySelector('svg'); }
function toDoc(ev) {
  const svg = svgEl(); const m = svg.getScreenCTM().inverse();
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m);
  return { x: p.x, y: p.y };
}
const selNodes = () => store.doc.nodes.filter((n) => ui.sel.has(n.id));
function setSel(ids) { ui.sel = new Set(expandGroups(store.doc, [...ids])); renderAll(); }

// ---------- rendering ----------
function overlay() {
  const doc = store.doc; let o = '';
  const nodes = selNodes();
  for (const n of nodes) {
    if (n.type === 'connector') {
      const rc = resolveConnector(doc, n, library);
      if (rc) o += `<path d="${rc.route.d}" fill="none" stroke="var(--accent,#2f6fed)" stroke-opacity=".35" stroke-width="${n.width + 8}" stroke-linecap="round" pointer-events="none"/>`;
    } else {
      const b = nodeBounds(n);
      o += `<rect x="${b.x - 3}" y="${b.y - 3}" width="${b.w + 6}" height="${b.h + 6}" fill="none" stroke="#2f6fed" stroke-width="1.5" stroke-dasharray="${nodes.length > 1 ? '4 3' : '0'}" pointer-events="none"/>`;
    }
  }
  const boxes = nodes.filter((n) => n.type !== 'connector');
  if (boxes.length === 1 && boxes[0].type !== 'text' && !boxes[0].locked) {
    const n = boxes[0], b = nodeBounds(n);
    const h = 9 / ui.zoom;
    o += `<rect data-handle="se" x="${n.x + n.w - h / 2}" y="${n.y + n.h - h / 2}" width="${h}" height="${h}" fill="#fff" stroke="#2f6fed" stroke-width="1.5" style="cursor:nwse-resize"/>`;
    o += `<line x1="${b.x + b.w / 2}" y1="${b.y - 3}" x2="${b.x + b.w / 2}" y2="${b.y - 22 / ui.zoom}" stroke="#2f6fed" pointer-events="none"/><circle data-handle="rot" cx="${b.x + b.w / 2}" cy="${b.y - 22 / ui.zoom}" r="${5 / ui.zoom}" fill="#fff" stroke="#2f6fed" stroke-width="1.5" style="cursor:grab"/>`;
  }
  for (const g of ui.guides) o += g.axis === 'x'
    ? `<line x1="${g.at}" y1="0" x2="${g.at}" y2="${doc.frame.height}" stroke="#e5484d" stroke-width="1" stroke-dasharray="4 3" pointer-events="none"/>`
    : `<line x1="0" y1="${g.at}" x2="${doc.frame.width}" y2="${g.at}" stroke="#e5484d" stroke-width="1" stroke-dasharray="4 3" pointer-events="none"/>`;
  if (ui.marquee) { const m = ui.marquee; o += `<rect x="${Math.min(m.x1, m.x2)}" y="${Math.min(m.y1, m.y2)}" width="${Math.abs(m.x2 - m.x1)}" height="${Math.abs(m.y2 - m.y1)}" fill="#2f6fed" fill-opacity=".08" stroke="#2f6fed" pointer-events="none"/>`; }
  if (ui.pendingFrom) { const n = findNode(doc, ui.pendingFrom); if (n) { const b = nodeBounds(n); o += `<rect x="${b.x - 4}" y="${b.y - 4}" width="${b.w + 8}" height="${b.h + 8}" fill="none" stroke="#12a150" stroke-width="2" stroke-dasharray="5 3" pointer-events="none"/>`; } }
  return o;
}
function renderCanvas() {
  const doc = store.doc;
  let svg = renderDocument(doc, library, { editor: true, grid: ui.grid });
  svg = svg.replace(/width="(\d+)" height="(\d+)" role/, `width="${doc.frame.width * ui.zoom}" height="${doc.frame.height * ui.zoom}" role`);
  svg = svg.replace('</svg>', `<g id="overlay">${overlay()}</g></svg>`);
  wrap.innerHTML = svg;
  $('#zoom-label').textContent = `${Math.round(ui.zoom * 100)}%`;
}

function renderInspector() {
  const el = $('#inspector'); const doc = store.doc; const nodes = selNodes();
  const num = (label, key, n, step = 1) => `<div class="row"><label for="i-${key}">${label}</label><input id="i-${key}" type="number" step="${step}" data-k="${key}" value="${Math.round((n[key] ?? 0) * 100) / 100}"></div>`;
  let h = '';
  if (!nodes.length) {
    h = `<h3>Figure</h3>
<div class="row"><label for="f-w">Width</label><input id="f-w" type="number" data-f="width" value="${doc.frame.width}"></div>
<div class="row"><label for="f-h">Height</label><input id="f-h" type="number" data-f="height" value="${doc.frame.height}"></div>
<div class="row"><label for="f-bg">Background</label><input id="f-bg" type="color" data-f="background" value="${doc.frame.background}"></div>
<div class="row"><label for="f-p">Preset</label><select id="f-p"><option value="">Choose…</option><option value="1200x800">Slide 3:2</option><option value="1920x1080">Slide 16:9</option><option value="1050x700">Journal 2-column (≈178 mm)</option><option value="520x520">Journal 1-column (≈89 mm)</option><option value="1000x1000">Square</option></select></div>
<p class="hint">Select an object to edit it. Shortcuts: V select, C connect, T text, K region, Del delete, Ctrl+D duplicate, Ctrl+G group, [ ] reorder, arrows nudge.</p>`;
  } else if (nodes.length > 1) {
    h = `<h3>${nodes.length} objects</h3><div class="btns">${['left', 'center', 'right', 'top', 'middle', 'bottom'].map((m) => `<button data-align="${m}">Align ${m}</button>`).join('')}<button data-dist="h">Distribute H</button><button data-dist="v">Distribute V</button></div>
<div class="btns"><button data-act="group">Group</button><button data-act="ungroup">Ungroup</button></div>${arrange()}<div class="sec"><button class="danger" data-act="delete">Delete</button></div>`;
  } else {
    const n = nodes[0];
    h = `<h3>${n.type === 'asset' ? library.get(n.assetId)?.name ?? n.assetId : n.type}</h3>`;
    if (n.type === 'connector') {
      h += `<div class="row"><label for="c-s">Meaning</label><select id="c-s" data-k="semantic">${['activates', 'inhibits', 'binds', 'translocates', 'plain'].map((s) => `<option ${s === n.semantic ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
<div class="row"><label for="c-r">Routing</label><select id="c-r" data-k="routing">${['straight', 'elbow', 'curved'].map((s) => `<option ${s === n.routing ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
<div class="row"><label for="c-l">Label</label><input id="c-l" type="text" data-k="label" value="${esc(n.label)}"></div>
<div class="row"><label for="c-c">Colour</label><input id="c-c" type="color" data-k="color" value="${n.color}"></div>
${num('Width', 'width', n, 0.5)}`;
      for (const end of ['from', 'to']) if (n[end].node) h += `<div class="row"><label for="p-${end}">${end} port</label><select id="p-${end}" data-port="${end}">${['auto', 'north', 'south', 'east', 'west'].map((p) => `<option ${p === (n[end].port ?? 'auto') ? 'selected' : ''}>${p}</option>`).join('')}</select></div>`;
    } else if (n.type === 'text') {
      h += `<div class="row"><label for="t-t">Text</label><textarea id="t-t" rows="3" data-k="text">${esc(n.text)}</textarea></div>${num('Size', 'fontSize', n)}
<div class="row"><label for="t-c">Colour</label><input id="t-c" type="color" data-k="fill" value="${n.fill}"></div>
<div class="row"><label for="t-a">Align</label><select id="t-a" data-k="align">${['start', 'middle', 'end'].map((s) => `<option ${s === n.align ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
<div class="row"><label for="t-b">Bold</label><input id="t-b" type="checkbox" data-kb="bold" ${n.bold ? 'checked' : ''}></div>${num('X', 'x', n)}${num('Y', 'y', n)}`;
    } else {
      h += `<div class="row"><label for="l-l">Label</label><input id="l-l" type="text" data-k="label" value="${esc(n.label)}"></div>${num('X', 'x', n)}${num('Y', 'y', n)}${num('Width', 'w', n)}${num('Height', 'h', n)}${num('Rotation', 'rotation', n)}`;
      if (n.type === 'asset') {
        const a = library.get(n.assetId);
        h += `<div class="row"><label for="lp">Label at</label><select id="lp" data-k="labelPos">${['below', 'above', 'right'].map((s) => `<option ${s === (n.labelPos ?? 'below') ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="row"><label for="fx">Flip</label><input id="fx" type="checkbox" data-kb="flipX" ${n.flipX ? 'checked' : ''}></div>`;
        if (a) { h += '<div class="sec"><h3>Parts</h3>'; for (const [p, def] of Object.entries(a.parts)) h += `<div class="row"><label for="p-${p}">${p}</label><input id="p-${p}" type="color" data-part="${p}" value="${n.overrides?.[p] ?? def}"><button data-reset="${p}" aria-label="Reset ${p}">↺</button></div>`; h += '</div>'; }
      } else {
        h += `<div class="row"><label for="s-f">Fill</label><input id="s-f" type="color" data-k="fill" value="${n.fill}"></div><div class="row"><label for="s-s">Stroke</label><input id="s-s" type="color" data-k="stroke" value="${n.stroke}"></div>${num('Stroke w', 'strokeWidth', n, 0.5)}`;
      }
    }
    h += `<div class="sec">${arrange()}<div class="btns"><button data-act="duplicate">Duplicate</button><button data-act="lock">${n.locked ? 'Unlock' : 'Lock'}</button><button class="danger" data-act="delete">Delete</button></div></div>`;
  }
  el.innerHTML = h;
}
const arrange = () => `<div class="btns"><button data-ord="front">To front</button><button data-ord="forward">Forward</button><button data-ord="backward">Backward</button><button data-ord="back">To back</button></div>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderLibrary() {
  const list = searchAssets(ui.query, { domain: ui.domain });
  $('#assets').innerHTML = list.map((a) => `<div class="asset" role="listitem" tabindex="0" draggable="true" data-asset="${a.id}" title="${esc(a.name)}">${assetSvg(a.id)}<span>${esc(a.name)}</span></div>`).join('') || '<p class="hint">No matches.</p>';
}
function renderDomains() {
  $('#domains').innerHTML = [['', 'All'], ...DOMAINS.map((d) => [d, d.replace(/-/g, ' ')])].map(([d, l]) => `<button class="chip ${ (ui.domain ?? '') === d ? 'active' : ''}" data-domain="${d}">${l}</button>`).join('');
}
function renderChrome() {
  $('#undo').disabled = !store.canUndo; $('#redo').disabled = !store.canRedo;
  document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === ui.tool));
  if ($('#title') !== document.activeElement) $('#title').value = store.doc.title;
}
function renderAll() { renderCanvas(); renderInspector(); renderChrome(); }
let skipInspector = false;
store.subscribe(() => { ui.sel = new Set([...ui.sel].filter((id) => findNode(store.doc, id))); renderCanvas(); if (!skipInspector) renderInspector(); renderChrome(); autosave(); });

// ---------- adding things ----------
function addAsset(id, at) {
  const a = library.get(id); if (!a) return;
  const f = store.doc.frame;
  const x = at ? at.x - a.w / 2 : f.width / 2 - a.w / 2 + (store.doc.nodes.length % 5) * 18;
  const y = at ? at.y - a.h / 2 : f.height / 2 - a.h / 2 + (store.doc.nodes.length % 5) * 18;
  const node = createAssetNode(a, { x, y });
  store.apply((d) => d.nodes.push(node));
  setSel([node.id]);
}

// ---------- pointer interaction ----------
let drag = null;
wrap.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0) return;
  const p = toDoc(ev); const doc = store.doc;
  const handle = ev.target.closest?.('[data-handle]')?.dataset.handle;
  const hit = ev.target.closest?.('[data-id]'); const node = hit ? findNode(doc, hit.dataset.id) : null;

  if (ui.tool === 'text') {
    const t = createTextNode('Text', { x: p.x, y: p.y }); store.apply((d) => d.nodes.push(t)); ui.tool = 'select'; setSel([t.id]);
    queueMicrotask(() => $('#t-t')?.select()); return;
  }
  if (ui.tool === 'compartment') { drag = { kind: 'region', start: p, id: null }; return; }
  if (ui.tool === 'connect') {
    if (!node || node.type === 'connector') { ui.pendingFrom = null; renderCanvas(); return; }
    if (!ui.pendingFrom) { ui.pendingFrom = node.id; renderCanvas(); return; }
    if (ui.pendingFrom === node.id) return;
    const c = createConnector({ node: ui.pendingFrom, port: 'auto' }, { node: node.id, port: 'auto' }, { semantic: $('#semantic').value, routing: $('#routing').value });
    ui.pendingFrom = null; store.apply((d) => d.nodes.push(c)); setSel([c.id]); return;
  }
  // select tool
  if (handle && selNodes().length === 1) {
    const n = selNodes()[0]; drag = { kind: handle, id: n.id, start: p, orig: structuredClone(n) }; ev.preventDefault(); return;
  }
  if (node && !node.locked) {
    if (ev.shiftKey) { const s = new Set(ui.sel); const ids = expandGroups(doc, [node.id]); const on = ids.every((i) => s.has(i)); ids.forEach((i) => (on ? s.delete(i) : s.add(i))); ui.sel = s; renderAll(); return; }
    if (!ui.sel.has(node.id)) setSel([node.id]);
    drag = { kind: 'move', start: p, orig: new Map(selNodes().filter((n) => n.type !== 'connector').map((n) => [n.id, { x: n.x, y: n.y }])), moved: false };
    ev.preventDefault();
  } else {
    if (!ev.shiftKey) { ui.sel = new Set(); }
    drag = { kind: 'marquee', start: p }; ui.marquee = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; renderAll();
  }
});
window.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const p = toDoc(ev); const dx = p.x - drag.start.x, dy = p.y - drag.start.y; const doc = store.doc;
  if (drag.kind === 'marquee') { ui.marquee.x2 = p.x; ui.marquee.y2 = p.y; renderCanvas(); return; }
  if (drag.kind === 'region') {
    if (!drag.id) { const r = createShapeNode('compartment', { x: drag.start.x, y: drag.start.y, w: 10, h: 10, fill: '#dfe9fb', stroke: '#6b7fa6', strokeWidth: 2 }); r.label = 'Compartment'; drag.id = r.id; store.apply((d) => { d.nodes.unshift(r); }); }
    store.apply((d) => { const n = findNode(d, drag.id); n.x = Math.min(drag.start.x, p.x); n.y = Math.min(drag.start.y, p.y); n.w = Math.max(20, Math.abs(dx)); n.h = Math.max(20, Math.abs(dy)); }, { coalesceKey: 'region' }); return;
  }
  if (drag.kind === 'move') {
    if (!drag.moved && Math.hypot(dx, dy) < 3) return; drag.moved = true;
    let sx = dx, sy = dy; ui.guides = [];
    if (ui.snap && !ev.altKey) {
      const movingIds = new Set(drag.orig.keys());
      const first = [...movingIds].map((id) => findNode(doc, id)); const orig = first.map((n) => ({ ...n, ...drag.orig.get(n.id) }));
      const u = unionBounds(orig.map(nodeBounds));
      const others = doc.nodes.filter((n) => !movingIds.has(n.id) && n.type !== 'connector' && !n.hidden).map(nodeBounds);
      const s = snapBox({ x: u.x + dx, y: u.y + dy, w: u.w, h: u.h }, others, { threshold: 6 / ui.zoom, frame: doc.frame });
      sx += s.dx; sy += s.dy; ui.guides = s.guides;
    }
    store.apply((d) => { for (const [id, o] of drag.orig) { const n = findNode(d, id); if (n) { n.x = o.x + sx; n.y = o.y + sy; } } }, { coalesceKey: 'move' });
    return;
  }
  if (drag.kind === 'se') {
    const o = drag.orig; const asset = o.type === 'asset' && !ev.shiftKey; const ratio = o.w / o.h;
    store.apply((d) => { const n = findNode(d, drag.id); let w = Math.max(10, o.w + dx), h = Math.max(10, o.h + dy); if (asset) h = w / ratio; n.w = w; n.h = h; }, { coalesceKey: 'resize' }); return;
  }
  if (drag.kind === 'rot') {
    const o = drag.orig; const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    let deg = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90; if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
    store.apply((d) => { findNode(d, drag.id).rotation = Math.round(deg * 10) / 10; }, { coalesceKey: 'rotate' });
  }
});
window.addEventListener('pointerup', () => {
  if (!drag) return;
  if (drag.kind === 'marquee' && ui.marquee) {
    const m = ui.marquee; const r = { x: Math.min(m.x1, m.x2), y: Math.min(m.y1, m.y2), w: Math.abs(m.x2 - m.x1), h: Math.abs(m.y2 - m.y1) };
    ui.marquee = null;
    if (r.w > 3 || r.h > 3) {
      const ids = store.doc.nodes.filter((n) => n.type !== 'connector' && !n.hidden && !n.locked).filter((n) => { const b = nodeBounds(n); return b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h; }).map((n) => n.id);
      setSel([...ui.sel, ...ids]);
    } else renderAll();
  }
  if (drag.kind === 'region') { ui.tool = 'select'; if (drag.id) setSel([drag.id]); renderChrome(); }
  ui.guides = []; drag = null; renderCanvas();
});
wrap.addEventListener('dblclick', (ev) => {
  const hit = ev.target.closest?.('[data-id]'); if (!hit) return;
  const n = findNode(store.doc, hit.dataset.id); if (!n) return;
  setSel([n.id]); (document.querySelector('#t-t') ?? document.querySelector('#l-l') ?? document.querySelector('#c-l'))?.focus();
});

// ---------- library interactions ----------
$('#search').addEventListener('input', (e) => { ui.query = e.target.value; renderLibrary(); });
$('#domains').addEventListener('click', (e) => { const b = e.target.closest('[data-domain]'); if (!b) return; ui.domain = b.dataset.domain || null; renderDomains(); renderLibrary(); });
$('#assets').addEventListener('click', (e) => { const a = e.target.closest('[data-asset]'); if (a) addAsset(a.dataset.asset); });
$('#assets').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const a = e.target.closest('[data-asset]'); if (a) { e.preventDefault(); addAsset(a.dataset.asset); } } });
$('#assets').addEventListener('dragstart', (e) => { const a = e.target.closest('[data-asset]'); if (a) e.dataTransfer.setData('text/x-openfigure-asset', a.dataset.asset); });
wrap.addEventListener('dragover', (e) => e.preventDefault());
wrap.addEventListener('drop', (e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/x-openfigure-asset'); if (id) addAsset(id, toDoc(e)); });

// ---------- inspector edits ----------
const insp = $('#inspector');
function edit(fn, key) { skipInspector = true; store.apply((d) => { for (const id of ui.sel) { const n = findNode(d, id); if (n) fn(n, d); } }, { coalesceKey: key }); skipInspector = false; }
insp.addEventListener('input', (e) => {
  const t = e.target; const k = t.dataset.k, part = t.dataset.part, f = t.dataset.f;
  if (f) { const v = t.type === 'number' ? Math.max(50, +t.value || 50) : t.value; skipInspector = true; store.apply((d) => { d.frame[f] = v; }, { coalesceKey: 'frame-' + f }); skipInspector = false; return; }
  if (k) edit((n) => { n[k] = t.type === 'number' ? +t.value : t.value; }, 'i-' + k);
  else if (t.dataset.kb) edit((n) => { n[t.dataset.kb] = t.checked; });
  else if (part) edit((n) => { n.overrides = { ...n.overrides, [part]: t.value }; }, 'part-' + part);
  else if (t.dataset.port) edit((n) => { n[t.dataset.port].port = t.value; });
});
insp.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'f-p' && t.value) { const [w, h] = t.value.split('x').map(Number); store.apply((d) => { d.frame.width = w; d.frame.height = h; }); }
  if (t.dataset.k || t.dataset.part || t.dataset.f) renderInspector();
});
insp.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return; const ids = [...ui.sel];
  if (b.dataset.ord) store.apply((d) => reorder(d, ids, b.dataset.ord));
  else if (b.dataset.align) store.apply((d) => alignNodes(ids.map((i) => findNode(d, i)).filter((n) => n.type !== 'connector'), b.dataset.align));
  else if (b.dataset.dist) store.apply((d) => distributeNodes(ids.map((i) => findNode(d, i)).filter((n) => n.type !== 'connector'), b.dataset.dist));
  else if (b.dataset.reset) edit((n) => { const o = { ...n.overrides }; delete o[b.dataset.reset]; n.overrides = o; }), renderInspector();
  else if (b.dataset.act) act(b.dataset.act);
});
function act(a) {
  const ids = [...ui.sel];
  if (a === 'delete' && ids.length) { store.apply((d) => removeNodes(d, ids)); ui.sel = new Set(); renderAll(); }
  if (a === 'duplicate' && ids.length) { let nid = []; store.apply((d) => { nid = duplicateNodes(d, ids); }); setSel(nid); }
  if (a === 'group' && ids.length > 1) store.apply((d) => groupNodes(d, ids));
  if (a === 'ungroup') store.apply((d) => ungroupNodes(d, ids));
  if (a === 'lock') { edit((n) => { n.locked = !n.locked; }); renderInspector(); }
}

// ---------- toolbar ----------
document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => { ui.tool = b.dataset.tool; ui.pendingFrom = null; renderChrome(); renderCanvas(); }));
$('#undo').onclick = () => store.undo(); $('#redo').onclick = () => store.redo();
$('#snap').onchange = (e) => { ui.snap = e.target.checked; };
$('#grid').onchange = (e) => { ui.grid = e.target.checked; renderCanvas(); };
$('#zoom-in').onclick = () => zoom(1.2); $('#zoom-out').onclick = () => zoom(1 / 1.2);
function fit() { const st = $('#stage'); ui.zoom = Math.min(1, Math.max(0.2, (st.clientWidth - 70) / store.doc.frame.width)); }
function zoom(f) { ui.zoom = Math.min(4, Math.max(0.2, ui.zoom * f)); renderCanvas(); }
$('#title').addEventListener('input', (e) => store.apply((d) => { d.title = e.target.value; }, { coalesceKey: 'title' }));
$('#semantic').onchange = (e) => { const n = selNodes(); if (n.length === 1 && n[0].type === 'connector') edit((c) => { c.semantic = e.target.value; }); };
$('#routing').onchange = (e) => { const n = selNodes(); if (n.length === 1 && n[0].type === 'connector') edit((c) => { c.routing = e.target.value; }); };

function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
const fname = () => (store.doc.title || 'figure').replace(/[^\w.-]+/g, '_');
$('#btn-svg').onclick = () => download(fname() + '.svg', new Blob([renderDocument(store.doc, library)], { type: 'image/svg+xml' }));
$('#btn-png').onclick = async () => {
  const scale = +$('#png-scale').value; const { width, height } = store.doc.frame;
  const svg = renderDocument(store.doc, library); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image(); img.onload = () => {
    const c = document.createElement('canvas'); c.width = width * scale; c.height = height * scale;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    c.toBlob((b) => download(fname() + `@${scale}x.png`, b), 'image/png');
  }; img.src = url;
};
$('#btn-save').onclick = () => download(fname() + '.openfigure.json', new Blob([JSON.stringify(store.doc, null, 2)], { type: 'application/json' }));
$('#btn-open').onclick = () => $('#file').click();
$('#file').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const d = JSON.parse(await f.text()); const errs = validateDocument(d); if (errs.length) throw new Error(errs.join('; ')); store.replace(d); ui.sel = new Set(); fit(); renderAll(); }
  catch (err) { alert('Could not open file: ' + err.message); }
  e.target.value = '';
};
$('#btn-example').onclick = async () => {
  try { const r = await fetch('../../examples/mapk-pathway.json'); store.replace(await r.json()); ui.sel = new Set(); fit(); renderAll(); } catch { alert('Example needs the dev server: npm run serve'); }
};

// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? '');
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); store.redo(); return; }
  if (typing) return;
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); act('duplicate'); return; }
  if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); act(e.shiftKey ? 'ungroup' : 'group'); return; }
  if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); setSel(store.doc.nodes.filter((n) => n.type !== 'connector').map((n) => n.id)); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('delete'); return; }
  if (e.key === 'Escape') { ui.pendingFrom = null; ui.tool = 'select'; ui.sel = new Set(); renderAll(); return; }
  if (e.key === '[' || e.key === ']') { const ids = [...ui.sel]; if (ids.length) store.apply((d) => reorder(d, ids, e.key === ']' ? (mod ? 'front' : 'forward') : (mod ? 'back' : 'backward'))); return; }
  if (e.key.startsWith('Arrow') && ui.sel.size) {
    e.preventDefault(); const s = e.shiftKey ? 10 : 1; const [dx, dy] = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    edit((n) => { if (n.type !== 'connector') { n.x += dx; n.y += dy; } }, 'nudge'); return;
  }
  const tools = { v: 'select', c: 'connect', t: 'text', k: 'compartment' };
  if (!mod && tools[e.key.toLowerCase()]) { ui.tool = tools[e.key.toLowerCase()]; ui.pendingFrom = null; renderChrome(); renderCanvas(); return; }
  if (e.key === '=' || e.key === '+') zoom(1.2); if (e.key === '-') zoom(1 / 1.2);
});

fit(); renderDomains(); renderLibrary(); renderAll();
window.__openfigure = { store, ui, library, addAsset, setSel }; // handy for tests and plugins

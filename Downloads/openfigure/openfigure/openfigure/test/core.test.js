import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Store, createDocument, createAssetNode, createConnector, createShapeNode, createTextNode, validateDocument,
  removeNodes, duplicateNodes, reorder, groupNodes, expandGroups, nodeBounds, portPoint, snapBox, alignNodes, distributeNodes,
  routeConnector, renderSvg, library, ASSETS, searchAssets, assetSvg, DOMAINS, resolveConnector,
} from '../src/index.js';
import { duplicateAttributes, unbalanced } from './helpers.js';

const mk = () => { const d = createDocument(); const a = createAssetNode(library.get('cell-animal'), { x: 100, y: 100 }); const b = createAssetNode(library.get('immuno-antibody'), { x: 400, y: 120 }); d.nodes.push(a, b); return { d, a, b }; };

test('document validates and detects broken connector references', () => {
  const { d, a, b } = mk();
  d.nodes.push(createConnector({ node: a.id }, { node: b.id }));
  assert.deepEqual(validateDocument(d), []);
  d.nodes.push(createConnector({ node: 'ghost' }, { node: b.id }));
  assert.match(validateDocument(d).join(), /missing node ghost/);
  assert.match(validateDocument({ schema: 99, frame: { width: 1, height: 1 }, nodes: [] }).join(), /schema/);
});

test('store: undo/redo, coalescing and branch truncation', () => {
  const s = new Store(createDocument());
  s.apply((d) => d.nodes.push(createTextNode('a')), { now: 1000 });
  s.apply((d) => { d.nodes[0].x = 1; }, { coalesceKey: 'drag', now: 2000 });
  s.apply((d) => { d.nodes[0].x = 2; }, { coalesceKey: 'drag', now: 2100 });
  s.apply((d) => { d.nodes[0].x = 3; }, { coalesceKey: 'drag', now: 2200 });
  assert.equal(s.past.length, 2, 'three drag steps merge into one undo entry');
  s.undo(); assert.equal(s.doc.nodes[0].x, 0);
  s.redo(); assert.equal(s.doc.nodes[0].x, 3);
  s.undo(); s.apply((d) => d.nodes.push(createTextNode('b')), { now: 9000 });
  assert.equal(s.canRedo, false);
  s.undo(); s.undo(); s.undo(); assert.equal(s.doc.nodes.length, 0);
  assert.equal(s.undo(), false);
});

test('removing a node removes its connectors; duplicating keeps internal connectors only', () => {
  const { d, a, b } = mk(); const c = createConnector({ node: a.id }, { node: b.id }); d.nodes.push(c);
  const dup = structuredClone(d); const ids = duplicateNodes(dup, [a.id, b.id]);
  assert.equal(ids.length, 3); assert.equal(validateDocument(dup).length, 0);
  const one = structuredClone(d); duplicateNodes(one, [a.id]); assert.equal(one.nodes.filter((n) => n.type === 'connector').length, 1);
  removeNodes(d, [a.id]); assert.equal(d.nodes.some((n) => n.type === 'connector'), false);
});

test('z-order and grouping', () => {
  const { d, a, b } = mk();
  reorder(d, [a.id], 'front'); assert.equal(d.nodes.at(-1).id, a.id);
  reorder(d, [a.id], 'backward'); assert.equal(d.nodes[0].id, a.id);
  reorder(d, [a.id], 'back'); assert.equal(d.nodes[0].id, a.id);
  groupNodes(d, [a.id, b.id]); assert.deepEqual(expandGroups(d, [a.id]).sort(), [a.id, b.id].sort());
});

test('bounds, rotation and ports', () => {
  const n = { x: 0, y: 0, w: 100, h: 50, rotation: 90, flipX: false };
  const b = nodeBounds(n);
  assert.ok(Math.abs(b.w - 50) < 1e-6 && Math.abs(b.h - 100) < 1e-6);
  const east = portPoint({ x: 0, y: 0, w: 100, h: 50, rotation: 0 }, 'east');
  assert.deepEqual([east.x, east.y, east.dx], [100, 25, 1]);
  const flipped = portPoint({ x: 0, y: 0, w: 100, h: 50, rotation: 0, flipX: true }, 'east');
  assert.deepEqual([flipped.x, flipped.dx], [0, -1]);
});

test('snapping to edges, centres and frame; no snap beyond threshold', () => {
  const s = snapBox({ x: 103, y: 0, w: 50, h: 50 }, [{ x: 100, y: 200, w: 80, h: 80 }], { threshold: 6 });
  assert.equal(s.dx, -3); assert.equal(s.guides[0].axis, 'x');
  assert.equal(snapBox({ x: 120, y: 5, w: 10, h: 10 }, [], { threshold: 6 }).dx, 0);
  const f = snapBox({ x: 595, y: 300, w: 10, h: 10 }, [], { frame: { width: 1200, height: 800 } });
  assert.equal(f.dx, 0, 'centre x 600 already snapped'); // centre 600
});

test('align and distribute', () => {
  const nodes = [{ x: 0, y: 0, w: 10, h: 10 }, { x: 30, y: 20, w: 10, h: 10 }, { x: 100, y: 5, w: 10, h: 10 }];
  distributeNodes(nodes, 'h'); assert.deepEqual(nodes.map((n) => n.x), [0, 50, 100]);
  alignNodes(nodes, 'top'); assert.deepEqual(nodes.map((n) => n.y), [0, 0, 0]);
});

test('connector routing produces valid paths for all modes', () => {
  const p1 = { x: 0, y: 0, dx: 1, dy: 0 }, p2 = { x: 200, y: 100, dx: -1, dy: 0 };
  for (const mode of ['straight', 'elbow', 'curved']) {
    const r = routeConnector(p1, p2, mode);
    assert.match(r.d, /^M/); assert.ok(Number.isFinite(r.label.x) && Number.isFinite(r.endAngle), mode);
  }
  assert.ok((routeConnector(p1, p2, 'elbow').d.match(/L/g) ?? []).length >= 3);
});

test('connector follows moved node (auto ports) and returns null for dangling', () => {
  const { d, a, b } = mk(); const c = createConnector({ node: a.id, port: 'auto' }, { node: b.id, port: 'auto' }); d.nodes.push(c);
  const r1 = resolveConnector(d, c, library);
  b.y += 300; const r2 = resolveConnector(d, c, library);
  assert.notEqual(r1.route.d, r2.route.d);
  c.to.node = 'ghost'; assert.equal(resolveConnector(d, c, library), null);
});

test('rendering is deterministic, accessible, escaped and well formed', () => {
  const { d, a, b } = mk(); a.label = '<b>&"x"</b>'; d.title = 'T & <T>';
  d.nodes.push(createConnector({ node: a.id }, { node: b.id }, { label: 'A→B' }), createShapeNode('compartment'), createTextNode('hello\nworld'));
  const s1 = renderSvg(d), s2 = renderSvg(d);
  assert.equal(s1, s2);
  assert.match(s1, /<title id="of-title">T &amp; &lt;T&gt;<\/title>/);
  assert.match(s1, /role="img"/); assert.match(s1, /<desc[^>]*>Figure with/);
  assert.ok(!s1.includes('<b>&"x"</b>'));
  assert.deepEqual(duplicateAttributes(s1), []); assert.equal(unbalanced(s1), null);
});

test('missing asset renders a visible placeholder instead of crashing', () => {
  const d = createDocument(); const n = createAssetNode(library.get('cell-animal')); n.assetId = 'nope'; d.nodes.push(n);
  assert.match(renderSvg(d), /missing: nope/);
});

test('flip and rotation are emitted as transforms; labels stay unrotated', () => {
  const d = createDocument(); const n = createAssetNode(library.get('immuno-antibody')); n.flipX = true; n.rotation = 30; n.label = 'IgG'; d.nodes.push(n);
  const s = renderSvg(d); assert.match(s, /rotate\(30/); assert.match(s, /scale\(-1 1\)/);
});

test('every asset: unique id, metadata, parts, well-formed SVG, all part overrides apply', () => {
  const ids = new Set();
  for (const a of ASSETS) {
    assert.ok(!ids.has(a.id), `duplicate ${a.id}`); ids.add(a.id);
    assert.ok(a.name && a.domain && a.topic && a.w > 0 && a.h > 0, a.id);
    assert.ok(Object.keys(a.parts).length >= 1, `${a.id} has no recolourable parts`);
    assert.equal(a.license, 'CC0-1.0');
    const svg = assetSvg(a.id);
    assert.deepEqual(duplicateAttributes(svg), [], a.id); assert.equal(unbalanced(svg), null, a.id);
    for (const part of Object.keys(a.parts)) {
      const marker = '#0a0b0c'; const recolored = assetSvg(a.id, { [part]: marker });
      assert.ok(recolored.includes(marker), `${a.id}: part "${part}" is declared but never used`);
    }
  }
  assert.ok(ASSETS.length >= 25); assert.equal(DOMAINS.length, 6);
});

test('search: synonyms, prefix, typo tolerance, domain filter, all-token matching', () => {
  const top = (q, o) => searchAssets(q, o)[0]?.id;
  assert.equal(top('kinase'), 'protein-generic');
  assert.equal(top('igg'), 'immuno-antibody');
  assert.equal(top('mitochondria'), 'organelle-mitochondrion');
  assert.equal(top('antibdy'), 'immuno-antibody');
  assert.equal(top('96 well'), 'lab-plate96');
  assert.deepEqual(searchAssets('cell', { domain: 'laboratory' }), []);
  assert.equal(searchAssets('t cell zzz').length, 0);
  assert.ok(searchAssets('').length >= 25);
});

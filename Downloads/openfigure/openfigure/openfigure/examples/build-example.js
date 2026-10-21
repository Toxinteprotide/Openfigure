// Builds examples/mapk-pathway.json with the public API. Run: node examples/build-example.js
import { writeFileSync } from 'node:fs';
import { createDocument, createAssetNode, createShapeNode, createTextNode, createConnector, library, validateDocument } from '../src/index.js';

const doc = createDocument({ width: 1200, height: 800, title: 'MAPK signalling (example)' });
const add = (n) => (doc.nodes.push(n), n);
const asset = (id, x, y, label, scale = 1, labelPos = 'below') => { const n = createAssetNode(library.get(id), { x, y, scale }); n.label = label; n.labelPos = labelPos; return add(n); };
const region = (label, x, y, w, h, fill) => { const r = createShapeNode('compartment', { x, y, w, h, fill, stroke: '#6b7fa6' }); r.label = label; return add(r); };

region('Extracellular space', 30, 30, 1140, 150, '#fdf1dd');
region('Cytoplasm', 30, 200, 1140, 330, '#e3eefb');
region('Nucleus', 30, 560, 1140, 210, '#ece4f8');
add(createTextNode('MAPK signalling cascade (illustrative example)', { x: 600, y: 22, fontSize: 22, bold: true, align: 'middle' }));

const ligand = asset('immuno-cytokine', 236, 66, 'Growth factor', 1.5, 'right');
const rtk = asset('receptor-gpcr', 228, 150, 'Receptor', 1, 'right');
const ras = asset('protein-generic', 330, 380, 'RAS', 1);
const raf = asset('protein-generic', 500, 380, 'RAF', 1);
const mek = asset('protein-generic', 670, 380, 'MEK', 1);
const erk = asset('protein-generic', 840, 380, 'ERK', 1);
const tf = asset('protein-generic', 1010, 380, 'TF', 1, 'above');
const gene = asset('gene-cassette', 860, 640, 'Target gene', 1);
const inhibitor = asset('immuno-cytokine', 520, 262, 'Inhibitor', 1.3, 'above');
for (const p of [mek, erk]) { const t = createAssetNode(library.get('tag-phosphate'), { x: p.x + 78, y: p.y - 14 }); add(t); }

const c = (a, b, o) => add(createConnector({ node: a.id, port: 'auto' }, { node: b.id, port: 'auto' }, o));
c(ligand, rtk, { semantic: 'binds' });
c(rtk, ras, { semantic: 'activates', routing: 'elbow' });
c(ras, raf, { semantic: 'activates' });
c(raf, mek, { semantic: 'activates', label: 'P' });
c(mek, erk, { semantic: 'activates', label: 'P' });
c(erk, tf, { semantic: 'activates' });
c(inhibitor, raf, { semantic: 'inhibits' });
const trans = createConnector({ node: tf.id, port: 'south' }, { node: gene.id, port: 'east' }, { semantic: 'translocates', routing: 'elbow', label: 'to nucleus' }); add(trans);

const errs = validateDocument(doc);
if (errs.length) throw new Error(errs.join('; '));
writeFileSync(new URL('./mapk-pathway.json', import.meta.url), JSON.stringify(doc, null, 2));
console.log('wrote examples/mapk-pathway.json with', doc.nodes.length, 'nodes');

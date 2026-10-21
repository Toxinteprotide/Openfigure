// Original, hand-written SVG assets (CC0). Simplified, schematic, and intentionally not modelled on any
// third-party icon set. Each asset: stable id, version, size, recolourable named parts, ports, metadata.
// `review` stays "unreviewed" until a domain scientist signs the asset off (see docs/CONTRIBUTING-ASSETS.md).

const S = '#33415c'; // outline colour shared by the core style set
const sk = (w = 3) => `stroke="${S}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const st = sk(3);

const sine = (x0, y0, len, amp, waves, vertical = false, phase = 0) => {
  const pts = [];
  const steps = waves * 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = Math.sin(t * waves * Math.PI * 2 + phase) * amp, p = t * len;
    pts.push(vertical ? [x0 + a, y0 + p] : [x0 + p, y0 + a]);
  }
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
};

const A = (o) => ({ version: 1, license: 'CC0-1.0', review: 'unreviewed', style: 'core-1', synonyms: [], tags: [], ports: undefined, ...o });

export const ASSETS = [
  // ---- Cell biology ----
  A({ id: 'cell-animal', name: 'Animal cell', domain: 'cell-biology', topic: 'cells', synonyms: ['eukaryotic cell', 'generic cell'], tags: ['membrane', 'organelle'], w: 200, h: 200,
    parts: { membrane: '#ffe9c7', nucleus: '#c9b6f2', mitochondrion: '#f6a5a5', er: '#8fd3c7' },
    render: (c) => `<path d="M100 8c52 0 92 38 92 92s-36 92-92 92S8 150 8 100 48 8 100 8z" fill="${c.membrane}" ${st}/>
<circle cx="92" cy="92" r="38" fill="${c.nucleus}" ${st}/><circle cx="84" cy="86" r="11" fill="#fff" fill-opacity=".55" stroke="${S}" stroke-width="2"/>
<ellipse cx="150" cy="140" rx="20" ry="11" transform="rotate(-30 150 140)" fill="${c.mitochondrion}" ${st}/>
<ellipse cx="52" cy="150" rx="17" ry="9" transform="rotate(25 52 150)" fill="${c.mitochondrion}" ${st}/>
<path d="${sine(120, 48, 50, 5, 3, false)}" fill="none" stroke="${c.er}" stroke-width="7" stroke-linecap="round"/>` }),
  A({ id: 'organelle-nucleus', name: 'Nucleus', domain: 'cell-biology', topic: 'organelles', synonyms: ['cell nucleus'], tags: ['chromatin', 'envelope'], w: 120, h: 120,
    parts: { envelope: '#d9ccf7', chromatin: '#7a5bc0' },
    render: (c) => `<circle cx="60" cy="60" r="54" fill="${c.envelope}" ${st}/><circle cx="60" cy="60" r="42" fill="none" stroke="${S}" stroke-width="1.5" stroke-dasharray="3 4"/>
<path d="${sine(28, 52, 64, 8, 3)} " fill="none" stroke="${c.chromatin}" stroke-width="5" stroke-linecap="round"/><path d="${sine(32, 72, 56, 6, 2.5, false, 1)}" fill="none" stroke="${c.chromatin}" stroke-width="5" stroke-linecap="round"/>` }),
  A({ id: 'organelle-mitochondrion', name: 'Mitochondrion', domain: 'cell-biology', topic: 'organelles', synonyms: ['mitochondria', 'powerhouse'], tags: ['cristae', 'atp'], w: 160, h: 90,
    parts: { outer: '#f9b8a8', inner: '#e6735f' },
    render: (c) => `<rect x="6" y="6" width="148" height="78" rx="39" fill="${c.outer}" ${st}/>
<path d="M30 48c8 0 8-24 16-24s8 36 16 36 8-36 16-36 8 36 16 36 8-30 14-30" fill="none" stroke="${c.inner}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` }),
  A({ id: 'organelle-ribosome', name: 'Ribosome', domain: 'cell-biology', topic: 'organelles', synonyms: ['ribosomes'], tags: ['translation', 'protein synthesis'], w: 70, h: 70,
    parts: { large: '#8fb8e8', small: '#5d8fcf' },
    render: (c) => `<ellipse cx="35" cy="26" rx="26" ry="20" fill="${c.large}" ${st}/><ellipse cx="35" cy="52" rx="20" ry="13" fill="${c.small}" ${st}/>` }),
  A({ id: 'membrane-bilayer', name: 'Lipid bilayer', domain: 'cell-biology', topic: 'membranes', synonyms: ['plasma membrane', 'phospholipid bilayer'], tags: ['membrane'], w: 240, h: 70,
    parts: { heads: '#f4c26b', tails: '#33415c' },
    render: (c) => { let o = ''; for (let i = 0; i < 8; i++) { const x = 15 + i * 30; o += `<path d="M${x - 4} 24V35M${x + 4} 24V35" stroke="${c.tails}" stroke-width="2.4" stroke-linecap="round"/><path d="M${x - 4} 46V35M${x + 4} 46V35" stroke="${c.tails}" stroke-width="2.4" stroke-linecap="round" transform="translate(0 0)"/><circle cx="${x}" cy="15" r="9.5" fill="${c.heads}" ${sk(2.4)}/><circle cx="${x}" cy="55" r="9.5" fill="${c.heads}" ${sk(2.4)}/>`; } return o; } }),
  A({ id: 'cell-rbc', name: 'Red blood cell', domain: 'cell-biology', topic: 'cells', synonyms: ['erythrocyte', 'rbc'], tags: ['blood'], w: 110, h: 110,
    parts: { body: '#e9605f', dimple: '#c43f45' },
    render: (c) => `<ellipse cx="55" cy="55" rx="50" ry="46" fill="${c.body}" ${st}/><ellipse cx="55" cy="55" rx="24" ry="20" fill="${c.dimple}" fill-opacity=".55"/>` }),
  A({ id: 'cell-neuron', name: 'Neuron', domain: 'cell-biology', topic: 'cells', synonyms: ['nerve cell'], tags: ['axon', 'dendrite', 'soma'], w: 260, h: 150,
    parts: { soma: '#ffd88a', fibres: '#c2872c' },
    render: (c) => `<g fill="none" stroke="${c.fibres}" stroke-width="5" stroke-linecap="round"><path d="M60 62L22 24M52 78L12 80M62 94L26 128M70 52L56 14M92 70L170 70L240 70"/><path d="M22 24l-8-8M22 24l10-4M12 80l-6-8M12 80l-6 8M26 128l-10 4M26 128l4 10"/><path d="M240 70l16-14M240 70l16 14M240 70l18 0"/></g><circle cx="76" cy="74" r="30" fill="${c.soma}" ${st}/><circle cx="76" cy="74" r="10" fill="#fff" fill-opacity=".5" stroke="${S}" stroke-width="2"/>` }),
  // ---- Molecular biology ----
  A({ id: 'dna-helix', name: 'DNA double helix', domain: 'molecular-biology', topic: 'nucleic-acids', synonyms: ['dna', 'double helix'], tags: ['genome', 'base pairs'], w: 70, h: 200,
    parts: { strandA: '#3b82f6', strandB: '#ef6f6c', rungs: '#9aa7bd' },
    render: (c) => { let r = ''; for (let i = 0; i <= 10; i++) { const y = 10 + i * 18, x = 35 + Math.sin((y / 190) * Math.PI * 4) * 22; r += `<path d="M${(70 - x).toFixed(1)} ${y}L${x.toFixed(1)} ${y}" stroke="${c.rungs}" stroke-width="3"/>`; } return `${r}<path d="${sine(35, 0, 200, 22, 2, true, 0)}" fill="none" stroke="${c.strandA}" stroke-width="6" stroke-linecap="round"/><path d="${sine(35, 0, 200, 22, 2, true, Math.PI)}" fill="none" stroke="${c.strandB}" stroke-width="6" stroke-linecap="round"/>`; } }),
  A({ id: 'receptor-gpcr', name: 'Membrane receptor', domain: 'molecular-biology', topic: 'receptors', synonyms: ['receptor', 'gpcr', 'transmembrane protein'], tags: ['signaling', 'membrane'], w: 70, h: 130,
    ports: { north: [0.5, 0], south: [0.5, 1], east: [1, 0.5], west: [0, 0.5] },
    parts: { body: '#7fd1ae', loop: '#4aa585' },
    render: (c) => `<path d="M14 22c0-12 42-12 42 0v86c0 12-42 12-42 0z" fill="${c.body}" ${st}/><path d="M26 22c0-8 18-8 18 0v86c0 8-18 8-18 0z" fill="${c.loop}" fill-opacity=".45"/><path d="M22 14c-6-10 8-14 14-8M48 14c6-10-8-14-14-8" fill="none" stroke="${S}" stroke-width="3" stroke-linecap="round"/>` }),
  A({ id: 'protein-generic', name: 'Protein (generic)', domain: 'molecular-biology', topic: 'proteins', synonyms: ['enzyme', 'kinase', 'globular protein', 'transcription factor'], tags: ['protein'], w: 100, h: 84,
    ports: { north: [0.5, 0.06], south: [0.5, 0.96], east: [0.88, 0.55], west: [0.14, 0.55] },
    parts: { body: '#9ec5f0', cleft: '#ffffff' },
    render: (c) => `<path d="M16 46c-8-24 10-40 34-38 26 2 40 18 34 40-6 22-26 32-46 28-14-3-18-14-22-30z" fill="${c.body}" ${st}/><path d="M78 24c-14 6-18 20-8 34" fill="none" stroke="${c.cleft}" stroke-width="9" stroke-linecap="round"/>` }),
  A({ id: 'plasmid', name: 'Plasmid', domain: 'molecular-biology', topic: 'nucleic-acids', synonyms: ['vector', 'circular dna'], tags: ['cloning'], w: 110, h: 110,
    parts: { ring: '#6c8ee6', marker: '#f2a65a' },
    render: (c) => `<circle cx="55" cy="55" r="42" fill="none" stroke="${c.ring}" stroke-width="10"/><circle cx="55" cy="55" r="42" fill="none" stroke="${S}" stroke-width="1.5" stroke-dasharray="2 5"/><path d="M55 8a47 47 0 0 1 40 22" fill="none" stroke="${c.marker}" stroke-width="12" stroke-linecap="butt"/><path d="M95 30l-2-12 12 6z" fill="${c.marker}" ${sk(1.5)}/>` }),
  A({ id: 'tag-phosphate', name: 'Phosphate group', domain: 'molecular-biology', topic: 'modifications', synonyms: ['phosphorylation', 'p'], tags: ['ptm'], w: 30, h: 30,
    parts: { body: '#f2c14e' },
    render: (c) => `<circle cx="15" cy="15" r="13" fill="${c.body}" ${sk(2.4)}/><text x="15" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="${S}">P</text>` }),
  A({ id: 'gene-cassette', name: 'Gene (promoter + coding)', domain: 'molecular-biology', topic: 'nucleic-acids', synonyms: ['gene', 'promoter', 'orf', 'coding sequence'], tags: ['expression'], w: 220, h: 50,
    parts: { promoter: '#f2a65a', coding: '#6bb0e8' },
    render: (c) => `<path d="M8 8H46M27 8V-4" stroke="none"/><rect x="6" y="14" width="58" height="26" rx="5" fill="${c.promoter}" ${st}/><path d="M70 14h112l30 13-30 13H70z" fill="${c.coding}" ${st}/><path d="M24 14V4h18" fill="none" stroke="${S}" stroke-width="3" stroke-linecap="round"/><path d="M42 4l-7-5v10z" fill="${S}"/>` }),
  // ---- Immunology ----
  A({ id: 'immuno-antibody', name: 'Antibody (IgG)', domain: 'immunology', topic: 'molecules', synonyms: ['immunoglobulin', 'igg', 'ab'], tags: ['adaptive'], w: 90, h: 110,
    ports: { north: [0.5, 0], south: [0.5, 1], east: [1, 0.5], west: [0, 0.5], 'fab-left': [0.1, 0.05], 'fab-right': [0.9, 0.05] },
    parts: { heavy: '#f08a8a', light: '#8ab4f0' },
    render: (c) => `<path d="M45 108V62" stroke="${c.heavy}" stroke-width="16" stroke-linecap="round"/><path d="M45 62L16 16M45 62L74 16" stroke="${c.heavy}" stroke-width="16" stroke-linecap="round"/><path d="M26 34L16 16M64 34L74 16" stroke="${c.light}" stroke-width="10" stroke-linecap="round"/><path d="M45 108V62M45 62L16 16M45 62L74 16" stroke="${S}" stroke-width="1.5" fill="none" opacity=".5"/>` }),
  A({ id: 'immuno-tcell', name: 'T cell', domain: 'immunology', topic: 'cells', synonyms: ['t lymphocyte', 'cd4', 'cd8'], tags: ['adaptive', 'lymphocyte'], w: 130, h: 140,
    ports: { north: [0.5, 0], south: [0.5, 1], east: [1, 0.5], west: [0, 0.5] },
    parts: { body: '#bfe3a1', nucleus: '#6aa84f', receptor: '#e6735f' },
    render: (c) => `<g stroke="${c.receptor}" stroke-width="4" stroke-linecap="round"><path d="M40 20V4M65 14V0M90 20V4"/></g><circle cx="65" cy="76" r="56" fill="${c.body}" ${st}/><circle cx="65" cy="76" r="34" fill="${c.nucleus}" ${st}/>` }),
  A({ id: 'immuno-macrophage', name: 'Macrophage', domain: 'immunology', topic: 'cells', synonyms: ['phagocyte', 'monocyte-derived cell'], tags: ['innate', 'phagocytosis'], w: 180, h: 150,
    parts: { body: '#f6d98f', nucleus: '#c28b2c', vacuole: '#fff6dc' },
    render: (c) => `<path d="M30 40C10 40 4 70 26 78 8 96 26 124 48 112c6 24 40 34 58 16 24 12 54-4 52-30 22-10 18-44-6-48 4-28-30-44-52-28-20-14-50-6-50 18z" fill="${c.body}" ${st}/><ellipse cx="96" cy="70" rx="30" ry="24" fill="${c.nucleus}" ${st}/><circle cx="52" cy="92" r="11" fill="${c.vacuole}" ${sk(2)}/><circle cx="136" cy="102" r="9" fill="${c.vacuole}" ${sk(2)}/>` }),
  A({ id: 'immuno-cytokine', name: 'Cytokine / ligand', domain: 'immunology', topic: 'molecules', synonyms: ['ligand', 'interleukin', 'signaling molecule', 'growth factor'], tags: ['signaling'], w: 38, h: 38,
    parts: { body: '#f5a3c7' },
    render: (c) => `<path d="M19 3l5 11 12 1-9 8 3 12-11-7-11 7 3-12-9-8 12-1z" fill="${c.body}" ${sk(2.4)}/>` }),
  // ---- Pathogens ----
  A({ id: 'pathogen-virus', name: 'Virus (enveloped)', domain: 'pathogens', topic: 'viruses', synonyms: ['virion', 'coronavirus-like', 'enveloped virus'], tags: ['capsid', 'spike'], w: 130, h: 130,
    parts: { envelope: '#d6c1f0', spike: '#7b5bb8', core: '#b497e0' },
    render: (c) => { let s = ''; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x1 = 65 + Math.cos(a) * 42, y1 = 65 + Math.sin(a) * 42, x2 = 65 + Math.cos(a) * 58, y2 = 65 + Math.sin(a) * 58; s += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${c.spike}" stroke-width="4" stroke-linecap="round"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="5" fill="${c.spike}"/>`; } return `${s}<circle cx="65" cy="65" r="44" fill="${c.envelope}" ${st}/><circle cx="65" cy="65" r="24" fill="${c.core}" ${sk(2)}/>`; } }),
  A({ id: 'pathogen-bacterium', name: 'Bacterium (rod)', domain: 'pathogens', topic: 'bacteria', synonyms: ['bacillus', 'e. coli-like', 'bacteria'], tags: ['prokaryote', 'flagellum'], w: 170, h: 80,
    parts: { body: '#a6dba0', nucleoid: '#4f9a4a', flagellum: '#4f9a4a' },
    render: (c) => `<path d="M60 40c-24 0-30 14-50 14" fill="none" stroke="${c.flagellum}" stroke-width="3" stroke-linecap="round" transform="translate(-4 -8)"/><rect x="58" y="14" width="106" height="52" rx="26" fill="${c.body}" ${st}/><path d="${sine(78, 40, 66, 7, 2.5)}" fill="none" stroke="${c.nucleoid}" stroke-width="3.5" stroke-linecap="round"/>` }),
  // ---- Anatomy ----
  A({ id: 'anatomy-mouse', name: 'Mouse (side view)', domain: 'anatomy', topic: 'model-organisms', synonyms: ['mus musculus', 'rodent', 'mice'], tags: ['in vivo', 'model organism'], w: 210, h: 100,
    parts: { body: '#d9d3cb', ear: '#f2b9b0', tail: '#e8b3a8' },
    render: (c) => `<path d="M150 62c30 4 44 20 56 8" fill="none" stroke="${c.tail}" stroke-width="5" stroke-linecap="round" transform="translate(0 -4)"/><path d="M26 58c0-24 30-42 66-42 40 0 66 16 66 40 0 20-22 30-52 30H60C40 86 26 76 26 58z" fill="${c.body}" ${st}/><path d="M22 54l-14 6 18 8z" fill="${c.body}" ${st}/><circle cx="52" cy="22" r="14" fill="${c.ear}" ${st}/><circle cx="46" cy="50" r="3.5" fill="${S}"/>` }),
  A({ id: 'anatomy-human', name: 'Human silhouette', domain: 'anatomy', topic: 'body', synonyms: ['person', 'patient', 'human body'], tags: ['human'], w: 80, h: 200,
    parts: { body: '#cdd6e4' },
    render: (c) => `<circle cx="40" cy="18" r="14" fill="${c.body}" ${st}/><path d="M18 40h44c8 0 10 8 10 16v44h-8V70h-4v120h-14V120h-8v70H24V70h-4v30h-8V56c0-8 2-16 6-16z" fill="${c.body}" ${st}/>` }),
  // ---- Laboratory ----
  A({ id: 'lab-tube', name: 'Test tube', domain: 'laboratory', topic: 'glassware', synonyms: ['tube', 'eppendorf', 'vial'], tags: ['sample'], w: 44, h: 150,
    parts: { liquid: '#7fc4f0', glass: '#eef6fb' },
    render: (c) => `<path d="M6 8H38V112a16 16 0 0 1-32 0z" fill="${c.glass}" ${st}/><path d="M7.5 72H36.5V112a14.5 14.5 0 0 1-29 0z" fill="${c.liquid}"/><path d="M2 8H42" ${st}/>` }),
  A({ id: 'lab-petri', name: 'Petri dish', domain: 'laboratory', topic: 'culture', synonyms: ['culture plate', 'agar plate', 'dish'], tags: ['culture'], w: 130, h: 130,
    parts: { dish: '#f2f7fb', medium: '#f6d9a4', colony: '#8a6a2f' },
    render: (c) => `<circle cx="65" cy="65" r="60" fill="${c.dish}" ${st}/><circle cx="65" cy="65" r="50" fill="${c.medium}" stroke="${S}" stroke-width="1.5"/><circle cx="48" cy="52" r="6" fill="${c.colony}"/><circle cx="78" cy="46" r="4" fill="${c.colony}"/><circle cx="84" cy="78" r="7" fill="${c.colony}"/><circle cx="52" cy="84" r="4.5" fill="${c.colony}"/><circle cx="66" cy="66" r="3" fill="${c.colony}"/>` }),
  A({ id: 'lab-pipette', name: 'Pipette', domain: 'laboratory', topic: 'liquid-handling', synonyms: ['micropipette', 'pipettor'], tags: ['pipetting'], w: 34, h: 210,
    parts: { body: '#9bb3d1', button: '#e6735f', tip: '#eef6fb' },
    render: (c) => `<rect x="11" y="2" width="12" height="20" rx="4" fill="${c.button}" ${st}/><path d="M6 24h22l-1 84-5 12h-10l-5-12z" fill="${c.body}" ${st}/><path d="M14 120h6l-1 70-2 18-2-18z" fill="${c.tip}" ${sk(2.4)}/>` }),
  A({ id: 'lab-plate96', name: 'Multiwell plate', domain: 'laboratory', topic: 'plates', synonyms: ['96-well plate', 'microplate', 'well plate'], tags: ['assay', 'screening'], w: 200, h: 136,
    parts: { plate: '#eef2f7', well: '#ffffff', sample: '#7fc4f0' },
    render: (c) => { let w = ''; for (let r = 0; r < 6; r++) for (let q = 0; q < 8; q++) { const filled = (r * 8 + q) % 5 < 2; w += `<circle cx="${30 + q * 20}" cy="${28 + r * 18}" r="7" fill="${filled ? c.sample : c.well}" stroke="${S}" stroke-width="1.6"/>`; } return `<rect x="4" y="4" width="192" height="128" rx="10" fill="${c.plate}" ${st}/>${w}`; } }),
  A({ id: 'lab-flask', name: 'Erlenmeyer flask', domain: 'laboratory', topic: 'glassware', synonyms: ['conical flask', 'flask'], tags: ['culture', 'reagent'], w: 110, h: 140,
    parts: { liquid: '#a7e0c0', glass: '#eef6fb' },
    render: (c) => `<path d="M40 8h30v38l34 78c3 8-2 12-10 12H16c-8 0-13-4-10-12l34-78z" fill="${c.glass}" ${st}/><path d="M26 92h58l20 32c3 8-2 12-10 12H16c-8 0-13-4-10-12z" fill="${c.liquid}" transform="translate(0 -6)" opacity=".95"/><path d="M34 8h42" ${st}/>` }),
  A({ id: 'lab-microscope', name: 'Microscope', domain: 'laboratory', topic: 'instruments', synonyms: ['light microscope', 'scope'], tags: ['imaging'], w: 130, h: 170,
    parts: { body: '#7f93b2', stage: '#4d5f80', lens: '#bcd0ea' },
    render: (c) => `<path d="M26 156h86v-12H26z" fill="${c.stage}" ${st}/><path d="M92 144V74c0-30-18-48-38-52" fill="none" stroke="${c.body}" stroke-width="16" stroke-linecap="round"/><rect x="34" y="14" width="26" height="62" rx="6" transform="rotate(-20 47 45)" fill="${c.lens}" ${st}/><rect x="30" y="110" width="52" height="8" rx="3" fill="${c.stage}" ${st}/><path d="M50 98h22" ${st}/>` }),
];

const byId = new Map(ASSETS.map((a) => [a.id, a]));
export const DOMAINS = [...new Set(ASSETS.map((a) => a.domain))];
export const library = {
  list: () => ASSETS,
  get: (id) => byId.get(id),
  register(asset) { const a = A(asset); if (byId.has(a.id)) { ASSETS.splice(ASSETS.indexOf(byId.get(a.id)), 1); } ASSETS.push(a); byId.set(a.id, a); return a; },
};

// Search: weighted token matching over name, synonyms, tags, topic, domain, with prefix and light fuzzy support.
const tok = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
function lev1(a, b) { // true if edit distance <= 1
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
export function searchAssets(query, { domain = null, limit = 50 } = {}) {
  const q = tok(query ?? '');
  const pool = ASSETS.filter((a) => !domain || a.domain === domain);
  if (!q.length) return pool.slice(0, limit);
  const scored = [];
  for (const a of pool) {
    const fields = [[tok(a.name), 10], [a.synonyms.flatMap(tok), 7], [a.tags.flatMap(tok), 4], [tok(a.topic), 3], [tok(a.domain), 2]];
    let total = 0, matched = 0;
    for (const t of q) {
      let best = 0;
      for (const [words, weight] of fields) for (const w of words) {
        let s = 0;
        if (w === t) s = weight * 3; else if (w.startsWith(t) && t.length >= 2) s = weight * 2; else if (t.length >= 5 && w[0] === t[0] && lev1(w, t)) s = weight;
        if (s > best) best = s;
      }
      if (best) matched++;
      total += best;
    }
    if (matched === q.length) scored.push({ a, score: total + (tok(a.name).join(' ') === q.join(' ') ? 50 : 0) });
  }
  return scored.sort((x, y) => y.score - x.score || x.a.name.localeCompare(y.a.name)).slice(0, limit).map((s) => s.a);
}

export function assetSvg(id, colors = {}, { size } = {}) {
  const a = byId.get(id); if (!a) throw new Error(`unknown asset ${id}`);
  const c = { ...a.parts, ...colors };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.w} ${a.h}" ${size ? `width="${size}"` : ''}>${a.render(c)}</svg>`;
}

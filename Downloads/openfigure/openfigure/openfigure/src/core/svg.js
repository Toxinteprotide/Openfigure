// One renderer for editor and export, so what you see is what you export.
import { DEFAULT_PORTS, portPoint, bestPortPair, routeConnector } from './geometry.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n2 = (v) => Math.round(v * 100) / 100;

function portsOf(node, library) {
  return (node.type === 'asset' && library?.get(node.assetId)?.ports) || DEFAULT_PORTS;
}

export function resolveConnector(doc, c, library) {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const a = c.from.node ? byId.get(c.from.node) : null;
  const b = c.to.node ? byId.get(c.to.node) : null;
  if ((c.from.node && !a) || (c.to.node && !b)) return null;
  let pa = c.from.port, pb = c.to.port;
  if (a && b && (!pa || pa === 'auto' || !pb || pb === 'auto')) {
    const best = bestPortPair(a, b, portsOf(a, library), portsOf(b, library));
    if (!pa || pa === 'auto') pa = best.from;
    if (!pb || pb === 'auto') pb = best.to;
  }
  const p1 = a ? portPoint(a, pa ?? 'east', portsOf(a, library)) : { x: c.from.x, y: c.from.y, dx: 0, dy: 0 };
  const p2 = b ? portPoint(b, pb ?? 'west', portsOf(b, library)) : { x: c.to.x, y: c.to.y, dx: 0, dy: 0 };
  return { p1, p2, route: routeConnector(p1, p2, c.routing) };
}

function head(kind, p, angle, color, w) {
  const s = 5 + w * 2.2;
  const t = `translate(${n2(p.x)} ${n2(p.y)}) rotate(${n2(angle)})`;
  if (kind === 'inhibits') return `<path d="M0 ${-s} L0 ${s}" transform="${t}" stroke="${color}" stroke-width="${w * 1.4}" stroke-linecap="round" fill="none"/>`;
  if (kind === 'binds') return `<circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="${n2(w * 1.8)}" fill="${color}"/>`;
  if (kind === 'plain') return '';
  return `<path d="M0 0 L${-s * 1.5} ${-s * 0.75} L${-s * 1.5} ${s * 0.75} Z" transform="${t}" fill="${color}"/>`;
}

export function renderNode(doc, n, library, { editor = false } = {}) {
  if (n.hidden) return '';
  const idAttr = ` data-id="${esc(n.id)}"`;
  if (n.type === 'asset') {
    const a = library?.get(n.assetId);
    const rot = n.rotation ? ` rotate(${n2(n.rotation)} ${n2(n.w / 2)} ${n2(n.h / 2)})` : '';
    const flip = n.flipX ? ` translate(${n2(n.w)} 0) scale(-1 1)` : '';
    const wrap = `translate(${n2(n.x)} ${n2(n.y)})${rot}`;
    if (!a) {
      return `<g${idAttr} transform="${wrap}"><rect width="${n2(n.w)}" height="${n2(n.h)}" fill="#fff5f5" stroke="#c93b3b" stroke-dasharray="6 4"/><text x="${n2(n.w / 2)}" y="${n2(n.h / 2)}" text-anchor="middle" font-size="12" fill="#c93b3b">missing: ${esc(n.assetId)}</text></g>`;
    }
    const colors = { ...a.parts, ...(n.overrides || {}) };
    const inner = a.render(colors);
    const lp = n.labelPos ?? 'below';
    const lx = lp === 'right' ? n.w + 10 : n.w / 2, ly = lp === 'right' ? n.h / 2 + 5 : lp === 'above' ? -10 : n.h + 18;
    const label = n.label ? `<text x="${n2(lx)}" y="${n2(ly)}" text-anchor="${lp === 'right' ? 'start' : 'middle'}" font-size="16" fill="#1b2330">${esc(n.label)}</text>` : '';
    // label is drawn unrotated and unflipped
    const scaleTr = `${flip} scale(${n2(n.w / a.w)} ${n2(n.h / a.h)})`.trim();
    return `<g${idAttr} transform="${wrap}"><g transform="${scaleTr}">${inner}</g>${label}</g>`;
  }
  if (n.type === 'shape') {
    const rot = n.rotation ? ` rotate(${n2(n.rotation)} ${n2(n.x + n.w / 2)} ${n2(n.y + n.h / 2)})` : '';
    const tr = rot ? ` transform="${rot.trim()}"` : '';
    const dash = n.kind === 'compartment' ? ' stroke-dasharray="10 6"' : '';
    const op = n.kind === 'compartment' ? ' fill-opacity="0.35"' : '';
    let body;
    if (n.kind === 'ellipse') body = `<ellipse cx="${n2(n.x + n.w / 2)}" cy="${n2(n.y + n.h / 2)}" rx="${n2(n.w / 2)}" ry="${n2(n.h / 2)}" fill="${esc(n.fill)}" stroke="${esc(n.stroke)}" stroke-width="${n.strokeWidth}"/>`;
    else body = `<rect x="${n2(n.x)}" y="${n2(n.y)}" width="${n2(n.w)}" height="${n2(n.h)}" rx="${n.kind === 'compartment' ? 28 : 8}" fill="${esc(n.fill)}"${op} stroke="${esc(n.stroke)}" stroke-width="${n.strokeWidth}"${dash}/>`;
    const lab = n.label ? `<text x="${n2(n.kind === 'compartment' ? n.x + 16 : n.x + n.w / 2)}" y="${n2(n.kind === 'compartment' ? n.y + 26 : n.y + n.h / 2 + 6)}" text-anchor="${n.kind === 'compartment' ? 'start' : 'middle'}" font-size="18" font-weight="600" fill="#1b2330">${esc(n.label)}</text>` : '';
    return `<g${idAttr}${tr}>${body}${lab}</g>`;
  }
  if (n.type === 'text') {
    const rot = n.rotation ? ` transform="rotate(${n2(n.rotation)} ${n2(n.x)} ${n2(n.y)})"` : '';
    const lines = String(n.text).split('\n');
    const tspans = lines.map((l, i) => `<tspan x="${n2(n.x)}" dy="${i ? n2(n.fontSize * 1.2) : 0}">${esc(l)}</tspan>`).join('');
    return `<text${idAttr}${rot} x="${n2(n.x)}" y="${n2(n.y)}" text-anchor="${n.align}" font-size="${n.fontSize}" font-weight="${n.bold ? 700 : 400}" fill="${esc(n.fill)}">${tspans}</text>`;
  }
  if (n.type === 'connector') {
    const rc = resolveConnector(doc, n, library);
    if (!rc) return '';
    const dash = n.semantic === 'translocates' ? ' stroke-dasharray="9 6"' : '';
    const lab = n.label ? `<text x="${n2(rc.route.label.x)}" y="${n2(rc.route.label.y - 8)}" text-anchor="middle" font-size="15" fill="${esc(n.color)}" paint-order="stroke" stroke="${esc(doc.frame.background)}" stroke-width="4">${esc(n.label)}</text>` : '';
    const hit = editor ? `<path d="${rc.route.d}" stroke="transparent" stroke-width="14" fill="none"/>` : '';
    return `<g${idAttr}>${hit}<path d="${rc.route.d}" fill="none" stroke="${esc(n.color)}" stroke-width="${n.width}" stroke-linecap="round" stroke-linejoin="round"${dash}/>${head(n.semantic, rc.p2, rc.route.endAngle, esc(n.color), n.width)}${lab}</g>`;
  }
  return '';
}

// Plain-language description for accessibility (SVG <desc>).
export function describeDocument(doc, library) {
  const names = doc.nodes.filter((n) => !n.hidden).map((n) => {
    if (n.type === 'asset') return n.label || library?.get(n.assetId)?.name || n.assetId;
    if (n.type === 'text') return n.text;
    if (n.type === 'shape') return n.label || '';
    return '';
  }).filter(Boolean);
  const rel = doc.nodes.filter((n) => n.type === 'connector' && !n.hidden).map((c) => {
    const nm = (e) => { const t = doc.nodes.find((x) => x.id === e.node); return t ? (t.label || library?.get(t.assetId)?.name || t.text || t.id) : 'point'; };
    return `${nm(c.from)} ${c.semantic} ${nm(c.to)}`;
  });
  return `Figure with ${names.length} labelled elements: ${names.join(', ')}.${rel.length ? ' Relationships: ' + rel.join('; ') + '.' : ''}`;
}

export function renderDocument(doc, library, { editor = false, grid = false, title } = {}) {
  const { width, height, background } = doc.frame;
  const body = doc.nodes.map((n) => renderNode(doc, n, library, { editor })).join('\n');
  const gridDef = grid ? `<pattern id="of-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#000" stroke-opacity=".06"/></pattern>` : '';
  const t = esc(title ?? doc.title);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="of-title of-desc" font-family="Arial, Helvetica, sans-serif">
<title id="of-title">${t}</title><desc id="of-desc">${esc(describeDocument(doc, library))}</desc>
<defs>${gridDef}</defs>
<rect width="${width}" height="${height}" fill="${esc(background)}"/>${grid ? `<rect width="${width}" height="${height}" fill="url(#of-grid)"/>` : ''}
${body}
</svg>`;
}

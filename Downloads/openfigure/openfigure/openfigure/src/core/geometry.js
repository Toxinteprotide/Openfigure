// Geometry: bounds, ports, connector routing, snapping.

export const DEFAULT_PORTS = { north: [0.5, 0], south: [0.5, 1], east: [1, 0.5], west: [0, 0.5] };

export function rotatePoint(px, py, cx, cy, deg) {
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const dx = px - cx, dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

export function nodeBounds(n) {
  if (n.type === 'text') {
    const w = Math.max(10, (n.text?.length ?? 1) * n.fontSize * 0.56);
    const h = n.fontSize * 1.25;
    const x = n.align === 'start' ? n.x : n.align === 'end' ? n.x - w : n.x - w / 2;
    return { x, y: n.y - h * 0.8, w, h };
  }
  if (!n.rotation) return { x: n.x, y: n.y, w: n.w, h: n.h };
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  const pts = [[n.x, n.y], [n.x + n.w, n.y], [n.x + n.w, n.y + n.h], [n.x, n.y + n.h]].map(([x, y]) => rotatePoint(x, y, cx, cy, n.rotation));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function unionBounds(list) {
  if (!list.length) return null;
  const x1 = Math.min(...list.map((b) => b.x)), y1 = Math.min(...list.map((b) => b.y));
  const x2 = Math.max(...list.map((b) => b.x + b.w)), y2 = Math.max(...list.map((b) => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// Absolute position and outward direction of a port. `ports` is the asset's port map (fractions of the box).
export function portPoint(node, portName, ports = DEFAULT_PORTS) {
  const p = ports[portName] ?? DEFAULT_PORTS[portName] ?? [0.5, 0.5];
  let fx = p[0];
  if (node.flipX) fx = 1 - fx;
  const x = node.x + fx * node.w, y = node.y + p[1] * node.h;
  const [rx, ry] = rotatePoint(x, y, node.x + node.w / 2, node.y + node.h / 2, node.rotation || 0);
  const dirs = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
  let d = dirs[portName] ?? [0, 0];
  if (node.flipX) d = [-d[0], d[1]];
  const [dx, dy] = rotatePoint(d[0], d[1], 0, 0, node.rotation || 0);
  return { x: rx, y: ry, dx: Math.round(dx), dy: Math.round(dy) };
}

// Choose the pair of default ports that are closest to each other (used when a connector gets dropped on a node body).
export function nearestPort(node, point, ports = DEFAULT_PORTS) {
  let best = null;
  for (const name of Object.keys(ports)) {
    const p = portPoint(node, name, ports);
    const d = Math.hypot(p.x - point.x, p.y - point.y);
    if (!best || d < best.d) best = { name, d };
  }
  return best.name;
}

export function bestPortPair(a, b, portsA, portsB) {
  const names = ['north', 'south', 'east', 'west'];
  let best = null;
  for (const na of names) for (const nb of names) {
    const pa = portPoint(a, na, portsA), pb = portPoint(b, nb, portsB);
    // prefer ports that face each other
    const vx = pb.x - pa.x, vy = pb.y - pa.y;
    const facing = (pa.dx * vx + pa.dy * vy) - (pb.dx * vx + pb.dy * vy);
    const score = Math.hypot(vx, vy) - 0.35 * facing;
    if (!best || score < best.score) best = { from: na, to: nb, score };
  }
  return best;
}

// Returns an SVG path string and the end tangent angle / label position.
export function routeConnector(p1, p2, routing = 'straight') {
  const pad = 18;
  if (routing === 'curved') {
    const k = Math.max(30, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.4);
    const c1 = [p1.x + (p1.dx || 0) * k, p1.y + (p1.dy || 0) * k];
    const c2 = [p2.x + (p2.dx || 0) * k, p2.y + (p2.dy || 0) * k];
    const d = `M${r(p1.x)} ${r(p1.y)} C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2.x)} ${r(p2.y)}`;
    const t = 0.5, mx = bez(p1.x, c1[0], c2[0], p2.x, t), my = bez(p1.y, c1[1], c2[1], p2.y, t);
    const e = Math.atan2(p2.y - c2[1], p2.x - c2[0]);
    return { d, label: { x: mx, y: my }, endAngle: (e * 180) / Math.PI };
  }
  if (routing === 'elbow') {
    const s = [p1.x + (p1.dx || 0) * pad, p1.y + (p1.dy || 0) * pad];
    const e = [p2.x + (p2.dx || 0) * pad, p2.y + (p2.dy || 0) * pad];
    const horizontalStart = Math.abs(p1.dx || 0) >= Math.abs(p1.dy || 0);
    const pts = [[p1.x, p1.y], s];
    if (horizontalStart) { const mx = (s[0] + e[0]) / 2; pts.push([mx, s[1]], [mx, e[1]]); }
    else { const my = (s[1] + e[1]) / 2; pts.push([s[0], my], [e[0], my]); }
    pts.push(e, [p2.x, p2.y]);
    const clean = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.5);
    const d = clean.map((p, i) => `${i ? 'L' : 'M'}${r(p[0])} ${r(p[1])}`).join(' ');
    const a = clean[clean.length - 2] ?? clean[0], b = clean[clean.length - 1];
    const mid = clean[Math.floor(clean.length / 2)];
    return { d, label: { x: (clean[1][0] + clean[clean.length - 2][0]) / 2, y: (clean[1][1] + clean[clean.length - 2][1]) / 2 }, endAngle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, mid };
  }
  return { d: `M${r(p1.x)} ${r(p1.y)} L${r(p2.x)} ${r(p2.y)}`, label: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, endAngle: (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI };
}
const r = (v) => Math.round(v * 100) / 100;
const bez = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

// Snap a moving box to other boxes (edges + centres) and the frame. Returns the correction and guide lines.
export function snapBox(box, others, { threshold = 6, frame = null } = {}) {
  const xs = [box.x, box.x + box.w / 2, box.x + box.w];
  const ys = [box.y, box.y + box.h / 2, box.y + box.h];
  const tx = [], ty = [];
  for (const o of others) { tx.push(o.x, o.x + o.w / 2, o.x + o.w); ty.push(o.y, o.y + o.h / 2, o.y + o.h); }
  if (frame) { tx.push(0, frame.width / 2, frame.width); ty.push(0, frame.height / 2, frame.height); }
  const best = (vals, targets) => {
    let b = null;
    for (const v of vals) for (const t of targets) { const d = t - v; if (Math.abs(d) <= threshold && (!b || Math.abs(d) < Math.abs(b.d))) b = { d, at: t }; }
    return b;
  };
  const bx = best(xs, tx), by = best(ys, ty);
  const guides = [];
  if (bx) guides.push({ axis: 'x', at: bx.at });
  if (by) guides.push({ axis: 'y', at: by.at });
  return { dx: bx ? bx.d : 0, dy: by ? by.d : 0, guides };
}

// Equal-spacing distribution and alignment helpers (operate on draft nodes).
export function alignNodes(nodes, mode) {
  const bs = nodes.map(nodeBounds); const u = unionBounds(bs);
  nodes.forEach((n, i) => {
    const b = bs[i];
    if (mode === 'left') n.x += u.x - b.x;
    if (mode === 'right') n.x += u.x + u.w - (b.x + b.w);
    if (mode === 'center') n.x += u.x + u.w / 2 - (b.x + b.w / 2);
    if (mode === 'top') n.y += u.y - b.y;
    if (mode === 'bottom') n.y += u.y + u.h - (b.y + b.h);
    if (mode === 'middle') n.y += u.y + u.h / 2 - (b.y + b.h / 2);
  });
}
export function distributeNodes(nodes, axis) {
  if (nodes.length < 3) return;
  const key = axis === 'h' ? 'x' : 'y', size = axis === 'h' ? 'w' : 'h';
  const items = nodes.map((n) => ({ n, b: nodeBounds(n) })).sort((a, b) => a.b[key] - b.b[key]);
  const first = items[0].b, last = items[items.length - 1].b;
  const total = last[key] + last[size] - first[key] - items.reduce((s, i) => s + i.b[size], 0);
  const gap = total / (items.length - 1);
  let cursor = first[key] + first[size] + gap;
  for (let i = 1; i < items.length - 1; i++) { items[i].n[key] += cursor - items[i].b[key]; cursor += items[i].b[size] + gap; }
}

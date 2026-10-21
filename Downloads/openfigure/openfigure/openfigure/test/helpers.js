// Tiny well-formedness checks (no XML dependency): balanced tags and no duplicate attributes.
export function duplicateAttributes(svg) {
  const bad = [];
  for (const m of svg.matchAll(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*\/?>/g)) {
    const names = [...m[2].matchAll(/\s([\w:-]+)="/g)].map((x) => x[1]);
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) bad.push(`${m[1]} has duplicate ${dup}`);
  }
  return bad;
}
export function unbalanced(svg) {
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    if (m[4]) continue;
    if (m[1]) { if (stack.pop() !== m[2]) return `mismatched </${m[2]}>`; } else stack.push(m[2]);
  }
  return stack.length ? `unclosed <${stack.pop()}>` : null;
}

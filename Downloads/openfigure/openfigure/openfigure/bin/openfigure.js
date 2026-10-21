#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSvg, validateDocument } from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, ...args] = process.argv.slice(2);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

async function main() {
  if (cmd === 'render') {
    const [input, output] = args;
    if (!input) return usage();
    const doc = JSON.parse(await readFile(input, 'utf8'));
    const errs = validateDocument(doc);
    if (errs.length) { console.error('Invalid document:\n- ' + errs.join('\n- ')); process.exit(1); }
    const svg = renderSvg(doc);
    if (output) { await mkdir(dirname(resolve(output)), { recursive: true }); await writeFile(output, svg); console.log(`wrote ${output}`); } else process.stdout.write(svg);
  } else if (cmd === 'validate') {
    const errs = validateDocument(JSON.parse(await readFile(args[0], 'utf8')));
    if (errs.length) { console.error(errs.join('\n')); process.exit(1); } console.log('ok');
  } else if (cmd === 'serve') {
    const port = +(args[0] ?? process.env.PORT ?? 5173);
    createServer(async (req, res) => {
      let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
      if (p === '/' || p === '\\') { res.writeHead(302, { location: '/src/editor/index.html' }); return res.end(); }
      const file = join(root, p);
      if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); return res.end('not found'); }
      try { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file)); } catch { res.writeHead(500); res.end('error'); }
    }).listen(port, () => console.log(`openfigure editor: http://localhost:${port}/`));
  } else usage();
}
function usage() { console.log('usage:\n  openfigure serve [port]\n  openfigure render <figure.json> [out.svg]\n  openfigure validate <figure.json>'); process.exit(cmd ? 1 : 0); }
main().catch((e) => { console.error(e.message); process.exit(1); });

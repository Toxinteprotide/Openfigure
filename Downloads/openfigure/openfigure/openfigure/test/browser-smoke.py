"""Optional browser smoke test. Needs: pip install playwright, a Chromium, and `npm run serve` (port 5199 here).
Usage: python3 test/browser-smoke.py [http://localhost:5199] [screenshot.png]"""
import sys
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5199'
shot = sys.argv[2] if len(sys.argv) > 2 else None
def count(pg): return pg.evaluate('window.__openfigure.store.doc.nodes.length')
with sync_playwright() as p:
    kw = {'executable_path': '/opt/pw-browsers/chromium'} if __import__('os').path.exists('/opt/pw-browsers/chromium') else {}
    b = p.chromium.launch(**kw); pg = b.new_page(viewport={'width': 1400, 'height': 860})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(base + '/src/editor/index.html'); pg.evaluate('localStorage.clear()'); pg.reload()
    assert count(pg) == 0
    # search + click-to-add
    pg.fill('#search', 'kinase'); assert pg.locator('.asset').count() == 1
    pg.click('.asset'); assert count(pg) == 1
    pg.fill('#search', 'antibody'); pg.click('.asset'); assert count(pg) == 2
    # drag first asset with the mouse; it must move and be undoable
    pg.evaluate("window.__openfigure.setSel([])")
    n0 = pg.evaluate('window.__openfigure.store.doc.nodes[1]'); x0 = n0['x']  # topmost node
    box = pg.locator(f'svg [data-id="{n0["id"]}"]').first.bounding_box()
    pg.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2); pg.mouse.down()
    pg.mouse.move(box['x'] + box['width']/2 + 120, box['y'] + box['height']/2 + 40, steps=6); pg.mouse.up()
    x1 = pg.evaluate('window.__openfigure.store.doc.nodes[1].x'); assert x1 > x0 + 50, (x0, x1)
    pg.keyboard.press('Control+z'); assert abs(pg.evaluate('window.__openfigure.store.doc.nodes[1].x') - x0) < 0.01
    pg.keyboard.press('Control+Shift+z')
    # connect tool
    ids = pg.evaluate('window.__openfigure.store.doc.nodes.map(n => n.id)')
    pg.keyboard.press('c')
    for i in ids: pg.locator(f'svg [data-id="{i}"]').first.click()
    assert pg.evaluate("window.__openfigure.store.doc.nodes.filter(n => n.type==='connector').length") == 1
    # recolour a part via inspector, delete connector, autosave
    pg.keyboard.press('Delete'); assert pg.evaluate("window.__openfigure.store.doc.nodes.filter(n => n.type==='connector').length") == 0
    pg.wait_for_timeout(700); assert 'Saved' in pg.inner_text('#save-status')
    pg.reload(); assert count(pg) == 2, 'autosave restore'
    pg.click('#btn-example'); pg.wait_for_timeout(500); assert count(pg) > 15
    if shot: pg.screenshot(path=shot)
    assert not errs, errs
    print('browser smoke ok', len(ids), 'nodes dragged/connected; example nodes', count(pg)); b.close()

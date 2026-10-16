const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const http = require('node:http');
const path = require('node:path');

test('image zoom anchors to pointer, drag pans, double-click resets; HTML is untouched', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7XkAAAAASUVORK5CYII=', 'base64');
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/image.png' ? 'image/png' : 'text/html');
    res.end(req.url === '/image.png' ? png : '<html><body><img src="/image.png"></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url + '/image.png');
    await page.addScriptTag({ path: path.resolve(__dirname, '../viewer.js') });
    const state = () => page.locator('img').evaluate(img => {
      const m = new DOMMatrix(getComputedStyle(img).transform);
      return { x: m.e, y: m.f, scale: m.a };
    });
    const initial = await state();
    assert.equal(initial.scale, 1);
    await page.mouse.move(400, 300);
    await page.mouse.wheel(0, -350);
    await page.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('img')).transform).a > 1);
    const zoom = await state();
    assert.ok(Math.abs((400 - zoom.x) / zoom.scale - (400 - initial.x)) < 0.001);
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(450, 340);
    await page.mouse.up();
    const pan = await state();
    assert.ok(Math.abs(pan.x - zoom.x - 50) < 0.001);
    assert.ok(Math.abs(pan.y - zoom.y - 40) < 0.001);
    await page.mouse.dblclick(450, 340);
    assert.deepEqual(await state(), initial);
    await page.goto(url + '/');
    await page.addScriptTag({ path: path.resolve(__dirname, '../viewer.js') });
    assert.equal(await page.locator('img').getAttribute('style'), null);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

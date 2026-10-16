const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const http = require('node:http');
const path = require('node:path');

test('image zoom anchors to pointer, drag pans, double-click resets; HTML is untouched', async () => {
  let png;
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/image.png' ? 'image/png' : 'text/html');
    res.end(req.url === '/image.png' ? png : '<html><body><img src="/image.png"></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    png = Buffer.from(await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      return canvas.toDataURL().split(',')[1];
    }), 'base64');
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url + '/image.png');
    await page.evaluate(() => {
      window.browser = { runtime: { onMessage: { addListener(listener) { window.viewerMessage = listener; } } } };
    });
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
    const matrix = () => page.locator('img').evaluate(img => {
      const m = new DOMMatrix(getComputedStyle(img).transform);
      const center = new DOMPoint(img.naturalWidth / 2, img.naturalHeight / 2).matrixTransform(m);
      const bounds = img.getBoundingClientRect();
      return { a: m.a, b: m.b, x: center.x, y: center.y, width: bounds.width, height: bounds.height };
    });
    const rotate = degrees => page.evaluate(degrees => window.viewerMessage({ type: 'image-viewer-rotate', degrees }), degrees);
    assert.equal(await page.evaluate(() => window.viewerMessage({ type: 'image-viewer-ready' })), true);
    await page.mouse.wheel(0, -350);
    await page.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('img')).transform).a > 1);
    const beforeRotate = await matrix();
    await rotate(90);
    const clockwise = await matrix();
    assert.equal(clockwise.a, 0);
    assert.ok(clockwise.b > 0);
    assert.ok(Math.abs(clockwise.width - beforeRotate.height) < 0.001);
    assert.ok(Math.abs(clockwise.height - beforeRotate.width) < 0.001);
    assert.ok(Math.abs(clockwise.x - beforeRotate.x) < 0.001);
    assert.ok(Math.abs(clockwise.y - beforeRotate.y) < 0.001);
    await rotate(-90);
    assert.deepEqual(await matrix(), beforeRotate);
    for (let i = 0; i < 4; i++) await rotate(90);
    assert.deepEqual(await matrix(), beforeRotate);
    await rotate(-90);
    assert.ok((await matrix()).b < 0);
    await page.setViewportSize({ width: 80, height: 120 });
    await page.waitForFunction(() => document.querySelector('img').getBoundingClientRect().height <= 120);
    const fitted = await matrix();
    assert.ok(fitted.width <= 80 && fitted.height <= 120);
    assert.equal(fitted.x, 40);
    assert.equal(fitted.y, 60);
    await page.goto(url + '/');
    await page.addScriptTag({ path: path.resolve(__dirname, '../viewer.js') });
    assert.equal(await page.locator('img').getAttribute('style'), null);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('native menu actions appear only for viewer tabs and send the chosen direction', async () => {
  const items = new Map();
  const sent = [];
  let shown, clicked, ready = true, refreshed = 0;
  const browser = {
    menus: {
      create: item => items.set(item.id, item),
      update: async (id, update) => Object.assign(items.get(id), update),
      refresh: () => refreshed++,
      onShown: { addListener: listener => { shown = listener; } },
      onClicked: { addListener: listener => { clicked = listener; } }
    },
    tabs: { sendMessage: async (id, message, options) => {
      sent.push({ id, ...message, ...options });
      if (!ready) throw new Error('No receiver');
      return true;
    } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8'), { browser });
  assert.equal(items.size, 2);
  assert.ok([...items.values()].every(item => !item.visible));
  await shown({ contexts: ['image'], frameId: 0 }, { id: 7 });
  assert.ok([...items.values()].every(item => item.visible));
  await clicked({ menuItemId: 'rotate-clockwise', frameId: 0 }, { id: 7 });
  assert.deepEqual(sent.at(-1), { id: 7, type: 'image-viewer-rotate', degrees: 90, frameId: 0 });
  await clicked({ menuItemId: 'rotate-counterclockwise', frameId: 0 }, { id: 7 });
  assert.equal(sent.at(-1).degrees, -90);
  ready = false;
  await shown({ contexts: ['image'] }, { id: 8 });
  assert.ok([...items.values()].every(item => !item.visible));
  await clicked({ menuItemId: 'rotate-clockwise' }, { id: 8 });
  await shown({ contexts: ['page'] }, { id: 7 });
  assert.ok([...items.values()].every(item => !item.visible));
  assert.equal(refreshed, 3);
});

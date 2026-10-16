// SPDX-License-Identifier: GPL-2.0-only
const rotations = {
  "rotate-clockwise": 90,
  "rotate-counterclockwise": -90
};

for (const [id, degrees] of Object.entries(rotations)) {
  browser.menus.create({
    id,
    title: degrees > 0 ? "Rotate clockwise" : "Rotate counterclockwise",
    contexts: ["image"],
    visible: false
  });
}

// Show these actions only where the image viewer is actually running.
browser.menus.onShown.addListener(async (info, tab) => {
  let visible = false;
  if (tab?.id !== undefined && info.contexts.includes("image")) {
    try {
      visible = await browser.tabs.sendMessage(tab.id, { type: "image-viewer-ready" }, { frameId: info.frameId ?? 0 }) === true;
    } catch { /* Ordinary pages and restricted URLs have no viewer. */ }
  }
  await Promise.all(Object.keys(rotations).map(id => browser.menus.update(id, { visible })));
  browser.menus.refresh();
});

browser.menus.onClicked.addListener(async (info, tab) => {
  const degrees = rotations[info.menuItemId];
  if (!degrees || tab?.id === undefined) return;
  try {
    await browser.tabs.sendMessage(tab.id, { type: "image-viewer-rotate", degrees }, { frameId: info.frameId ?? 0 });
  } catch { /* The image tab may have closed or navigated away. */ }
});

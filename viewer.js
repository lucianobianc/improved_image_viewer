(() => {
  // Firefox wraps standalone raster images in an HTML image document.
  if (!document.contentType.startsWith("image/")) return;
  const image = document.querySelector("img");
  if (!image) return;

  function start() {
    if (!image.naturalWidth || !image.naturalHeight) return;
    let scale, x, y, drag;
    let angle = 0;
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    Object.assign(document.documentElement.style, {
      background: "#202124", overflow: "hidden", height: "100%"
    });
    Object.assign(document.body.style, { margin: "0", overflow: "hidden" });
    image.removeAttribute("width");
    image.removeAttribute("height");
    image.style.cssText = `position:fixed;left:0;top:0;margin:0;padding:0;border:0;max-width:none;max-height:none;width:${width}px;height:${height}px;transform-origin:0 0;cursor:grab;user-select:none;touch-action:none;`;
    image.draggable = false;
    image.title = "Scroll to zoom · Drag to pan · Right-click to rotate · Double-click to fit";
    function render() {
      image.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${angle}deg) translate(${-width / 2}px, ${-height / 2}px)`;
    }
    function fit() {
      const sideways = angle % 180 !== 0;
      scale = Math.min(1, innerWidth / (sideways ? height : width), innerHeight / (sideways ? width : height));
      x = innerWidth / 2;
      y = innerHeight / 2;
      render();
    }
    window.addEventListener("wheel", event => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      const next = Math.max(Math.min(0.01, innerWidth / width, innerHeight / height), Math.min(32, scale * Math.exp(-delta * 0.002)));
      x = event.clientX - (event.clientX - x) * next / scale;
      y = event.clientY - (event.clientY - y) * next / scale;
      scale = next;
      render();
    }, { passive: false });
    image.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      image.setPointerCapture(event.pointerId);
      image.style.cursor = "grabbing";
    });
    image.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.id) return;
      x += event.clientX - drag.x;
      y += event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      render();
    });
    function release() { drag = undefined; image.style.cursor = "grab"; }
    image.addEventListener("pointerup", release);
    image.addEventListener("pointercancel", release);
    image.addEventListener("lostpointercapture", release);
    image.addEventListener("dblclick", fit);
    window.addEventListener("resize", fit);
    browser.runtime.onMessage.addListener(message => {
      if (message.type === "image-viewer-ready") return Promise.resolve(true);
      if (message.type === "image-viewer-rotate" && [90, -90].includes(message.degrees)) {
        angle = (angle + message.degrees + 360) % 360;
        render();
      }
    });
    fit();
  }
  if (image.complete) start();
  else image.addEventListener("load", start, { once: true });
})();

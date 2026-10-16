# Improved Image Viewer

A Firefox 142+ extension for images opened directly in a browser tab. Scroll to zoom
around the mouse pointer, drag with the left mouse button to pan, and double-click
to fit the image to the window. Right-click the image and choose **Rotate clockwise**
or **Rotate counterclockwise** to turn it 90° around its center. Zoom and position
are preserved when rotating; fitting and resizing keep the chosen orientation.
Resizing the window also fits the image.
Ordinary web pages are left unchanged. Standalone SVG documents are not supported.

## Develop

Requires Node.js 24 and npm. Run `npm ci`, then `npm run lint`, `npm test`, and
`npm run build`. The automated interaction tests require Chromium at
`/usr/bin/chromium` (override with `CHROMIUM_PATH`).

In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary
Add-on**, and select `manifest.json`. Open a PNG or JPEG directly in a tab to try
the controls. Alternatively, with Firefox installed, use `npm start`.
Temporary add-ons are removed when Firefox closes. The build ZIP in
`web-ext-artifacts/` needs Mozilla signing for normal permanent installation.

The extension requests access to all sites so it can recognize image tabs at any
URL; it acts only on image documents, makes no network requests, and stores no data.
Firefox restricts extensions on some privileged URLs and Mozilla domains.

## License

Licensed under the GNU General Public License, version 2 only
(`GPL-2.0-only`). See [LICENSE](LICENSE) for the full text.

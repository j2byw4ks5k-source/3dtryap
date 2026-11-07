const { chromium } = require('playwright');
(async () => {
  const [,, file, out, clip] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  await p.goto('file://' + file);
  const [x, y, w, h] = (clip || '0,0,1100,900').split(',').map(Number);
  await p.screenshot({ path: out, clip: { x, y, width: w, height: h }, fullPage: true });
  await b.close();
})();

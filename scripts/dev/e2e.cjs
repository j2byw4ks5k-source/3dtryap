// スマホ相当でホーム→出題→回答→結果まで操作し、スクリーンショットを撮る
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('#start', { timeout: 20000 });
  await p.screenshot({ path: out + '/m-home.png' });
  await p.click('#start');
  await p.waitForSelector('.opt');
  await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/m-q1.png', fullPage: true });
  await p.click('.opt[data-i="0"]');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '/m-a1.png', fullPage: true });
  for (let i = 0; i < 9; i++) {
    await p.click('#next');
    await p.waitForSelector('.opt:not([disabled])');
    if (i === 3) { await p.waitForTimeout(400); await p.screenshot({ path: out + '/m-q5.png', fullPage: true }); }
    await p.click('.opt[data-i="1"]');
    await p.waitForTimeout(200);
  }
  await p.click('#next');
  await p.waitForSelector('.result');
  await p.screenshot({ path: out + '/m-result.png', fullPage: true });
  await p.click('#home');
  await p.click('#gallery');
  await p.waitForTimeout(800);
  await p.screenshot({ path: out + '/m-gallery.png' });
  await p.click('#back');
  await p.click('#stats');
  await p.screenshot({ path: out + '/m-stats.png', fullPage: true });
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();

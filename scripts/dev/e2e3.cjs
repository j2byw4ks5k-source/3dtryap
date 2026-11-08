// 指定形式の問題が出るまで進め、出題時の画面（表示範囲のみ）を撮る
const { chromium, devices } = require('playwright');
(async () => {
  const [, , out, want, mode, level, hint] = process.argv;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)));
  p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 300)));
  await p.goto('http://localhost:4173/');
  await p.evaluate(([m, l]) => localStorage.setItem('kukan-trainer.settings', JSON.stringify({ mode: m, level: +l, count: 0, lock: false })), [mode, level]);
  await p.reload();
  await p.waitForSelector('#start', { timeout: 20000 });
  await p.click('#start');
  for (let i = 0; i < 30; i++) {
    await p.waitForSelector('.opt:not([disabled])');
    const tag = await p.textContent('#tag');
    if (tag.startsWith(want)) {
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${out}/x-q.png` });
      if (hint === '1') { await p.click('#hint'); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/x-h.png` }); }
      console.log('found', tag);
      break;
    }
    await p.click('.opt[data-i="0"]');
    await p.click('#next');
  }
  await b.close();
})();

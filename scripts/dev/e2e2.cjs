// 三面図モードとヒントの動作確認
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  p.on('pageerror', (e) => errs.push(String(e)));
  const play = async (mode, level, n, tag, hint) => {
    await p.goto('http://localhost:4173/');
    await p.evaluate(([mode, level]) => localStorage.setItem('kukan-trainer.settings', JSON.stringify({ mode, level, count: 10, lock: false })), [mode, level]);
    await p.reload();
    await p.waitForSelector('#start', { timeout: 20000 });
    await p.click('#start');
    for (let i = 0; i < n; i++) {
      await p.waitForSelector('.opt:not([disabled])');
      await p.waitForTimeout(400);
      const kind = (await p.textContent('#tag')).split('｜')[0];
      if (hint && await p.isVisible('#hint')) { await p.click('#hint'); await p.waitForTimeout(300); }
      await p.screenshot({ path: `${out}/${tag}-${i}-q.png`, fullPage: true });
      await p.click('.opt[data-i="0"]');
      await p.waitForTimeout(1200);
      await p.screenshot({ path: `${out}/${tag}-${i}-a.png` });
      console.log(tag, i, kind, await p.textContent('.res'));
      await p.click('#next');
    }
  };
  await play('ortho', 2, 4, 'or', false);
  await play('section', 2, 1, 'hs', true);
  await play('view', 2, 1, 'hv', true);
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();

// 問題生成の動作確認：HTML に問題を並べる
import { writeFileSync } from 'node:fs';
import { initKernel } from '../../src/geometry/kernel';
import { makeQuestion, type Level } from '../../src/quiz/generator';
const w = await initKernel();
let html = `<meta charset="utf-8"><style>body{font:12px sans-serif}.q{display:flex;gap:8px;align-items:center;border-bottom:1px solid #ccc;padding:4px}
.o{display:flex;flex-direction:column;align-items:center;width:130px}.fig{width:120px;height:120px;border:1px solid #ddd}.ok .fig{border:3px solid #0a0}.t{width:160px}</style>`;
const t0 = performance.now();
let fail = 0;
for (let i = 0; i < 40; i++) {
  const lv = ((i % 3) + 1) as Level;
  const ts = performance.now();
  try {
    const q = makeQuestion(w, i % 2 ? 'section' : 'view', lv);
    html += `<div class="q"><div class="t">L${lv} ${q.kind} ${q.shape.id} ${q.shape.name}<br>${q.view ?? ''} n=${q.frame.n.map((v) => v.toFixed(2))} d=${q.d?.toFixed(1) ?? ''}<br>${(performance.now() - ts).toFixed(0)}ms</div>` +
      q.options.map((o) => `<div class="o ${o.correct ? 'ok' : ''}">${o.svg}<span>${o.note}</span></div>`).join('') + '</div>';
  } catch (e) { fail++; console.log(e); }
}
writeFileSync(process.argv[2] ?? 'q.html', html);
console.log(`40 questions ${(performance.now() - t0).toFixed(0)}ms fail=${fail}`);

// 問題生成の動作確認：HTML に問題を並べる（3D 選択肢は等角投影の線画で代用）
import { writeFileSync } from 'node:fs';
import { initKernel } from '../../src/geometry/kernel';
import { makeQuestion, type Kind, type Level } from '../../src/quiz/generator';
import { projectHLR } from '../../src/geometry/hlr';
import { makeFrame } from '../../src/geometry/frame';
import { bboxOf } from '../../src/geometry/mesh';
import { drawingSVG } from '../../src/render/svg2d';
const w = await initKernel();
const kinds = (process.argv[3] ?? 'section,view,ortho3d,missing,wrongview').split(',') as Kind[];
const N = Number(process.argv[4] ?? 40);
const iso = makeFrame([1, -1.45, 0.95], [0, 0, 1]);
let html = `<meta charset="utf-8"><style>body{font:12px sans-serif}.q{display:flex;gap:8px;align-items:center;border-bottom:1px solid #ccc;padding:4px}
.o{display:flex;flex-direction:column;align-items:center;width:130px}.fig{width:120px;height:120px;border:1px solid #ddd}.ok .fig{border:3px solid #0a0}.t{width:160px}.board-svg{width:220px;height:200px;border:1px solid #888}</style>`;
const t0 = performance.now();
let fail = 0;
for (let i = 0; i < N; i++) {
  const lv = ((i % 3) + 1) as Level;
  const ts = performance.now();
  try {
    const q = makeQuestion(w, kinds[i % kinds.length], lv);
    const ms = (performance.now() - ts).toFixed(0);
    html += `<div class="q"><div class="t">L${lv} ${q.kind} ${q.shape.id} ${q.shape.name}<br>${q.view ?? ''}<br>${ms}ms</div>${q.board ?? ''}` +
      q.options.map((o) => {
        const fig = o.svg ?? drawingSVG(projectHLR(o.mesh!, iso, { hidden: false }), bboxOf(o.mesh!).size * 1.5);
        return `<div class="o ${o.correct ? 'ok' : ''}">${fig}<span>${o.label ?? ''} ${o.note}</span></div>`;
      }).join('') + '</div>';
  } catch (e) { fail++; console.log(e); }
}
writeFileSync(process.argv[2] ?? 'q.html', html);
console.log(`${N} questions ${(performance.now() - t0).toFixed(0)}ms fail=${fail}`);

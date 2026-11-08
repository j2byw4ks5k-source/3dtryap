// 検証用：全形状の 正面/平面/右側面図 + 断面 を1枚の HTML に並べる
import { writeFileSync } from 'node:fs';
import { initKernel } from '../../src/geometry/kernel';
import { SHAPES, buildShape } from '../../src/shapes';
import { toTriMesh, bboxOf } from '../../src/geometry/mesh';
import { projectHLR } from '../../src/geometry/hlr';
import { viewFrame, makeFrame } from '../../src/geometry/frame';
import { sectionPolys } from '../../src/geometry/section';
import { drawingSVG, sectionSVG } from '../../src/render/svg2d';

const w = await initKernel();
const ids = process.argv[2] ? process.argv[2].split(',') : null;
let html = `<meta charset="utf-8"><style>body{font:12px sans-serif;background:#fff;color:#111}
.row{display:flex;gap:6px;align-items:center;margin:4px 0;border-bottom:1px solid #ddd}
.fig{width:120px;height:120px;border:1px solid #eee}.n{width:150px}</style>`;
const t0 = performance.now();
let tHLR = 0;
for (const d of SHAPES.filter((s) => !ids || ids.includes(s.id))) {
  const m = buildShape(w, d);
  const t = toTriMesh(m);
  const bb = bboxOf(t);
  const span = bb.size * 1.15;
  const t1 = performance.now();
  const views = (['front', 'top', 'right'] as const).map((v) => drawingSVG(projectHLR(t, viewFrame(v)), span));
  tHLR += performance.now() - t1;
  const cz = (bb.min[2] + bb.max[2]) / 2, cy = (bb.min[1] + bb.max[1]) / 2;
  const secZ = sectionSVG(sectionPolys(m, makeFrame([0, 0, 1], [0, 1, 0]), cz), span);
  const secY = sectionSVG(sectionPolys(m, makeFrame([0, -1, 0], [0, 0, 1]), -cy), span);
  html += `<div class="row"><div class="n">${d.id} ${d.name}</div>${views.join('')}<span>Z断面→</span>${secZ}<span>Y断面→</span>${secY}</div>`;
}
writeFileSync(process.argv[3] ?? 'sheet.html', html);
console.log(`done ${(performance.now() - t0).toFixed(0)}ms, HLR total ${tHLR.toFixed(0)}ms`);

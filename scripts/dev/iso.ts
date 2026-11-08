// 形状の等角線画＋三面図を並べた確認用 HTML
import { writeFileSync } from 'node:fs';
import { initKernel } from '../../src/geometry/kernel';
import { SHAPES, buildShape } from '../../src/shapes';
import { toTriMesh, bboxOf } from '../../src/geometry/mesh';
import { projectHLR } from '../../src/geometry/hlr';
import { makeFrame, viewFrame } from '../../src/geometry/frame';
import { drawingSVG } from '../../src/render/svg2d';
const w = await initKernel();
const pre = process.argv[2] ?? 'H';
const iso = makeFrame([1, -1.45, 0.95], [0, 0, 1]);
let html = `<meta charset="utf-8"><style>body{font:12px sans-serif}.r{display:flex;gap:4px;align-items:center;border-bottom:1px solid #ccc}.fig{width:110px;height:110px}.n{width:130px}</style>`;
for (const d of SHAPES.filter((s) => s.id.startsWith(pre))) {
  const t = toTriMesh(buildShape(w, d));
  const sp = bboxOf(t).size * 1.15;
  html += `<div class="r"><div class="n">${d.id} ${d.name}</div>${drawingSVG(projectHLR(t, iso, { hidden: false }), sp * 1.2)}${(['front', 'top', 'right'] as const).map((v) => drawingSVG(projectHLR(t, viewFrame(v)), sp)).join('')}</div>`;
}
writeFileSync(process.argv[3], html);

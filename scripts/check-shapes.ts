// 全形状を生成し、多様体として正常か・体積・三角形数・生成時間を確認
import { initKernel } from '../src/geometry/kernel';
import { SHAPES, buildShape } from '../src/shapes';

const w = await initKernel();
let ng = 0;
const ids = new Set<string>();
for (const d of SHAPES) {
  if (ids.has(d.id)) { console.log('DUP', d.id); ng++; }
  ids.add(d.id);
  const t0 = performance.now();
  try {
    const m = buildShape(w, d);
    const st = m.status();
    const vol = m.volume();
    const parts = m.decompose().length;
    const bb = m.boundingBox();
    const ok = st === 'NoError' && vol > 1 && parts === 1;
    if (!ok) ng++;
    console.log(`${ok ? 'OK ' : 'NG '} ${d.id} ${d.name.padEnd(18, '　')} vol=${vol.toFixed(0).padStart(6)} tri=${String(m.numTri()).padStart(5)} parts=${parts} ${(performance.now() - t0).toFixed(0)}ms bb=[${bb.min.map((v) => v.toFixed(0))}]..[${bb.max.map((v) => v.toFixed(0))}] ${st}`);
  } catch (e) {
    ng++;
    console.log('ERR', d.id, d.name, e);
  }
}
console.log(`total=${SHAPES.length} ng=${ng}`);

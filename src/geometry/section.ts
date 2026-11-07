// 断面計算：平面 n·p = d で切断した断面ポリゴン（観察座標 u,v）
import type { Manifold } from 'manifold-3d';
import { worldToLocalMat4, type Frame } from './frame';
import type { V2 } from './vec';

export type Polys = V2[][];

export function sectionPolys(m: Manifold, f: Frame, d: number): Polys {
  const local = m.transform(worldToLocalMat4(f) as never);
  const cs = local.slice(d);
  const polys = cs.toPolygons().map((p) => p.map((q) => [q[0], q[1]] as V2));
  cs.delete();
  local.delete();
  return polys;
}

export function polysArea(polys: Polys): number {
  let a = 0;
  for (const p of polys)
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
      a += x1 * y2 - x2 * y1;
    }
  return a / 2; // 外周 CCW 正・穴 CW 負 → 合計 = 正味面積
}

/** 切断後に観察者から見える側（-n 側）の立体 */
export function trimmedPart(m: Manifold, f: Frame, d: number): Manifold {
  return m.trimByPlane([-f.n[0], -f.n[1], -f.n[2]], -d);
}

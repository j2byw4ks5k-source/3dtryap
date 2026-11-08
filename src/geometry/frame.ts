// 観察座標系：n = 観察者側を向く法線、up = 図の上方向
// 2D 座標 (x, y) = (u·p, v·p)、u = v × n（右方向）
import { cross, dot, norm, sub, scale, type V3, type V2 } from './vec';

export interface Frame {
  n: V3; // 観察者へ向かう向き（視線方向は -n）
  u: V3; // 図の右
  v: V3; // 図の上
}

export function makeFrame(n: V3, upHint: V3): Frame {
  const nn = norm(n);
  // up を n に直交化
  let v = sub(upHint, scale(nn, dot(upHint, nn)));
  if (Math.hypot(...v) < 1e-6) v = Math.abs(nn[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  v = norm(sub(v, scale(nn, dot(v, nn))));
  const u = norm(cross(v, nn));
  return { n: nn, u, v };
}

export const toLocal2 = (f: Frame, p: V3): V2 => [dot(f.u, p), dot(f.v, p)];

/** world→local（行 = u, v, n）の列優先 4x4 行列（manifold.transform 用） */
export function worldToLocalMat4(f: Frame): number[] {
  const { u, v, n } = f;
  // 行列 M の行 = u, v, n。列優先で格納
  return [u[0], v[0], n[0], 0, u[1], v[1], n[1], 0, u[2], v[2], n[2], 0, 0, 0, 0, 1];
}

/** 標準の矢視（Z 上、正面 = -Y 側から +Y を見る、第三角法） */
export type ViewName = 'front' | 'back' | 'right' | 'left' | 'top' | 'bottom';
export const VIEWS: Record<ViewName, { label: string; n: V3; up: V3 }> = {
  front: { label: '正面図', n: [0, -1, 0], up: [0, 0, 1] },
  back: { label: '背面図', n: [0, 1, 0], up: [0, 0, 1] },
  right: { label: '右側面図', n: [1, 0, 0], up: [0, 0, 1] },
  left: { label: '左側面図', n: [-1, 0, 0], up: [0, 0, 1] },
  top: { label: '平面図', n: [0, 0, 1], up: [0, 1, 0] },
  bottom: { label: '下面図', n: [0, 0, -1], up: [0, -1, 0] },
};
export const viewFrame = (name: ViewName) => makeFrame(VIEWS[name].n, VIEWS[name].up);

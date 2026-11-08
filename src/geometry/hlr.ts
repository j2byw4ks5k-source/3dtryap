// 隠れ線処理付きの正射影図（Hidden Line Removal）
// 1) 稜線（二面角が閾値以上）＋輪郭線（表裏が切り替わる辺）を抽出
// 2) 辺を細分し、各区間の中点から観察者方向へレイを飛ばして遮蔽判定
import { BufferAttribute, BufferGeometry, DoubleSide, Ray, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { TriMesh } from './mesh';
import { bboxOf } from './mesh';
import type { Frame } from './frame';
import type { V2, V3 } from './vec';

export interface Seg {
  a: V2;
  b: V2;
  hidden: boolean;
}
export interface Drawing {
  segs: Seg[];
}

const FEATURE_COS = Math.cos((20 * Math.PI) / 180);

interface Prepared {
  mesh: TriMesh;
  bvh: MeshBVH;
  faceN: Float32Array;
  edges: { a: number; b: number; f1: number; f2: number; feature: boolean }[];
  size: number;
}

const cache = new WeakMap<TriMesh, Prepared>();

function prepare(mesh: TriMesh): Prepared {
  const hit = cache.get(mesh);
  if (hit) return hit;
  const { pos, idx } = mesh;
  const nt = idx.length / 3;
  const faceN = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    const i0 = idx[t * 3] * 3, i1 = idx[t * 3 + 1] * 3, i2 = idx[t * 3 + 2] * 3;
    const ax = pos[i1] - pos[i0], ay = pos[i1 + 1] - pos[i0 + 1], az = pos[i1 + 2] - pos[i0 + 2];
    const bx = pos[i2] - pos[i0], by = pos[i2 + 1] - pos[i0 + 1], bz = pos[i2 + 2] - pos[i0 + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    faceN[t * 3] = nx / l; faceN[t * 3 + 1] = ny / l; faceN[t * 3 + 2] = nz / l;
  }
  const nv = pos.length / 3;
  const map = new Map<number, number>();
  const edges: Prepared['edges'] = [];
  for (let t = 0; t < nt; t++) {
    for (let k = 0; k < 3; k++) {
      const a = idx[t * 3 + k], b = idx[t * 3 + ((k + 1) % 3)];
      const key = Math.min(a, b) * nv + Math.max(a, b);
      const e = map.get(key);
      if (e === undefined) {
        map.set(key, edges.length);
        edges.push({ a, b, f1: t, f2: -1, feature: false });
      } else edges[e].f2 = t;
    }
  }
  for (const e of edges) {
    if (e.f2 < 0) { e.feature = true; continue; }
    const d = faceN[e.f1 * 3] * faceN[e.f2 * 3] + faceN[e.f1 * 3 + 1] * faceN[e.f2 * 3 + 1] + faceN[e.f1 * 3 + 2] * faceN[e.f2 * 3 + 2];
    e.feature = d < FEATURE_COS;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(new BufferAttribute(idx, 1));
  const bvh = new MeshBVH(g);
  const p: Prepared = { mesh, bvh, faceN, edges, size: bboxOf(mesh).size };
  cache.set(mesh, p);
  return p;
}

const _ray = new Ray();
const _o = new Vector3();
const _d = new Vector3();

export function projectHLR(mesh: TriMesh, f: Frame, opts: { hidden?: boolean } = {}): Drawing {
  const P = prepare(mesh);
  const { pos } = mesh;
  const { faceN, edges, bvh, size } = P;
  const eps = size * 1e-3;
  const step = size / 120;
  const [nx, ny, nz] = f.n;
  const sgn = (t: number) => {
    const d = faceN[t * 3] * nx + faceN[t * 3 + 1] * ny + faceN[t * 3 + 2] * nz;
    return d > 1e-4 ? 1 : d < -1e-4 ? -1 : 0;
  };
  _d.set(nx, ny, nz);
  const segs: Seg[] = [];
  const proj = (x: number, y: number, z: number): V2 => [
    f.u[0] * x + f.u[1] * y + f.u[2] * z,
    f.v[0] * x + f.v[1] * y + f.v[2] * z,
  ];

  for (const e of edges) {
    let draw = e.feature;
    if (!draw && e.f2 >= 0) {
      const s1 = sgn(e.f1), s2 = sgn(e.f2);
      draw = s1 !== s2 && (s1 === 1 || s2 === 1);
    }
    if (!draw) continue;
    const A: V3 = [pos[e.a * 3], pos[e.a * 3 + 1], pos[e.a * 3 + 2]];
    const B: V3 = [pos[e.b * 3], pos[e.b * 3 + 1], pos[e.b * 3 + 2]];
    const a2 = proj(...A), b2 = proj(...B);
    const plen = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
    if (plen < size * 1e-4) continue; // 視線方向に平行な辺は点になる
    // 外向きオフセット（隣接面法線の平均）
    let ox = faceN[e.f1 * 3], oy = faceN[e.f1 * 3 + 1], oz = faceN[e.f1 * 3 + 2];
    if (e.f2 >= 0) { ox += faceN[e.f2 * 3]; oy += faceN[e.f2 * 3 + 1]; oz += faceN[e.f2 * 3 + 2]; }
    const ol = Math.hypot(ox, oy, oz) || 1;
    ox = (ox / ol) * eps; oy = (oy / ol) * eps; oz = (oz / ol) * eps;

    const n = Math.max(1, Math.ceil(plen / step));
    let curStart = 0;
    let curHidden: boolean | null = null;
    const emit = (t0: number, t1: number, h: boolean) => {
      if (h && opts.hidden === false) return;
      segs.push({
        a: [a2[0] + (b2[0] - a2[0]) * t0, a2[1] + (b2[1] - a2[1]) * t0],
        b: [a2[0] + (b2[0] - a2[0]) * t1, a2[1] + (b2[1] - a2[1]) * t1],
        hidden: h,
      });
    };
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      _o.set(
        A[0] + (B[0] - A[0]) * t + ox + nx * eps,
        A[1] + (B[1] - A[1]) * t + oy + ny * eps,
        A[2] + (B[2] - A[2]) * t + oz + nz * eps,
      );
      _ray.set(_o, _d);
      const h = !!bvh.raycastFirst(_ray, DoubleSide);
      if (curHidden === null) curHidden = h;
      else if (h !== curHidden) {
        emit(curStart, i / n, curHidden);
        curStart = i / n;
        curHidden = h;
      }
    }
    if (curHidden !== null) emit(curStart, 1, curHidden);
  }
  return { segs };
}

/** 3D 表示用の稜線（線分の座標列） */
export function featureEdgePositions(mesh: TriMesh): Float32Array {
  const P = prepare(mesh);
  const out: number[] = [];
  for (const e of P.edges) {
    if (!e.feature) continue;
    for (const v of [e.a, e.b]) out.push(mesh.pos[v * 3], mesh.pos[v * 3 + 1], mesh.pos[v * 3 + 2]);
  }
  return new Float32Array(out);
}

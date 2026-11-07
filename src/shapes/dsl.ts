// 形状記述用 DSL。座標は mm 相当、Z が上。
// 生成途中の Manifold は track() で記録し、完成後に一括解放する（WASM メモリ対策）。
import type { Manifold, ManifoldToplevel } from 'manifold-3d';

export type Axis = 'x' | 'y' | 'z';
export type P2 = [number, number];
export type P3 = [number, number, number];

export const SEG = 64; // 円の分割数（5.6°/分割 → 稜線判定閾値 20° より十分小さい）

export function makeDSL(w: ManifoldToplevel) {
  const { Manifold } = w;
  const made: Manifold[] = [];
  const T = (m: Manifold) => (made.push(m), m);

  /** Z 軸方向の形状 (p,q,h) を指定軸方向へ回す。軸 x: (h,p,q)、軸 y: (p,h,q) */
  const orient = (m: Manifold, axis: Axis): Manifold => {
    if (axis === 'z') return m;
    if (axis === 'x') return T(m.transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1] as never));
    // (p,q,h) -> (p,h,q) は鏡映になるので (p,-h,q) の回転 + h 反転で表現
    return T(m.rotate([90, 0, 0]));
  };
  /** 軸方向範囲 [a0,a1]、断面中心 (c1,c2) へ配置。c1,c2 は軸 z:(x,y) / x:(y,z) / y:(x,z) */
  const place = (m: Manifold, axis: Axis, a0: number, a1: number, c1 = 0, c2 = 0): Manifold => {
    // m は z∈[0, a1-a0] で作られている前提
    if (axis === 'z') return T(m.translate([c1, c2, a0]));
    if (axis === 'x') return T(orient(m, 'x').translate([a0, c1, c2]));
    // rotate X +90°: (x,y,z)->(x,-z,y)。z∈[0,L] → y∈[-L,0]
    return T(orient(m, 'y').translate([c1, a1, c2]));
  };

  const S = {
    w,
    T,
    /** 最小・最大座標で直方体 */
    box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
      return T(T(Manifold.cube([x1 - x0, y1 - y0, z1 - z0])).translate([x0, y0, z0]));
    },
    /** 中心とサイズで直方体 */
    cbox(sx: number, sy: number, sz: number, c: P3 = [0, 0, 0]) {
      return T(T(Manifold.cube([sx, sy, sz], true)).translate(c));
    },
    cyl(axis: Axis, r: number, a0: number, a1: number, c1 = 0, c2 = 0, seg = SEG) {
      return place(T(Manifold.cylinder(a1 - a0, r, r, seg)), axis, a0, a1, c1, c2);
    },
    cone(axis: Axis, r0: number, r1: number, a0: number, a1: number, c1 = 0, c2 = 0, seg = SEG) {
      // y 軸は向きが反転するので r0/r1 を入れ替える
      const [ra, rb] = axis === 'y' ? [r1, r0] : [r0, r1];
      return place(T(Manifold.cylinder(a1 - a0, Math.max(ra, 1e-3), rb, seg)), axis, a0, a1, c1, c2);
    },
    /** 正多角柱（外接円半径 r、回転 deg） */
    prism(axis: Axis, n: number, r: number, a0: number, a1: number, c1 = 0, c2 = 0, deg = 0) {
      const m = T(T(Manifold.cylinder(a1 - a0, r, r, n)).rotate([0, 0, deg]));
      return place(m, axis, a0, a1, c1, c2);
    },
    sphere(r: number, c: P3 = [0, 0, 0]) {
      return T(T(Manifold.sphere(r, SEG)).translate(c));
    },
    /** 2D 多角形を押し出し。座標は軸 z:(x,y) / x:(y,z) / y:(x,z) */
    extrude(axis: Axis, poly: P2[] | P2[][], a0: number, a1: number, twist = 0, scaleTop: number | P2 = 1) {
      // 注意：軸 y の場合 scaleTop は a0 側に効く
      const pts = (Array.isArray(poly[0][0]) ? poly : [poly]) as P2[][];
      // 多角形の向き（CW/CCW）に依存しないよう EvenOdd で CrossSection 化
      const cs = w.CrossSection.ofPolygons(pts as never, 'EvenOdd');
      const st: P2 = typeof scaleTop === 'number' ? [scaleTop, scaleTop] : scaleTop; // 数値を渡すと Y 倍率が 0 になるため配列で渡す
      const m = T(Manifold.extrude(cs, a1 - a0, twist ? 16 : 0, twist, st));
      cs.delete();
      return place(m, axis, a0, a1);
    },
    /** 回転体：プロファイル (r, h) を軸まわりに回転。c1,c2 は軸の位置 */
    revolve(axis: Axis, profile: P2[], c1 = 0, c2 = 0, deg = 360) {
      const m = T(Manifold.revolve([profile] as never, SEG, deg));
      if (axis === 'z') return T(m.translate([c1, c2, 0]));
      if (axis === 'x') return T(orient(m, 'x').translate([0, c1, c2]));
      return T(T(m.rotate([-90, 0, 0])).translate([c1, 0, c2])); // (x,y,z)->(x,z,-y): h→+y
    },
    hull(pts: P3[]) {
      return T(Manifold.hull(pts));
    },
    U(...ms: Manifold[]) {
      return T(Manifold.union(ms));
    },
    D(a: Manifold, ...bs: Manifold[]) {
      return T(Manifold.difference([a, ...bs]));
    },
    I(...ms: Manifold[]) {
      return T(Manifold.intersection(ms));
    },
    move(m: Manifold, x: number, y: number, z: number) {
      return T(m.translate([x, y, z]));
    },
    rot(m: Manifold, x: number, y: number, z: number) {
      return T(m.rotate([x, y, z]));
    },
    /** 平面 n·p = d より n 側だけ残す */
    keep(m: Manifold, n: P3, d: number) {
      // manifold は offset を「単位法線方向の距離」と解釈するため正規化する
      const l = Math.hypot(...n);
      return T(m.trimByPlane([n[0] / l, n[1] / l, n[2] / l], d / l));
    },
    mirror(m: Manifold, n: P3) {
      return T(m.mirror(n));
    },
    // ---- 2D ユーティリティ ----
    rect(x0: number, y0: number, x1: number, y1: number): P2[] {
      return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    },
    circle(r: number, cx = 0, cy = 0, n = SEG): P2[] {
      return Array.from({ length: n }, (_, i) => {
        const t = (2 * Math.PI * i) / n;
        return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as P2;
      });
    },
    ngon(n: number, r: number, deg = 0, cx = 0, cy = 0): P2[] {
      return Array.from({ length: n }, (_, i) => {
        const t = (2 * Math.PI * i) / n + (deg * Math.PI) / 180;
        return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as P2;
      });
    },
    /** 角丸長方形（中心、幅、高さ、R） */
    rrect(w: number, h: number, r: number, cx = 0, cy = 0, n = 16): P2[] {
      const pts: P2[] = [];
      const c: P2[] = [[w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r], [w / 2 - r, -h / 2 + r]];
      c.forEach(([x, y], k) => {
        for (let i = 0; i <= n; i++) {
          const t = ((k + i / n) * Math.PI) / 2;
          pts.push([cx + x + r * Math.cos(t), cy + y + r * Math.sin(t)]);
        }
      });
      return pts;
    },
    /** 長穴（中心間距離 L、幅 W、X 方向） */
    slot(L: number, W: number, cx = 0, cy = 0, n = 24): P2[] {
      const r = W / 2, pts: P2[] = [];
      for (let i = 0; i <= n; i++) {
        const t = -Math.PI / 2 + (Math.PI * i) / n;
        pts.push([cx + L / 2 + r * Math.cos(t), cy + r * Math.sin(t)]);
      }
      for (let i = 0; i <= n; i++) {
        const t = Math.PI / 2 + (Math.PI * i) / n;
        pts.push([cx - L / 2 + r * Math.cos(t), cy + r * Math.sin(t)]);
      }
      return pts;
    },
  };

  /** 生成で作った中間オブジェクトを解放（結果は残す） */
  const cleanup = (keepM: Manifold) => {
    for (const m of made) if (m !== keepM) m.delete();
    made.length = 0;
  };
  return { S, cleanup };
}

export type DSL = ReturnType<typeof makeDSL>['S'];

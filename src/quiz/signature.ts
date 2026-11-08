// 図の同一判定：ラスタ化して近傍許容で比較（選択肢の重複を防ぐ）
import type { Drawing } from '../geometry/hlr';
import type { Polys } from '../geometry/section';
import type { V2 } from '../geometry/vec';
import { boundsOf, drawingPts, polysPts } from '../render/svg2d';

const N = 64;

function rasterLines(lines: [V2, V2][], cx: number, cy: number, span: number, grid: Uint8Array) {
  const cell = span / N;
  for (const [a, b] of lines) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / (cell * 0.5)));
    for (let i = 0; i <= n; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n;
      const gx = Math.floor((x - cx) / cell + N / 2), gy = Math.floor((y - cy) / cell + N / 2);
      if (gx >= 0 && gy >= 0 && gx < N && gy < N) grid[gy * N + gx] = 1;
    }
  }
}

export interface Sig { ch: Uint8Array[] }

export function drawingSig(d: Drawing, span: number): Sig {
  const b = boundsOf(drawingPts(d));
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const vis = new Uint8Array(N * N), hid = new Uint8Array(N * N);
  rasterLines(d.segs.filter((s) => !s.hidden).map((s) => [s.a, s.b]), cx, cy, span, vis);
  rasterLines(d.segs.filter((s) => s.hidden).map((s) => [s.a, s.b]), cx, cy, span, hid);
  for (let i = 0; i < hid.length; i++) if (vis[i]) hid[i] = 0; // 外形線優先
  return { ch: [vis, hid] };
}

export function polysSig(p: Polys, span: number): Sig {
  const b = boundsOf(polysPts(p));
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const edge = new Uint8Array(N * N);
  const lines: [V2, V2][] = [];
  for (const q of p) for (let i = 0; i < q.length; i++) lines.push([q[i], q[(i + 1) % q.length]]);
  rasterLines(lines, cx, cy, span, edge);
  return { ch: [edge] };
}

function near(g: Uint8Array, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < N && Y < N && g[Y * N + X]) return true;
    }
  return false;
}

/** 0 = 同一、値が大きいほど異なる（不一致セル数 / 総セル数） */
export function sigDiff(A: Sig, B: Sig): number {
  let miss = 0, tot = 0;
  for (let c = 0; c < A.ch.length; c++) {
    const a = A.ch[c], b = B.ch[c];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (a[y * N + x]) { tot++; if (!near(b, x, y)) miss++; }
        if (b[y * N + x]) { tot++; if (!near(a, x, y)) miss++; }
      }
  }
  return tot ? miss / tot : 0;
}

// 選択肢どうしが「見て明らかに違う」と言える最小差（小さすぎると正解と区別できない誤答になる）
export const sameSig = (A: Sig, B: Sig) => sigDiff(A, B) < 0.12;

/** 解説文で「同じ」と言い切るための厳しめ判定 */
export const strictSame = (A: Sig, B: Sig) => sigDiff(A, B) < 0.04;

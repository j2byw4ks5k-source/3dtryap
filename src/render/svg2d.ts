// 2D 図（投影図・断面）を SVG 文字列に変換
import type { Drawing } from '../geometry/hlr';
import type { Polys } from '../geometry/section';
import type { V2 } from '../geometry/vec';

export interface Box2 { minX: number; minY: number; maxX: number; maxY: number }

export function boundsOf(pts: Iterable<V2>): Box2 {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of pts) {
    b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x);
    b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
  }
  return b;
}
export function* drawingPts(d: Drawing) { for (const s of d.segs) { yield s.a; yield s.b; } }
export function* polysPts(p: Polys) { for (const q of p) yield* q; }

/** 図の中心に置き、span（全図共通の表示範囲 mm）で正方形 viewBox を作る */
function viewBox(b: Box2, span: number) {
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const h = span / 2;
  // SVG は y 下向きなので y を反転して扱う（-y を使う）
  return `${(cx - h).toFixed(2)} ${(-cy - h).toFixed(2)} ${span.toFixed(2)} ${span.toFixed(2)}`;
}

/** 端点を共有する線分を折れ線に連結（破線パターンが線分ごとにリセットされないように） */
export function chain(segs: { a: V2; b: V2 }[]): V2[][] {
  const key = (p: V2) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const adj = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [key(s.a), key(s.b)]) {
      const l = adj.get(k);
      if (l) l.push(i); else adj.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const out: V2[][] = [];
  const extend = (line: V2[]) => {
    for (;;) {
      const end = line[line.length - 1];
      const next = (adj.get(key(end)) ?? []).find((j) => !used[j]);
      if (next === undefined) return;
      used[next] = 1;
      const s = segs[next];
      line.push(key(s.a) === key(end) ? s.b : s.a);
    }
  };
  segs.forEach((s, i) => {
    if (used[i]) return;
    used[i] = 1;
    const line: V2[] = [s.a, s.b];
    extend(line);
    line.reverse();
    extend(line);
    out.push(line);
  });
  return out;
}

export function drawingSVG(d: Drawing, span: number, opts: { cls?: string } = {}): string {
  const b = boundsOf(drawingPts(d));
  const path = (lines: V2[][]) =>
    lines.map((l) => 'M' + l.map(([x, y]) => `${x.toFixed(2)} ${(-y).toFixed(2)}`).join('L')).join('');
  const hid = path(chain(d.segs.filter((s) => s.hidden)));
  const vis = path(chain(d.segs.filter((s) => !s.hidden)));
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${opts.cls ?? 'fig'}" viewBox="${viewBox(b, span)}">` +
    `<path d="${hid}" class="hid" fill="none" stroke="currentColor" stroke-width="${(span * 0.011).toFixed(3)}" stroke-dasharray="${(span * 0.03).toFixed(2)} ${(span * 0.022).toFixed(2)}" stroke-linecap="butt"/>` +
    `<path d="${vis}" class="vis" fill="none" stroke="currentColor" stroke-width="${(span * 0.018).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;
}

let hatchSeq = 0;
export function sectionSVG(p: Polys, span: number, opts: { cls?: string } = {}): string {
  const b = boundsOf(polysPts(p));
  const id = `hatch${hatchSeq++}`;
  const dPath = p.map((q) => 'M' + q.map(([x, y]) => `${x.toFixed(2)} ${(-y).toFixed(2)}`).join('L') + 'Z').join('');
  const hs = span / 22; // ハッチング間隔（図の大きさに比例）
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${opts.cls ?? 'fig'}" viewBox="${viewBox(b, span)}">` +
    `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${hs}" height="${hs}" patternTransform="rotate(45)">` +
    `<line x1="0" y1="0" x2="0" y2="${hs}" stroke="currentColor" stroke-width="${(hs * 0.12).toFixed(3)}" opacity="0.7"/></pattern></defs>` +
    `<path d="${dPath}" fill="url(#${id})" fill-rule="evenodd" stroke="currentColor" stroke-width="${(span * 0.018).toFixed(3)}" stroke-linejoin="round"/>` +
    `</svg>`;
}

// 応用問題：回転後の図／斜め矢視（補助投影）／3点を通る断面
import type { ManifoldToplevel } from 'manifold-3d';
import { makeFrame, VIEWS, viewFrame, type Frame, type ViewName } from '../geometry/frame';
import { featureEdgePositions, projectHLR, type Drawing } from '../geometry/hlr';
import type { TriMesh } from '../geometry/mesh';
import type { Polys } from '../geometry/section';
import { cross, dot, len, norm, sub, type V3 } from '../geometry/vec';
import { boundsOf, drawingPts, drawingSVG, polysPts, sectionSVG } from '../render/svg2d';
import { drawingSig, polysSig, sameSig, type Sig } from './signature';
import { getBuilt } from './shapeCache';
import {
  mirrorDrawing, mirrorPolys, pickDistinct, pickShape, rangeAlong, rnd, shuffle, upFor, validSection,
  type Level, type Option, type Question,
} from './generator';

type Axis = 'x' | 'y' | 'z';
interface Rot { axis: Axis; deg: number }

/** 空間に固定した軸まわりの回転（右ねじが正） */
export function rotateMesh(t: TriMesh, rots: Rot[]): TriMesh {
  const pos = new Float32Array(t.pos);
  for (const { axis, deg } of rots) {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      if (axis === 'x') { pos[i + 1] = y * c - z * s; pos[i + 2] = y * s + z * c; }
      else if (axis === 'y') { pos[i] = x * c + z * s; pos[i + 2] = -x * s + z * c; }
      else { pos[i] = x * c - y * s; pos[i + 1] = x * s + y * c; }
    }
  }
  return { pos, idx: t.idx };
}

const degText = (d: number) => `${d > 0 ? '+' : '−'}${Math.abs(d)}°`;
export const rotText = (rots: Rot[]) => rots.map((r, i) => `${i ? '、続けて' : ''}${r.axis.toUpperCase()}軸まわりに${degText(r.deg)}`).join('');
const spanOfDr = (drs: Drawing[]) => Math.max(...drs.map((d) => { const b = boundsOf(drawingPts(d)); return Math.max(b.maxX - b.minX, b.maxY - b.minY); })) * 1.12;

interface DrCand { dr: Drawing; note: string; sig?: Sig }

// ---------- 回転後の図 ----------
export function makeRotateQuestion(w: ManifoldToplevel, level: Level, weights?: Map<string, number>): Question | null {
  const def = pickShape(level, weights);
  const b = getBuilt(w, def);
  const axes: Axis[] = ['x', 'y', 'z'];
  const one = (): Rot => ({ axis: level === 1 ? 'z' : rnd(axes), deg: level >= 3 ? rnd([90, -90, 180, 90, -90]) : rnd([90, -90]) });
  let rots: Rot[] = [one()];
  if (level === 4) {
    let r2 = one();
    while (r2.axis === rots[0].axis) r2 = one();
    rots = [rots[0], { ...r2, deg: rnd([90, -90]) }];
  }
  const view: ViewName = level === 1 ? rnd<ViewName>(['front', 'top']) : rnd<ViewName>(['front', 'top', 'right']);
  const f = viewFrame(view);
  const span0 = b.bb.size * 1.12;
  const correct = projectHLR(rotateMesh(b.mesh, rots), f);
  const base = projectHLR(b.mesh, f);
  // 回転しても見え方が変わらない（対称な）場合は出題しない
  if (sameSig(drawingSig(correct, span0), drawingSig(base, span0))) return null;
  const cands: DrCand[] = [];
  if (rots.length === 2) cands.push({ dr: projectHLR(rotateMesh(b.mesh, [rots[1], rots[0]]), f), note: '回転の順番が逆です' });
  const rev = rots.map((r) => ({ ...r, deg: -r.deg }));
  if (rots.some((r) => Math.abs(r.deg) !== 180)) cands.push({ dr: projectHLR(rotateMesh(b.mesh, rev), f), note: '回転の向きが逆です' });
  for (const ax of shuffle(axes.filter((a) => a !== rots[0].axis)))
    cands.push({ dr: projectHLR(rotateMesh(b.mesh, [{ axis: ax, deg: rots[0].deg }, ...rots.slice(1)]), f), note: `${ax.toUpperCase()}軸まわりに回しています（回転軸が違う）` });
  cands.push({ dr: mirrorDrawing(correct), note: '左右が反転しています（鏡像）' });
  cands.push({ dr: base, note: '回転前の図です' });
  const head = cands.slice(0, 2);
  const chosen = pickDistinct<DrCand>({ dr: correct, note: '正解', sig: drawingSig(correct, span0) }, [...head, ...shuffle(cands.slice(2))], (c) => drawingSig(c.dr, span0));
  if (chosen.length < 4) return null;
  const span = spanOfDr(chosen.map((c) => c.dr));
  const opts: Option[] = shuffle(chosen.map((c, i) => ({ svg: drawingSVG(c.dr, span), note: c.note, correct: i === 0 })));
  return {
    kind: 'rotate', shape: def, frame: f, view, rot: rots[0], rots, showModel: true,
    prompt: `${rotText(rots)}回転させた後の${VIEWS[view].label}はどれ？`,
    options: opts, answer: opts.findIndex((o) => o.correct),
  };
}

// ---------- 斜め矢視（補助投影） ----------
/** 軸に平行でない大きな平面（斜面）の外向き法線 */
function inclinedFaceNormal(t: TriMesh, size: number): V3 | null {
  const groups = new Map<string, { n: V3; area: number }>();
  for (let i = 0; i < t.idx.length; i += 3) {
    const p = [0, 1, 2].map((k) => [t.pos[t.idx[i + k] * 3], t.pos[t.idx[i + k] * 3 + 1], t.pos[t.idx[i + k] * 3 + 2]] as V3);
    const c = cross(sub(p[1], p[0]), sub(p[2], p[0]));
    const a = len(c) / 2;
    if (a < 1e-6) continue;
    const n = norm(c);
    if (Math.max(...n.map(Math.abs)) > 0.98) continue; // 軸に平行な面は除外
    const key = n.map((v) => Math.round(v * 50)).join(',');
    const g = groups.get(key) ?? { n, area: 0 };
    g.area += a;
    groups.set(key, g);
  }
  const big = [...groups.values()].filter((g) => g.area > size * size * 0.06).sort((a, b) => b.area - a.area);
  return big.length ? rnd(big.slice(0, 2)).n : null;
}

const azRotate = (n: V3, deg: number): V3 => {
  const a = (deg * Math.PI) / 180;
  return norm([n[0] * Math.cos(a) - n[1] * Math.sin(a), n[0] * Math.sin(a) + n[1] * Math.cos(a), n[2]]);
};

export function makeAuxViewQuestion(w: ManifoldToplevel, level: Level, weights?: Map<string, number>): Question | null {
  const def = pickShape(level, weights);
  const b = getBuilt(w, def);
  const face = inclinedFaceNormal(b.mesh, b.bb.size);
  const presets: V3[] = [[1, -1, 0], [-1, -1, 0], [0, -1, 1], [1, 0, 1], [1, -1, 1], [-1, -1, 1], [1, 1, 0]].map((v) => norm(v as V3));
  const useFace = face && Math.random() < 0.7;
  const n = useFace ? face! : rnd(presets);
  const f = makeFrame(n, upFor(n));
  const span0 = b.bb.size * 1.12;
  const correct = projectHLR(b.mesh, f);
  const cands: DrCand[] = [];
  const near = (deg: number) => { const n2 = azRotate(n, deg); return projectHLR(b.mesh, makeFrame(n2, upFor(n2))); };
  cands.push({ dr: near(rnd([30, -30])), note: '見る方向が少しずれています（水平方向に30°）' });
  cands.push({ dr: mirrorDrawing(correct), note: '左右が反転しています（鏡像）' });
  if (correct.segs.some((s) => s.hidden)) cands.push({ dr: { segs: correct.segs.map((s) => ({ ...s, hidden: false })) }, note: '隠れ線を実線で描いています' });
  // 最も近い主投影方向の図
  const axisViews: ViewName[] = ['front', 'back', 'right', 'left', 'top', 'bottom'];
  const nearest = axisViews.map((v) => ({ v, d: dot(VIEWS[v].n, n) })).sort((a, c) => c.d - a.d)[0].v;
  cands.push({ dr: projectHLR(b.mesh, viewFrame(nearest)), note: `${VIEWS[nearest].label}です（斜めではなく軸方向から見た図）` });
  const nn: V3 = [-n[0], -n[1], -n[2]];
  cands.push({ dr: projectHLR(b.mesh, makeFrame(nn, upFor(nn))), note: '反対側から見た図です' });
  cands.push({ dr: near(rnd([-50, 50])), note: '見る方向がずれています（水平方向に50°）' });
  const head = shuffle(cands.slice(0, 2));
  const chosen = pickDistinct<DrCand>({ dr: correct, note: '正解', sig: drawingSig(correct, span0) }, [...head, ...shuffle(cands.slice(2))], (c) => drawingSig(c.dr, span0));
  if (chosen.length < 4) return null;
  const span = spanOfDr(chosen.map((c) => c.dr));
  const opts: Option[] = shuffle(chosen.map((c, i) => ({ svg: drawingSVG(c.dr, span), note: c.note, correct: i === 0 })));
  return {
    kind: 'aux', shape: def, frame: f, showModel: true,
    prompt: useFace ? '斜面に直交する矢印Aの方向から見た図（補助投影図）はどれ？' : '斜めの矢印Aの方向から見た図はどれ？',
    options: opts, answer: opts.findIndex((o) => o.correct),
  };
}

// ---------- 3点を通る断面 ----------
function edgeSegments(t: TriMesh, minLen: number): [V3, V3][] {
  const p = featureEdgePositions(t);
  const out: [V3, V3][] = [];
  for (let i = 0; i < p.length; i += 6) {
    const a: V3 = [p[i], p[i + 1], p[i + 2]], b: V3 = [p[i + 3], p[i + 4], p[i + 5]];
    if (len(sub(b, a)) >= minLen) out.push([a, b]);
  }
  return out;
}

const ISO: V3 = norm([1, -1.45, 0.95]);

function planeFrame(P: V3, Q: V3, R: V3): { f: Frame; d: number } | null {
  let n = cross(sub(Q, P), sub(R, P));
  if (len(n) < 1e-6) return null;
  n = norm(n);
  if (dot(n, ISO) < 0) n = [-n[0], -n[1], -n[2]]; // 観察者（初期視点）側から見る
  const f = makeFrame(n, upFor(n));
  return { f, d: dot(n, P) };
}

export function makePointsSectionQuestion(w: ManifoldToplevel, level: Level, weights?: Map<string, number>): Question | null {
  const def = pickShape(level, weights);
  const b = getBuilt(w, def);
  const size = b.bb.size;
  const edges = edgeSegments(b.mesh, size * 0.15);
  if (edges.length < 3) return null;
  const ts = level <= 2 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const pt = (): V3 => { const [a, c] = rnd(edges); const t = rnd(ts); return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t]; };
  for (let tries = 0; tries < 40; tries++) {
    const P = pt(), Q = pt(), R = pt();
    const ds = [len(sub(P, Q)), len(sub(Q, R)), len(sub(R, P))];
    if (Math.min(...ds) < size * 0.25) continue;
    if (len(cross(sub(Q, P), sub(R, P))) / 2 < size * size * 0.05) continue;
    const pf = planeFrame(P, Q, R);
    if (!pf) continue;
    if (Math.max(...pf.f.n.map(Math.abs)) > 0.995) continue; // 面と一致しやすい軸平行の平面は避ける
    const correct = validSection(b, pf.f, pf.d);
    if (!correct) continue;
    const span0 = size * 1.12;
    type C = { polys: Polys; note: string; sig?: Sig };
    const cands: C[] = [];
    // 2点は同じで3点目が違う面
    for (let k = 0; k < 6; k++) {
      const pf2 = planeFrame(P, Q, pt());
      if (!pf2) continue;
      const p2 = validSection(b, pf2.f, pf2.d);
      if (p2) { cands.push({ polys: p2, note: '点P・Qは通りますが、点Rを通っていない面の断面です' }); break; }
    }
    cands.push({ polys: mirrorPolys(correct), note: '左右が反転しています（反対側から見た断面）' });
    const r = rangeAlong(b, pf.f.n);
    for (const t of shuffle([0.2, -0.2, 0.3, -0.3])) {
      const p2 = validSection(b, pf.f, pf.d + (r.hi - r.lo) * t);
      if (p2) { cands.push({ polys: p2, note: '3点を通る面と平行にずれた面の断面です' }); break; }
    }
    for (let k = 0; k < 6; k++) {
      const pf2 = planeFrame(pt(), Q, R);
      if (!pf2) continue;
      const p2 = validSection(b, pf2.f, pf2.d);
      if (p2) { cands.push({ polys: p2, note: '点Pを通っていない面の断面です' }); break; }
    }
    const chosen = pickDistinct<C>({ polys: correct, note: '正解', sig: polysSig(correct, span0) }, cands, (c) => polysSig(c.polys, span0));
    if (chosen.length < 4) continue;
    const span = Math.max(...chosen.map((c) => { const bb = boundsOf(polysPts(c.polys)); return Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY); })) * 1.12;
    const opts: Option[] = shuffle(chosen.map((c, i) => ({ svg: sectionSVG(c.polys, span), note: c.note, correct: i === 0 })));
    return {
      kind: 'points', shape: def, frame: pf.f, d: pf.d, polys: correct, points: [P, Q, R], showModel: true,
      prompt: '3点P・Q・Rを通る平面で切断し、矢印の向きに見た断面はどれ？',
      options: opts, answer: opts.findIndex((o) => o.correct),
    };
  }
  return null;
}

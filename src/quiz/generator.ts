// 問題生成：正解図と「ありがちな間違い」の誤答を作る
import type { ManifoldToplevel } from 'manifold-3d';
import { SHAPES, type ShapeDef } from '../shapes';
import { makeFrame, VIEWS, viewFrame, type Frame, type ViewName } from '../geometry/frame';
import { projectHLR, type Drawing } from '../geometry/hlr';
import { sectionPolys, polysArea, type Polys } from '../geometry/section';
import { dot, type V3 } from '../geometry/vec';
import { boundsOf, drawingPts, drawingSVG, polysPts, sectionSVG } from '../render/svg2d';
import { drawingSig, polysSig, sameSig, type Sig } from './signature';
import { getBuilt, type Built } from './shapeCache';
import { makeOrtho3DQuestion, makeMissingViewQuestion, makeWrongViewQuestion } from './ortho';
import { makeRotateQuestion, makeAuxViewQuestion, makePointsSectionQuestion } from './advanced';

import type { TriMesh } from '../geometry/mesh';

export type Kind = 'section' | 'view' | 'ortho3d' | 'missing' | 'wrongview' | 'rotate' | 'aux' | 'points';
export type Mode = 'section' | 'view' | 'ortho' | 'adv' | 'mix';
export type Level = 1 | 2 | 3 | 4;
export const KIND_LABEL: Record<Kind, string> = {
  section: '断面当て',
  view: '矢視当て',
  ortho3d: '三面図→立体',
  missing: '不足する1面',
  wrongview: '三面図の誤り探し',
  rotate: '回転後の図',
  aux: '斜め矢視',
  points: '3点を通る断面',
};
export const ORTHO_KINDS: Kind[] = ['ortho3d', 'missing', 'wrongview'];
export const ADV_KINDS: Kind[] = ['rotate', 'aux', 'points'];

export interface Option {
  svg?: string; // 2D 図
  mesh?: TriMesh; // 3D 形状（UI 側で画像化）
  label?: string; // 図の名称など
  note: string;
  correct: boolean;
}
export interface Question {
  kind: Kind;
  shape: ShapeDef;
  prompt: string;
  options: Option[];
  answer: number;
  /** 3D 表示用 */
  frame: Frame;
  d?: number; // 断面の平面位置 n·p = d
  view?: ViewName;
  planeLabel?: string;
  /** 3D の代わりに最初に表示する図面（SVG） */
  board?: string;
  /** 回答前に 3D 形状を見せるか */
  showModel: boolean;
  /** 断面のヒント用（切断線） */
  polys?: Polys;
  /** 3点を通る断面：立体上の3点 */
  points?: V3[];
  /** 回転後の図：回転軸と角度（右ねじ正） */
  rot?: { axis: 'x' | 'y' | 'z'; deg: number };
  rots?: { axis: 'x' | 'y' | 'z'; deg: number }[];
}

export const rnd = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
export const shuffle = <T>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** 苦手度の重み付きで形状を選ぶ（weights: id → 重み） */
export function pickShape(level: Level, weights?: Map<string, number>, exclude?: string): ShapeDef {
  const pool = SHAPES.filter((s) => s.diff <= level && s.id !== exclude);
  // エキスパートでは上級部品・難しい形状を多めに
  const boost = (s: ShapeDef) => (level === 4 ? (s.cat === 'expert' ? 3 : s.diff === 3 ? 2 : 0.5) : 1);
  const ws = pool.map((s) => (weights?.get(s.id) ?? 1) * boost(s));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= ws[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}

// ---------- 断面 ----------
export const upFor = (n: V3): V3 => (Math.abs(n[2]) > 0.9 ? [0, n[2] > 0 ? 1 : -1, 0] : [0, 0, 1]);
export const AXIS_N: { n: V3; label: string }[] = [
  { n: [0, -1, 0], label: '正面側から' },
  { n: [1, 0, 0], label: '右側から' },
  { n: [0, 0, 1], label: '上から' },
  { n: [0, 1, 0], label: '背面側から' },
  { n: [-1, 0, 0], label: '左側から' },
];

export function rangeAlong(b: Built, n: V3) {
  let lo = Infinity, hi = -Infinity;
  const p = b.mesh.pos;
  for (let i = 0; i < p.length; i += 3) {
    const v = p[i] * n[0] + p[i + 1] * n[1] + p[i + 2] * n[2];
    lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  return { lo, hi };
}

/** 形状が変化する高さ（頂点の座標値）の中間を切断候補にする */
function candidateOffsets(b: Built, n: V3): number[] {
  const p = b.mesh.pos;
  const vals: number[] = [];
  for (let i = 0; i < p.length; i += 3) vals.push(p[i] * n[0] + p[i + 1] * n[1] + p[i + 2] * n[2]);
  vals.sort((a, c) => a - c);
  const lo = vals[0], hi = vals[vals.length - 1], span = hi - lo;
  const levels: number[] = [lo];
  for (const v of vals) if (v - levels[levels.length - 1] > 0.3) levels.push(v);
  const out: number[] = [];
  for (let i = 0; i + 1 < levels.length; i++)
    if (levels[i + 1] - levels[i] > span * 0.06) out.push((levels[i] + levels[i + 1]) / 2);
  for (const f of [0.3, 0.5, 0.7]) out.push(lo + span * f);
  return out.filter((d) => d > lo + span * 0.04 && d < hi - span * 0.04);
}

interface SecCand { polys: Polys; sig?: Sig; note: string }

export function validSection(b: Built, f: Frame, d: number): Polys | null {
  const p = sectionPolys(b.m, f, d);
  if (!p.length || polysArea(p) <= b.bb.size * b.bb.size * 0.01) return null;
  // 細い切れ端（小さな外周）を含む断面は見づらいので使わない
  if (p.some((q) => { const a = polysArea([q]); return a > 0 && a < b.bb.size * b.bb.size * 0.004; })) return null;
  return p;
}

export const mirrorPolys = (p: Polys): Polys => p.map((q) => q.map(([x, y]) => [-x, y] as [number, number]).reverse());

function obliqueNormal(level: Level): { n: V3; label: string } {
  const a = ((level >= 3 ? rnd([30, 45, 60]) : rnd([30, 45])) * Math.PI) / 180;
  const base = rnd(AXIS_N.slice(0, 3));
  // 基準法線を別の軸まわりに傾ける
  const n0 = base.n;
  let n: V3;
  if (Math.abs(n0[2]) > 0.5) n = rnd([[Math.sin(a), 0, Math.cos(a)], [0, -Math.sin(a), Math.cos(a)]] as V3[]);
  else if (Math.abs(n0[0]) > 0.5) n = rnd([[Math.cos(a), 0, Math.sin(a)], [Math.cos(a), -Math.sin(a), 0]] as V3[]);
  else n = rnd([[0, -Math.cos(a), Math.sin(a)], [Math.sin(a), -Math.cos(a), 0]] as V3[]);
  if (level >= 3 && Math.random() < (level === 4 ? 0.7 : 0.5)) {
    // 2軸傾斜（例：立方体の正六角形断面）
    const b = Math.PI / 5;
    n = [n[0] + Math.sin(b) * 0.6, n[1] - Math.sin(b) * 0.6, n[2] + 0.3];
    const l = Math.hypot(...n);
    n = [n[0] / l, n[1] / l, n[2] / l];
  }
  return { n, label: '斜めの面で' };
}

export function makeSectionQuestion(w: ManifoldToplevel, level: Level, weights?: Map<string, number>): Question | null {
  const def = pickShape(level, weights);
  const b = getBuilt(w, def);
  const useOblique = level >= 2 && Math.random() < (level === 4 ? 0.75 : level === 3 ? 0.55 : 0.3);
  const dir = useOblique ? obliqueNormal(level) : rnd(level === 1 ? AXIS_N.slice(0, 3) : AXIS_N);
  const f = makeFrame(dir.n, upFor(dir.n));
  let offsets = useOblique
    ? (() => { const r = rangeAlong(b, f.n); return [0.35, 0.5, 0.65].map((t) => r.lo + (r.hi - r.lo) * t); })()
    : candidateOffsets(b, f.n);
  offsets = shuffle(offsets);
  let correctD = NaN, correct: Polys | null = null;
  for (const d of offsets) if ((correct = validSection(b, f, d))) { correctD = d; break; }
  if (!correct) return null;

  const span0 = b.bb.size * 1.12;
  const cands: SecCand[] = [];
  // 誤答1：切断位置違い
  for (const d of offsets) if (d !== correctD) { const p = validSection(b, f, d); if (p) cands.push({ polys: p, note: '切断位置が違う断面です' }); }
  // 誤答2：鏡像（反対側から見た断面）
  cands.push({ polys: mirrorPolys(correct), note: '左右が反転しています（反対側から見た断面）' });
  // 誤答3：別方向の切断
  for (const a of shuffle(AXIS_N.slice(0, 3))) {
    const f2 = makeFrame(a.n, upFor(a.n));
    if (Math.abs(dot(f2.n, f.n)) > 0.99) continue;
    const r = rangeAlong(b, f2.n);
    const p = validSection(b, f2, (r.lo + r.hi) / 2);
    if (p) cands.push({ polys: p, note: '別の向きで切った断面です' });
  }
  // 誤答4：似た別形状
  const others = shuffle(SHAPES.filter((s) => s.cat === def.cat && s.id !== def.id)).slice(0, 2);
  for (const o of others) {
    const ob = getBuilt(w, o);
    const r0 = rangeAlong(b, f.n), r1 = rangeAlong(ob, f.n);
    const t = (correctD - r0.lo) / (r0.hi - r0.lo);
    const p = validSection(ob, f, r1.lo + (r1.hi - r1.lo) * t);
    if (p) cands.push({ polys: p, note: `別の形状（${o.name}）の断面です` });
  }
  const chosen = pickDistinct(
    { polys: correct, note: '正解', sig: polysSig(correct, span0) },
    shuffle(cands.slice(0, 1)).concat(cands.slice(1)), // 位置違い・鏡像を優先
    (c) => polysSig(c.polys, span0),
  );
  if (chosen.length < 4) return null;
  const span = Math.max(...chosen.map((c) => { const bb = boundsOf(polysPts(c.polys)); return Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY); })) * 1.12;
  const opts = shuffle(chosen.map((c, i) => ({ svg: sectionSVG(c.polys, span), note: c.note, correct: i === 0 })));
  return {
    kind: 'section', shape: def, frame: f, d: correctD, planeLabel: dir.label, showModel: true, polys: correct,
    prompt: `赤い面で切断し、矢印の向きに見た断面はどれ？`,
    options: opts, answer: opts.findIndex((o) => o.correct),
  };
}

export function pickDistinct<T extends { sig?: Sig }>(correct: T, cands: T[], sigOf: (c: T) => Sig): T[] {
  const out: T[] = [correct];
  // 優先順位を少しランダム化しつつ、重複しない3つを選ぶ
  for (const c of cands) {
    if (out.length >= 4) break;
    c.sig = sigOf(c);
    if (out.some((o) => sameSig(o.sig!, c.sig!))) continue;
    out.push(c);
  }
  return out;
}

// ---------- 矢視 ----------
const VIEW_POOL: Record<Level, ViewName[]> = {
  1: ['front', 'top', 'right'],
  2: ['front', 'top', 'right', 'left', 'back'],
  3: ['front', 'top', 'right', 'left', 'back', 'bottom'],
  4: ['front', 'top', 'right', 'left', 'back', 'bottom'],
};
export const mirrorDrawing = (d: Drawing): Drawing => ({ segs: d.segs.map((s) => ({ a: [-s.a[0], s.a[1]], b: [-s.b[0], s.b[1]], hidden: s.hidden })) });

interface ViewCand { dr: Drawing; note: string; sig?: Sig }

export function makeViewQuestion(w: ManifoldToplevel, level: Level, weights?: Map<string, number>): Question | null {
  const def = pickShape(level, weights);
  const b = getBuilt(w, def);
  const view = rnd(VIEW_POOL[level]);
  const f = viewFrame(view);
  const correct = projectHLR(b.mesh, f);
  const span0 = b.bb.size * 1.12;
  const cands: ViewCand[] = [];
  const hasHidden = correct.segs.some((s) => s.hidden);
  cands.push({ dr: mirrorDrawing(correct), note: '左右が反転しています（鏡像）' });
  if (hasHidden) {
    cands.push({ dr: { segs: correct.segs.map((s) => ({ ...s, hidden: false })) }, note: '隠れ線を実線で描いています' });
    cands.push({ dr: { segs: correct.segs.filter((s) => !s.hidden) }, note: '隠れ線が描かれていません' });
  }
  for (const v of shuffle(Object.keys(VIEWS) as ViewName[])) {
    if (v === view) continue;
    cands.push({ dr: projectHLR(b.mesh, viewFrame(v)), note: `${VIEWS[v].label}です（見る方向が違う）` });
  }
  for (const o of shuffle(SHAPES.filter((s) => s.cat === def.cat && s.id !== def.id)).slice(0, 2))
    cands.push({ dr: projectHLR(getBuilt(w, o).mesh, f), note: `別の形状（${o.name}）の図です` });
  // 紛らわしさ優先：鏡像・隠れ線系・別方向をランダムに混ぜる
  const head = shuffle(cands.slice(0, hasHidden ? 3 : 1)).slice(0, 2);
  const rest = shuffle(cands.filter((c) => !head.includes(c)));
  const chosen = pickDistinct({ dr: correct, note: '正解', sig: drawingSig(correct, span0) }, [...head, ...rest], (c) => drawingSig(c.dr, span0));
  if (chosen.length < 4) return null;
  const span = Math.max(...chosen.map((c) => { const bb = boundsOf(drawingPts(c.dr)); return Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY); })) * 1.12;
  const opts = shuffle(chosen.map((c, i) => ({ svg: drawingSVG(c.dr, span), note: c.note, correct: i === 0 })));
  return {
    kind: 'view', shape: def, frame: f, view, showModel: true,
    prompt: `矢印の方向から見た図（第三角法・隠れ線あり）はどれ？`,
    options: opts, answer: opts.findIndex((o) => o.correct),
  };
}

function kindFor(mode: Mode | Kind): Kind {
  if (mode === 'mix') return rnd<Kind>(['section', 'section', 'view', 'view', 'ortho3d', 'missing', 'wrongview', 'rotate', 'aux', 'points']);
  if (mode === 'ortho') return rnd(ORTHO_KINDS);
  if (mode === 'adv') return rnd(ADV_KINDS);
  return mode;
}

export function makeQuestion(w: ManifoldToplevel, mode: Mode | Kind, level: Level, weights?: Map<string, number>): Question {
  for (let i = 0; i < 20; i++) {
    const k = kindFor(mode);
    const q =
      k === 'section' ? makeSectionQuestion(w, level, weights)
      : k === 'view' ? makeViewQuestion(w, level, weights)
      : k === 'ortho3d' ? makeOrtho3DQuestion(w, level, weights)
      : k === 'missing' ? makeMissingViewQuestion(w, level, weights)
      : k === 'wrongview' ? makeWrongViewQuestion(w, level, weights)
      : k === 'rotate' ? makeRotateQuestion(w, level, weights)
      : k === 'aux' ? makeAuxViewQuestion(w, level, weights)
      : makePointsSectionQuestion(w, level, weights);
    if (q) return q;
  }
  throw new Error('問題を生成できませんでした');
}

// 三面図系の問題：三面図→立体／不足する1面／三面図の誤り探し
import type { ManifoldToplevel } from 'manifold-3d';
import { SHAPES, type ShapeDef } from '../shapes';
import { VIEWS, viewFrame, type ViewName } from '../geometry/frame';
import { projectHLR, type Drawing } from '../geometry/hlr';
import { toTriMesh as toTriMeshLocal, type TriMesh } from '../geometry/mesh';
import { boardSVG, boundsOf, drawingPts, drawingSVG, type BoardItem } from '../render/svg2d';
import { drawingSig, sameSig, strictSame, type Sig } from './signature';
import { getBuilt } from './shapeCache';
import { mirrorDrawing, pickDistinct, pickShape, rnd, shuffle, type Level, type Option, type Question } from './generator';

export type Slot = 'front' | 'top' | 'right';
const SLOTS: Slot[] = ['front', 'top', 'right'];
const SIG_SPAN = 100; // 形状間で比較するため固定スケール

interface ViewSet { dr: Record<Slot, Drawing>; sig: Record<Slot, Sig>; bb: { min: number[]; max: number[] } }

const viewCache = new Map<string, ViewSet>();
const dimsCache = new Map<string, number[]>();

function viewsOfMesh(mesh: TriMesh, bb: { min: number[]; max: number[] }): ViewSet {
  const dr = {} as Record<Slot, Drawing>, sig = {} as Record<Slot, Sig>;
  for (const s of SLOTS) {
    dr[s] = projectHLR(mesh, viewFrame(s));
    sig[s] = drawingSig(dr[s], SIG_SPAN);
  }
  return { dr, sig, bb };
}

export function viewsOf(w: ManifoldToplevel, def: ShapeDef): ViewSet {
  let v = viewCache.get(def.id);
  if (!v) {
    const b = getBuilt(w, def);
    v = viewsOfMesh(b.mesh, b.bb);
    viewCache.set(def.id, v);
  }
  return v;
}

/** 外形寸法（W,D,H）。似た大きさの形状を誤答候補にするため */
export function dimsOf(w: ManifoldToplevel, def: ShapeDef): number[] {
  let d = dimsCache.get(def.id);
  if (!d) {
    const { bb } = getBuilt(w, def);
    d = [0, 1, 2].map((k) => bb.max[k] - bb.min[k]);
    dimsCache.set(def.id, d);
  }
  return d;
}

/** 寸法が近い順に他の形状を返す */
function similarShapes(w: ManifoldToplevel, def: ShapeDef, n: number): ShapeDef[] {
  const d0 = dimsOf(w, def);
  return SHAPES.filter((s) => s.id !== def.id)
    .map((s) => {
      const d = dimsOf(w, s);
      return { s, k: d.reduce((a, v, i) => a + Math.abs(Math.log((v + 1) / (d0[i] + 1))), 0) + Math.random() * 0.15 };
    })
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.s);
}

export function mirrorMeshX(t: TriMesh): TriMesh {
  const pos = new Float32Array(t.pos);
  for (let i = 0; i < pos.length; i += 3) pos[i] = -pos[i];
  const idx = new Uint32Array(t.idx.length);
  for (let i = 0; i < idx.length; i += 3) { idx[i] = t.idx[i]; idx[i + 1] = t.idx[i + 2]; idx[i + 2] = t.idx[i + 1]; }
  return { pos, idx };
}

const viewBox2 = (bb: ViewSet['bb'], s: Slot): [number, number, number, number] =>
  s === 'front' ? [bb.min[0], bb.min[2], bb.max[0], bb.max[2]]
  : s === 'top' ? [bb.min[0], bb.min[1], bb.max[0], bb.max[1]]
  : [bb.min[1], bb.min[2], bb.max[1], bb.max[2]];

/** 第三角法の配置：正面図を基準に、平面図は上、右側面図は右 */
export function threeViewBoard(v: ViewSet, missing?: Slot): string {
  const { bb } = v;
  const W = bb.max[0] - bb.min[0], D = bb.max[1] - bb.min[1], H = bb.max[2] - bb.min[2];
  const g = Math.max(W, D, H) * 0.28;
  const at: Record<Slot, [number, number]> = { front: [0, 0], top: [0, H + g], right: [W + g, 0] };
  const items: BoardItem[] = SLOTS.map((s) => ({ dr: s === missing ? undefined : v.dr[s], box: viewBox2(bb, s), at: at[s], label: VIEWS[s].label }));
  return boardSVG(items);
}

// loose: 別解の除外（安全側）、strict: 解説文の「同じ」
const same = (a: ViewSet, b: ViewSet) => SLOTS.filter((s) => sameSig(a.sig[s], b.sig[s]));
const sameStrict = (a: ViewSet, b: ViewSet) => SLOTS.filter((s) => strictSame(a.sig[s], b.sig[s]));
const names = (ss: Slot[]) => ss.map((s) => VIEWS[s].label).join('・');

// ---------- 正解形状を少し変えた立体（紛らわしい誤答の素） ----------
interface Variant { mesh: TriMesh; vs: ViewSet; desc: string }

function bbOfMesh(t: TriMesh) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < t.pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], t.pos[i + k]); max[k] = Math.max(max[k], t.pos[i + k]); }
  return { min, max };
}

export function makeVariants(w: ManifoldToplevel, def: ShapeDef, n: number): Variant[] {
  const b = getBuilt(w, def);
  const { Manifold } = w;
  const [x0, y0, z0] = b.bb.min, [x1, y1, z1] = b.bb.max;
  const W = x1 - x0, D = y1 - y0, H = z1 - z0;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const sx = rnd([-1, 1]), sy = rnd([-1, 1]), sz = rnd([1, 1, -1]);
  const makers: (() => { m: import('manifold-3d').Manifold; desc: string })[] = [
    () => { // 角の切欠き
      const c = Manifold.cube([W * 0.4, D * 0.4, H * 0.4], true);
      const t = c.translate([sx > 0 ? x1 : x0, sy > 0 ? y1 : y0, sz > 0 ? z1 : z0]);
      const m = b.m.subtract(t); c.delete(); t.delete();
      return { m, desc: '角に切欠きがある' };
    },
    () => { // 稜の面取り（X 方向または Y 方向の上側の稜）
      const alongX = Math.random() < 0.5;
      const c = 0.35 * Math.min(alongX ? D : W, H);
      const nn: [number, number, number] = alongX ? [0, -sy, -sz] : [-sx, 0, -sz];
      const l = Math.SQRT2;
      const p0 = alongX ? sy * (sy > 0 ? y1 : y0) + sz * (sz > 0 ? z1 : z0) : sx * (sx > 0 ? x1 : x0) + sz * (sz > 0 ? z1 : z0);
      const m = b.m.trimByPlane([nn[0] / l, nn[1] / l, nn[2] / l], (-p0 + c) / l);
      return { m, desc: '稜が面取りされている' };
    },
    () => { // 中央の貫通穴（ランダムな軸）
      const ax = rnd(['x', 'y', 'z'] as const);
      const r = 0.16 * (ax === 'x' ? Math.min(D, H) : ax === 'y' ? Math.min(W, H) : Math.min(W, D));
      const L = Math.max(W, D, H) * 3;
      const c = Manifold.cylinder(L, r, r, 48, true);
      const rc = ax === 'z' ? c.translate([cx, cy, cz]) : ax === 'x' ? c.rotate([0, 90, 0]).translate([cx, cy, cz]) : c.rotate([90, 0, 0]).translate([cx, cy, cz]);
      const m = b.m.subtract(rc); c.delete(); rc.delete();
      return { m, desc: `${ax.toUpperCase()}方向の穴がある` };
    },
    () => { // 上面の溝
      const alongX = Math.random() < 0.5;
      const c = Manifold.cube(alongX ? [W * 3, D * 0.3, H * 0.4] : [W * 0.3, D * 3, H * 0.4], true);
      const t = c.translate([cx, cy, z1]);
      const m = b.m.subtract(t); c.delete(); t.delete();
      return { m, desc: '上面に溝がある' };
    },
  ];
  const out: Variant[] = [];
  for (const mk of shuffle(makers.slice())) {
    if (out.length >= n) break;
    const { m, desc } = mk();
    const vol = m.volume();
    if (m.status() === 'NoError' && vol > 1 && Math.abs(vol - b.m.volume()) > b.m.volume() * 0.01) {
      const mesh = toTriMeshLocal(m);
      out.push({ mesh, vs: viewsOfMesh(mesh, bbOfMesh(mesh)), desc });
    }
    m.delete();
  }
  return out;
}

// ---------- 三面図 → 立体 ----------
export function makeOrtho3DQuestion(w: ManifoldToplevel, level: Level, weights?: Map<string, number>): Question | null {
  const def = pickShape(level, weights);
  const b = getBuilt(w, def);
  const v = viewsOf(w, def);
  type C = { mesh: TriMesh; note: string; m: number; vs: ViewSet };
  const cands: C[] = [];
  // 正解を少し変えた立体（1〜2面だけ一致するものほど紛らわしい）
  const nVar = level === 1 ? 1 : level === 2 ? 2 : 3;
  const vars: C[] = [];
  for (const va of makeVariants(w, def, 4)) {
    if (same(v, va.vs).length === 3) continue;
    const sm = sameStrict(v, va.vs);
    const diff = SLOTS.filter((s) => !sm.includes(s));
    vars.push({ mesh: va.mesh, vs: va.vs, m: 10 + sm.length, note: `${va.desc}立体です。${sm.length ? `${names(sm)}は同じですが、` : ''}${names(diff)}が違います` });
  }
  vars.sort((a, c) => c.m - a.m);
  cands.push(...vars.slice(0, nVar));
  if (level >= 2) {
    const mm = mirrorMeshX(b.mesh);
    const mbb = { min: [-b.bb.max[0], b.bb.min[1], b.bb.min[2]], max: [-b.bb.min[0], b.bb.max[1], b.bb.max[2]] };
    const mv = viewsOfMesh(mm, mbb);
    const sm = sameStrict(v, mv);
    if (same(v, mv).length < 3) cands.push({ mesh: mm, vs: mv, m: 9.5, note: `鏡像（左右反転）の立体です。${names(SLOTS.filter((s) => !sm.includes(s)))}が違います` });
  }
  for (const o of similarShapes(w, def, 14)) {
    const ov = viewsOf(w, o);
    if (same(v, ov).length === 3) continue; // 三面図がほぼ一致 → これも正解になりうるので除外
    const sm = sameStrict(v, ov);
    const diff = SLOTS.filter((s) => !sm.includes(s));
    cands.push({
      mesh: getBuilt(w, o).mesh, vs: ov, m: sm.length + Math.random() * 0.5,
      note: sm.length ? `${names(sm)}は同じですが、${names(diff)}が違います（${o.name}）` : `三面図と一致しません（${o.name}）`,
    });
  }
  cands.sort((a, c) => c.m - a.m);
  const chosen: C[] = [{ mesh: b.mesh, vs: v, m: 9, note: '正解' }];
  for (const c of cands) {
    if (chosen.length >= 4) break;
    if (chosen.some((x) => same(x.vs, c.vs).length === 3)) continue;
    chosen.push(c);
  }
  if (chosen.length < 4) return null;
  const opts: Option[] = shuffle(chosen.map((c, i) => ({ mesh: c.mesh, note: c.note, correct: i === 0 })));
  return {
    kind: 'ortho3d', shape: def, frame: viewFrame('front'), showModel: false,
    board: threeViewBoard(v),
    prompt: 'この三面図（第三角法）で表される立体はどれ？',
    options: opts, answer: opts.findIndex((o) => o.correct),
  };
}

// ---------- 誤った図の候補（不足1面・誤り探しで共通） ----------
interface WrongCand { dr: Drawing; note: string; sig?: Sig }

function wrongViews(w: ManifoldToplevel, def: ShapeDef, v: ViewSet, slot: Slot, given: Slot[]): WrongCand[] {
  const correct = v.dr[slot];
  const out: WrongCand[] = [];
  const flip = slot === 'top' ? '上下' : '左右';
  const flipped: Drawing = slot === 'top'
    ? { segs: correct.segs.map((s) => ({ a: [s.a[0], -s.a[1]], b: [s.b[0], -s.b[1]], hidden: s.hidden })) }
    : mirrorDrawing(correct);
  out.push({ dr: flipped, note: `${flip}が反転しています` });
  if (correct.segs.some((s) => s.hidden)) {
    out.push({ dr: { segs: correct.segs.map((s) => ({ ...s, hidden: false })) }, note: '隠れ線を実線で描いています' });
    out.push({ dr: { segs: correct.segs.filter((s) => !s.hidden) }, note: '隠れ線が抜けています' });
  }
  const opposite: Record<Slot, ViewName> = { front: 'back', top: 'bottom', right: 'left' };
  const b = getBuilt(w, def);
  out.push({ dr: projectHLR(b.mesh, viewFrame(opposite[slot])), note: `${VIEWS[opposite[slot]].label}を描いています（見る向きが逆）` });
  for (const va of makeVariants(w, def, 3)) {
    if (given.every((g) => sameSig(v.sig[g], va.vs.sig[g]))) continue; // 別解になりうる
    out.push({ dr: va.vs.dr[slot], note: `${va.desc}立体の${VIEWS[slot].label}です` });
  }
  for (const o of similarShapes(w, def, 10)) {
    const ov = viewsOf(w, o);
    // 与えられた図がすべて一致する形状の図は、別解になりうるので使わない
    if (given.every((g) => sameSig(v.sig[g], ov.sig[g]))) continue;
    out.push({ dr: ov.dr[slot], note: `別の立体（${o.name}）の${VIEWS[slot].label}です` });
  }
  // 選ばれやすさに変化をつける（反転・隠れ線系を優先しつつ混ぜる）
  const head = shuffle(out.slice(0, 3)).slice(0, 2);
  return [...head, ...shuffle(out.filter((c) => !head.includes(c)))];
}

const spanOf = (drs: Drawing[]) => Math.max(...drs.map((d) => { const bb = boundsOf(drawingPts(d)); return Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY); })) * 1.12;

// ---------- 不足する1面 ----------
export function makeMissingViewQuestion(w: ManifoldToplevel, level: Level, weights?: Map<string, number>): Question | null {
  const def = pickShape(level, weights);
  const v = viewsOf(w, def);
  const slot: Slot = level === 1 ? rnd<Slot>(['right', 'right', 'top']) : rnd(SLOTS);
  const given = SLOTS.filter((s) => s !== slot);
  const span0 = getBuilt(w, def).bb.size * 1.12;
  const chosen = pickDistinct<WrongCand>(
    { dr: v.dr[slot], note: '正解', sig: drawingSig(v.dr[slot], span0) },
    wrongViews(w, def, v, slot, given),
    (c) => drawingSig(c.dr, span0),
  );
  if (chosen.length < 4) return null;
  const span = spanOf(chosen.map((c) => c.dr));
  const opts: Option[] = shuffle(chosen.map((c, i) => ({ svg: drawingSVG(c.dr, span), note: c.note, correct: i === 0 })));
  return {
    kind: 'missing', shape: def, frame: viewFrame(slot), view: slot, showModel: false,
    board: threeViewBoard(v, slot),
    prompt: `「？」に入る${VIEWS[slot].label}はどれ？`,
    options: opts, answer: opts.findIndex((o) => o.correct),
  };
}

// ---------- 三面図の誤り探し ----------
export function makeWrongViewQuestion(w: ManifoldToplevel, level: Level, weights?: Map<string, number>): Question | null {
  const def = pickShape(level, weights);
  const v = viewsOf(w, def);
  const slot = rnd(SLOTS);
  const span0 = getBuilt(w, def).bb.size * 1.12;
  const picked = pickDistinct<WrongCand>(
    { dr: v.dr[slot], note: '', sig: drawingSig(v.dr[slot], span0) },
    wrongViews(w, def, v, slot, SLOTS.filter((s) => s !== slot)),
    (c) => drawingSig(c.dr, span0),
  );
  if (picked.length < 2) return null;
  const wrong = picked[1];
  const span = getBuilt(w, def).bb.size * 1.12;
  // 表示順は第三角法の配置に合わせる（平面図・正面図・右側面図）
  const order: Slot[] = ['top', 'front', 'right'];
  const opts: Option[] = order.map((s) => ({
    svg: drawingSVG(s === slot ? wrong.dr : v.dr[s], span),
    label: VIEWS[s].label,
    note: s === slot ? `誤り：${wrong.note}` : '正しい図です',
    correct: s === slot,
  }));
  return {
    kind: 'wrongview', shape: def, frame: viewFrame(slot), view: slot, showModel: true,
    prompt: 'この立体の三面図のうち、誤っている図はどれ？',
    options: opts, answer: opts.findIndex((o) => o.correct),
  };
}

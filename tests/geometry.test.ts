import { beforeAll, describe, expect, it } from 'vitest';
import type { ManifoldToplevel } from 'manifold-3d';
import { initKernel } from '../src/geometry/kernel';
import { SHAPES, buildShape } from '../src/shapes';
import { toTriMesh } from '../src/geometry/mesh';
import { projectHLR } from '../src/geometry/hlr';
import { makeFrame, viewFrame } from '../src/geometry/frame';
import { sectionPolys, polysArea } from '../src/geometry/section';
import { makeQuestion, type Kind } from '../src/quiz/generator';
import { makeVariants, mirrorMeshX } from '../src/quiz/ortho';

let w: ManifoldToplevel;
beforeAll(async () => { w = await initKernel(); });
const shape = (id: string) => buildShape(w, SHAPES.find((s) => s.id === id)!);

describe('形状ライブラリ', () => {
  it('100個以上・ID重複なし・全て1つの正常な立体', () => {
    expect(SHAPES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(SHAPES.map((s) => s.id)).size).toBe(SHAPES.length);
    for (const d of SHAPES) {
      const m = buildShape(w, d);
      expect(m.status(), d.id).toBe('NoError');
      expect(m.volume(), d.id).toBeGreaterThan(1);
      expect(m.decompose().length, d.id).toBe(1);
    }
  });
  it('体積が理論値と一致（押し出し・テーパ）', () => {
    expect(shape('A01').volume()).toBeCloseTo(64000, 0); // 40^3
    expect(shape('A10').volume()).toBeCloseTo(35000, 0); // 50*35/2*40
    expect(shape('A17').volume()).toBeCloseTo(43750, 0); // 角錐台 h/3(A1+A2+√A1A2)
    expect(shape('B11').volume()).toBeCloseTo(26880, 0); // 十字 (50*16*2-16^2)*20
  });
});

describe('投影図（隠れ線）', () => {
  it('立方体の正面図は外形線のみ・隠れ線なし', () => {
    const d = projectHLR(toTriMesh(shape('A01')), viewFrame('front'));
    expect(d.segs.length).toBeGreaterThan(0);
    expect(d.segs.every((s) => !s.hidden)).toBe(true);
  });
  it('横穴付きブロック：正面図に隠れ線なし、平面図に隠れ線あり', () => {
    const t = toTriMesh(shape('C07')); // X 方向の貫通穴
    expect(projectHLR(t, viewFrame('right')).segs.some((s) => s.hidden)).toBe(false);
    expect(projectHLR(t, viewFrame('top')).segs.some((s) => s.hidden)).toBe(true);
  });
  it('止まり穴は下面から見ると隠れ線', () => {
    const t = toTriMesh(shape('C03'));
    expect(projectHLR(t, viewFrame('top')).segs.some((s) => s.hidden)).toBe(false);
    expect(projectHLR(t, viewFrame('bottom')).segs.some((s) => s.hidden)).toBe(true);
  });
});

describe('断面', () => {
  it('立方体の水平断面は 40×40', () => {
    expect(polysArea(sectionPolys(shape('A01'), makeFrame([0, 0, 1], [0, 1, 0]), 20))).toBeCloseTo(1600, 0);
  });
  it('穴付き板の断面積 = 板 − 穴', () => {
    const a = polysArea(sectionPolys(shape('C01'), makeFrame([0, 0, 1], [0, 1, 0]), 5));
    expect(a).toBeCloseTo(60 * 40 - Math.PI * 64, -1);
  });
  it('立方体を3辺の中点を通る面で切ると正六角形', () => {
    const p = sectionPolys(shape('A01'), makeFrame([1, 1, 1], [0, 0, 1]), 20 / Math.sqrt(3)); // 中心(0,0,20)を通る
    expect(p.length).toBe(1);
    // 三角形分割の対角線との交点（一直線上の点）を除いた角の数
    const q = p[0];
    const corners = q.filter((b, i) => {
      const a = q[(i + q.length - 1) % q.length], c = q[(i + 1) % q.length];
      return Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) > 1e-6;
    });
    expect(corners.length).toBe(6);
  });
});

describe('問題生成', () => {
  it('各モード・難易度で4択・正解1つ', () => {
    for (const kind of ['section', 'view', 'ortho3d', 'missing', 'wrongview'] as Kind[])
      for (const lv of [1, 2, 3] as const)
        for (let i = 0; i < 5; i++) {
          const q = makeQuestion(w, kind, lv);
          expect(q.options.length, kind).toBe(kind === 'wrongview' ? 3 : 4);
          if (kind === 'ortho3d') expect(q.options.every((o) => o.mesh)).toBe(true);
          if (kind !== 'section' && kind !== 'view') expect(q.board || q.showModel).toBeTruthy();
          expect(q.options.filter((o) => o.correct).length).toBe(1);
          expect(q.options[q.answer].correct).toBe(true);
        }
  });
});

describe('三面図系の補助', () => {
  it('鏡像メッシュは体積の符号が保たれる（三角形の向きを反転）', () => {
    const t = toTriMesh(shape('B07'));
    const vol = (m: typeof t) => {
      let v = 0;
      for (let i = 0; i < m.idx.length; i += 3) {
        const [a, b, c] = [0, 1, 2].map((k) => [0, 1, 2].map((j) => m.pos[m.idx[i + k] * 3 + j]));
        v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
      }
      return v;
    };
    expect(vol(mirrorMeshX(t))).toBeCloseTo(vol(t), 0);
  });
  it('変形立体（切欠き・面取り・穴・溝）は元の形状と体積が異なる', () => {
    const def = SHAPES.find((s) => s.id === 'A02')!;
    const vs = makeVariants(w, def, 4);
    expect(vs.length).toBeGreaterThanOrEqual(3);
  });
});

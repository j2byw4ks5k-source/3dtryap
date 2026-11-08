import type { ShapeDef } from './types';

export const puzzle: ShapeDef[] = [
  { id: 'G01', name: '○△□プラグ', cat: 'puzzle', diff: 3, build: (S) => S.I(S.cyl('z', 20, 0, 40), S.extrude('y', [[-21, 0], [21, 0], [0, 40]], -21, 21)) },
  { id: 'G02', name: '円柱の両側斜めカット（ノミ形）', cat: 'puzzle', diff: 3, build: (S) => S.I(S.cyl('z', 20, 0, 50), S.extrude('x', [[-21, 0], [21, 0], [21, 30], [0, 50], [-21, 30]], -21, 21)) },
  { id: 'G03', name: '立方体と球の共通部', cat: 'puzzle', diff: 3, build: (S) => S.I(S.cbox(40, 40, 40, [0, 0, 20]), S.sphere(26, [0, 0, 20])) },
  { id: 'G04', name: '立方体−球', cat: 'puzzle', diff: 3, build: (S) => S.D(S.cbox(40, 40, 40, [0, 0, 20]), S.sphere(25, [0, 0, 20])) },
  {
    id: 'G05', name: '3隅を落とした立方体', cat: 'puzzle', diff: 3,
    build: (S) => S.keep(S.keep(S.keep(S.cbox(40, 40, 40, [0, 0, 20]), [-1, -1, -1], -42), [1, 1, -1], -22), [-1, 1, -1], -42),
  },
  { id: 'G06', name: '面対角でV字に削った立方体', cat: 'puzzle', diff: 3, build: (S) => S.D(S.cbox(40, 40, 40, [0, 0, 20]), S.extrude('x', [[-21, 41], [21, 41], [0, 15]], -21, 21)) },
  { id: 'G07', name: '煙突付きの家', cat: 'puzzle', diff: 2, build: (S) => S.U(S.extrude('y', [[-25, 0], [25, 0], [25, 25], [0, 42], [-25, 25]], -20, 20), S.box(10, -15, 25, 18, -7, 45)) },
  { id: 'G08', name: '十字スリット付き円柱', cat: 'puzzle', diff: 2, build: (S) => S.D(S.cyl('z', 20, 0, 40), S.box(-21, -3, 20, 21, 3, 41), S.box(-3, -21, 20, 3, 21, 41)) },
  { id: 'G09', name: '3方向角穴の立方体', cat: 'puzzle', diff: 3, build: (S) => S.D(S.cbox(40, 40, 40, [0, 0, 20]), S.cbox(42, 16, 16, [0, 0, 20]), S.cbox(16, 42, 16, [0, 0, 20]), S.cbox(16, 16, 42, [0, 0, 20])) },
  { id: 'G10', name: '45°回転立方体との共通部', cat: 'puzzle', diff: 3, build: (S) => S.I(S.cbox(40, 40, 40, [0, 0, 20]), S.move(S.rot(S.cbox(40, 40, 40), 0, 0, 45), 0, 0, 20), S.move(S.rot(S.cbox(40, 40, 40), 45, 0, 0), 0, 0, 20)) },
  {
    id: 'G11', name: '8隅を落とした立方体', cat: 'puzzle', diff: 3,
    build: (S) => {
      let m = S.cbox(40, 40, 40, [0, 0, 20]);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1])
        m = S.keep(m, [-sx, -sy, -sz], -45 - 20 * sz); // sx·x+sy·y+sz·(z-20) ≤ 45
      return m;
    },
  },
  { id: 'G12', name: 'ねじれ四角柱', cat: 'puzzle', diff: 3, build: (S) => S.extrude('z', S.rect(-18, -18, 18, 18), 0, 50, 45) },
  { id: 'G13', name: '斜めに切った円柱', cat: 'puzzle', diff: 2, build: (S) => S.keep(S.cyl('z', 18, 0, 60), [-0.6, 0, -1], -40) },
  { id: 'G14', name: 'くり抜き十字', cat: 'puzzle', diff: 3, build: (S) => S.D(S.U(S.cbox(60, 16, 16, [0, 0, 20]), S.cbox(16, 60, 16, [0, 0, 20]), S.cbox(16, 16, 40, [0, 0, 20])), S.cyl('z', 5, -1, 41)) },
];

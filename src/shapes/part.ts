import type { ShapeDef } from './types';

const pcd = (n: number, r: number, off = 0) =>
  Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n + off), r * Math.sin((2 * Math.PI * i) / n + off)] as [number, number]);

export const part: ShapeDef[] = [
  {
    id: 'D01', name: 'ボス付きフランジ', cat: 'part', diff: 2,
    build: (S) => S.D(S.U(S.cyl('z', 35, 0, 10), S.cyl('z', 16, 0, 30)), S.cyl('z', 9, -1, 31), ...pcd(4, 26).map(([x, y]) => S.cyl('z', 4, -1, 11, x, y))),
  },
  {
    id: 'D02', name: '穴付きL形ブラケット', cat: 'part', diff: 2,
    build: (S) => S.D(
      S.extrude('y', [[-25, 0], [25, 0], [25, 8], [-17, 8], [-17, 45], [-25, 45]], -20, 20),
      S.cyl('z', 5, -1, 9, 8, 0), S.cyl('x', 6, -26, -16, 0, 30),
    ),
  },
  { id: 'D03', name: 'リブ付き板', cat: 'part', diff: 1, build: (S) => S.U(S.box(-30, -20, 0, 30, 20, 8), S.box(-30, -3, 7, 30, 3, 30)) },
  { id: 'D04', name: '穴付きボスと板', cat: 'part', diff: 2, build: (S) => S.D(S.U(S.box(-30, -20, 0, 30, 20, 8), S.cyl('z', 12, 7, 30)), S.cyl('z', 6, -1, 31)) },
  { id: 'D05', name: 'キー溝付き軸', cat: 'part', diff: 2, build: (S) => S.D(S.cyl('x', 12, -35, 35, 0, 12), S.box(-20, -3, 19, 20, 3, 25)) },
  {
    id: 'D06', name: 'ピローブロック', cat: 'part', diff: 3,
    build: (S) => S.D(
      S.U(S.box(-35, -12, 0, 35, 12, 8), S.extrude('y', [[-18, 7], [18, 7], [18, 22], [-18, 22]], -12, 12), S.cyl('y', 18, -12, 12, 0, 22)),
      S.cyl('y', 10, -13, 13, 0, 22), S.cyl('z', 4, -1, 9, -27, 0), S.cyl('z', 4, -1, 9, 27, 0),
    ),
  },
  {
    id: 'D07', name: 'クレビス（U形）', cat: 'part', diff: 2,
    build: (S) => S.D(S.box(-15, -20, 0, 15, 20, 45), S.box(-16, -8, 15, 16, 8, 46), S.cyl('y', 5, -21, 21, 0, 33)),
  },
  { id: 'D08', name: 'ヒンジ板', cat: 'part', diff: 2, build: (S) => S.D(S.U(S.box(-30, -20, 0, 30, 10, 5), S.cyl('x', 8, -30, 30, 14, 8)), S.cyl('x', 4, -31, 31, 14, 8), S.box(-10, 11, -1, 10, 23, 17)) },
  {
    id: 'D09', name: 'スプライン軸', cat: 'part', diff: 3,
    build: (S) => S.U(S.cyl('z', 15, 0, 40), ...Array.from({ length: 6 }, (_, i) => S.rot(S.box(-3, 0, 0, 3, 20, 40), 0, 0, i * 60))),
  },
  { id: 'D10', name: '六角ナット', cat: 'part', diff: 1, build: (S) => S.D(S.prism('z', 6, 20, 0, 16), S.cyl('z', 10, -1, 17)) },
  { id: 'D11', name: '六角ボルト', cat: 'part', diff: 2, build: (S) => S.U(S.prism('z', 6, 15, 0, 10), S.cyl('z', 8, 9, 55)) },
  { id: 'D12', name: 'Tスロットブロック', cat: 'part', diff: 2, build: (S) => S.D(S.box(-30, -20, 0, 30, 20, 30), S.box(-6, -21, 18, 6, 21, 31), S.box(-14, -21, 8, 14, 21, 18)) },
  {
    id: 'D13', name: 'モーター取付板', cat: 'part', diff: 2,
    build: (S) => S.D(S.box(-30, -30, 0, 30, 30, 8), S.cyl('z', 12, -1, 9), ...[[-20, -20], [20, -20], [20, 20], [-20, 20]].map(([x, y]) => S.extrude('z', S.slot(8, 6, x, y), -1, 9))),
  },
  { id: 'D14', name: '穴付き溝形ブラケット', cat: 'part', diff: 2, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 35), S.box(-19, -21, 6, 19, 21, 36), S.cyl('x', 5, -26, 26, 0, 24), S.cyl('z', 5, -1, 7)) },
  {
    id: 'D15', name: 'レバー（2ボス）', cat: 'part', diff: 2,
    build: (S) => S.D(S.U(S.cyl('z', 14, 0, 16, -25, 0), S.cyl('z', 9, 0, 12, 25, 0), S.box(-25, -5, 0, 25, 5, 8)), S.cyl('z', 7, -1, 17, -25, 0), S.cyl('z', 4, -1, 13, 25, 0)),
  },
  {
    id: 'D16', name: 'コンロッド', cat: 'part', diff: 2,
    build: (S) => S.D(S.U(S.cyl('z', 15, 0, 12, -28, 0), S.cyl('z', 10, 0, 12, 28, 0), S.box(-28, -5, 2, 28, 5, 10)), S.cyl('z', 9, -1, 13, -28, 0), S.cyl('z', 5, -1, 13, 28, 0)),
  },
  {
    id: 'D17', name: 'T形管継手', cat: 'part', diff: 3,
    build: (S) => S.D(S.U(S.cyl('x', 12, -30, 30, 0, 12), S.cyl('z', 12, 12, 40)), S.cyl('x', 8, -31, 31, 0, 12), S.cyl('z', 8, 12, 41)),
  },
  {
    id: 'D18', name: 'エルボ（90°曲管）', cat: 'part', diff: 3,
    build: (S) => S.revolve('y', [...S.circle(10, 25, 0)].map(([a, b]) => [a, b] as [number, number]), 0, 0, 90),
  },
  { id: 'D19', name: '止めねじ穴付きカラー', cat: 'part', diff: 2, build: (S) => S.D(S.cyl('z', 20, 0, 20), S.cyl('z', 10, -1, 21), S.cyl('y', 3, -21, 0, 0, 10)) },
  {
    id: 'D20', name: '両側リブ付き立板', cat: 'part', diff: 2,
    build: (S) => S.U(S.box(-30, -20, 0, 30, 20, 6), S.box(-30, -3, 5, 30, 3, 40), S.extrude('x', [[-2.9, 5.5], [-20, 5.5], [-2.9, 30]], -4, 4), S.extrude('x', [[2.9, 5.5], [2.9, 30], [20, 5.5]], -4, 4)),
  },
  { id: 'D21', name: '上面開放の箱', cat: 'part', diff: 2, build: (S) => S.D(S.box(-30, -20, 0, 30, 20, 30), S.box(-25, -15, 5, 25, 15, 31)) },
  { id: 'D22', name: 'フランジ付き箱', cat: 'part', diff: 3, build: (S) => S.D(S.U(S.box(-25, -18, 0, 25, 18, 30), S.box(-33, -26, 25, 33, 26, 30)), S.box(-20, -13, 5, 20, 13, 31)) },
  { id: 'D23', name: '偏心カム', cat: 'part', diff: 2, build: (S) => S.D(S.U(S.cyl('z', 25, 0, 12, 8, 0), S.cyl('z', 12, 0, 22)), S.cyl('z', 6, -1, 23)) },
  { id: 'D24', name: '平行キー（丸端）', cat: 'part', diff: 1, build: (S) => S.extrude('z', S.slot(36, 12), 0, 8) },
  { id: 'D25', name: '長穴付き段ブラケット', cat: 'part', diff: 3, build: (S) => S.D(S.extrude('y', [[-30, 0], [30, 0], [30, 20], [10, 20], [10, 8], [-30, 8]], -18, 18), S.extrude('z', S.slot(16, 8, -12, 0), -1, 9), S.cyl('z', 4, -1, 21, 20, 0)) },
  {
    id: 'D26', name: '歯車風円板', cat: 'part', diff: 3,
    build: (S) => S.D(S.U(S.cyl('z', 24, 0, 10), ...Array.from({ length: 12 }, (_, i) => S.rot(S.box(-3, 22, 0, 3, 30, 10), 0, 0, i * 30))), S.cyl('z', 8, -1, 11), S.box(-2, 6, -1, 2, 10, 11)),
  },
  { id: 'D27', name: 'アイボルト風', cat: 'part', diff: 2, build: (S) => S.U(S.cyl('z', 5, 0, 30), S.move(S.rot(S.revolve('z', S.circle(4, 12, 0)), 90, 0, 0), 0, 0, 42)) },
];

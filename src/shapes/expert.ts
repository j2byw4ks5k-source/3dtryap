// 上級部品：複数の特徴（傾斜・複合角・多方向の相貫）を組み合わせた難しい形状
import type { ShapeDef } from './types';

const SLOPE = (Math.atan2(30, 60) * 180) / Math.PI; // H02 の斜面角（約26.6°）

export const expert: ShapeDef[] = [
  { id: 'H01', name: '複合角の斜め穴ブロック', cat: 'expert', diff: 3, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 35), S.move(S.rot(S.cyl('z', 6, -40, 40), 0, 35, 30), 0, 0, 17.5)) },
  {
    id: 'H02', name: '斜面に直交するボス', cat: 'expert', diff: 3,
    build: (S) => {
      const tilt = (m: ReturnType<typeof S.cyl>) => S.move(S.rot(m, 0, SLOPE, 0), 0, 0, 25);
      return S.D(S.U(S.extrude('y', [[-30, 0], [30, 0], [30, 10], [-30, 40]], -20, 20), tilt(S.cyl('z', 9, -6, 10))), tilt(S.cyl('z', 4.5, -40, 40)));
    },
  },
  {
    id: 'H03', name: '3方向の中空十字管', cat: 'expert', diff: 3,
    build: (S) => S.D(S.U(S.cyl('x', 10, -30, 30, 0, 30), S.cyl('y', 10, -30, 30, 0, 30), S.cyl('z', 10, 0, 60)), S.cyl('x', 6, -31, 31, 0, 30), S.cyl('y', 6, -31, 31, 0, 30), S.cyl('z', 6, -1, 61)),
  },
  {
    id: 'H04', name: 'Y字管', cat: 'expert', diff: 3,
    build: (S) => {
      const br = (r: number, a: number, l: number) => S.move(S.rot(S.cyl('z', r, 0, l), 0, a, 0), 0, 0, 28);
      return S.D(S.U(S.cyl('z', 10, 0, 30), br(10, 35, 32), br(10, -35, 32)), S.cyl('z', 6, -1, 29), br(6, 35, 34), br(6, -35, 34));
    },
  },
  {
    id: 'H05', name: 'リブ付き軸受ブラケット', cat: 'expert', diff: 3,
    build: (S) => S.D(
      S.U(S.box(-35, -20, 0, 35, 20, 8), S.box(-20, -6, 7, 20, 6, 40), S.cyl('y', 16, -10, 10, 0, 40),
        S.extrude('x', [[5.5, 7.5], [19, 7.5], [5.5, 30]], -2.5, 2.5), S.extrude('x', [[-5.5, 7.5], [-5.5, 30], [-19, 7.5]], -2.5, 2.5)),
      S.cyl('y', 9, -11, 11, 0, 40), S.extrude('z', S.slot(10, 7, -27, 0), -1, 9), S.extrude('z', S.slot(10, 7, 27, 0), -1, 9),
    ),
  },
  {
    id: 'H06', name: '二面幅と横穴付き段付き軸', cat: 'expert', diff: 3,
    build: (S) => S.D(
      S.revolve('x', [[0, -35], [12, -35], [12, -10], [16, -10], [16, 15], [10, 15], [10, 35], [0, 35]], 0, 16),
      S.box(-36, 9, 0, -12, 20, 32), S.box(-36, -20, 0, -12, -9, 32), S.cyl('z', 3, 0, 40, 25, 0),
    ),
  },
  {
    id: 'H07', name: 'クランク軸', cat: 'expert', diff: 3,
    build: (S) => S.U(S.cyl('x', 7, -35, -14, 0, 20), S.cyl('x', 7, 14, 35, 0, 20), S.box(-15, -10, 8, -9, 10, 42), S.box(9, -10, 8, 15, 10, 42), S.cyl('x', 6, -10, 10, 0, 34)),
  },
  {
    id: 'H08', name: 'ギアボックス筐体', cat: 'expert', diff: 3,
    build: (S) => S.D(S.U(S.box(-30, -22, 0, 30, 22, 35), S.cyl('x', 12, -34, 34, 0, 18)), S.box(-25, -17, 5, 25, 17, 36), S.cyl('x', 7, -35, 35, 0, 18)),
  },
  { id: 'H09', name: '斜めに切った穴付き六角柱', cat: 'expert', diff: 3, build: (S) => S.D(S.keep(S.prism('z', 6, 22, 0, 50), [-0.5, 0, -1], -45), S.cyl('z', 8, -1, 60)) },
  {
    id: 'H10', name: 'ヨーク（二股継手）', cat: 'expert', diff: 3,
    build: (S) => S.D(S.U(S.cyl('z', 10, 0, 16), S.box(-15, -15, 15, 15, 15, 50)), S.box(-16, -7, 25, 16, 7, 51), S.cyl('x', 5, -16, 16, 0, 40), S.cyl('z', 4, -1, 26)),
  },
  {
    id: 'H11', name: '隅を斜めに落とした穴付きL形', cat: 'expert', diff: 3,
    build: (S) => S.D(S.keep(S.extrude('y', [[-25, 0], [25, 0], [25, 12], [-13, 12], [-13, 40], [-25, 40]], -20, 20), [-1, -1, -1], -50), S.cyl('x', 6, -26, -12, 0, 28), S.cyl('z', 5, -1, 13, 10, -8)),
  },
  { id: 'H12', name: '斜めスロット付き円柱', cat: 'expert', diff: 3, build: (S) => S.D(S.cyl('z', 20, 0, 50), S.move(S.rot(S.box(-25, -4, -6, 25, 4, 6), 0, 30, 0), 0, 0, 25), S.cyl('z', 6, -1, 51)) },
  { id: 'H13', name: '鞍形ブロック（上下で直交する円弧）', cat: 'expert', diff: 3, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 40), S.cyl('x', 18, -26, 26, 0, 50), S.cyl('y', 12, -21, 21, 0, -4)) },
  {
    id: 'H14', name: '斜めアーム付きベース', cat: 'expert', diff: 3,
    build: (S) => {
      const ex = -15 + 40 * Math.sin((40 * Math.PI) / 180), ez = 6 + 40 * Math.cos((40 * Math.PI) / 180);
      return S.D(S.U(S.box(-30, -20, 0, 30, 20, 8), S.move(S.rot(S.box(-5, -8, 0, 5, 8, 40), 0, 40, 0), -15, 0, 6), S.cyl('y', 10, -10, 10, ex, ez)), S.cyl('y', 5, -11, 11, ex, ez), S.cyl('z', 4, -1, 9, -22, 12), S.cyl('z', 4, -1, 9, -22, -12));
    },
  },
  { id: 'H15', name: '斜め穴の円錐', cat: 'expert', diff: 3, build: (S) => S.D(S.cone('z', 25, 0, 0, 50), S.move(S.rot(S.cyl('z', 5, -40, 40), 0, 60, 0), 0, 0, 18)) },
  { id: 'H16', name: '球面座付きブロック', cat: 'expert', diff: 3, build: (S) => S.D(S.box(-25, -25, 0, 25, 25, 25), S.sphere(15, [0, 0, 30]), S.cyl('z', 5, -1, 26), S.cyl('y', 4, -26, 26, 0, 8)) },
  { id: 'H17', name: '中空球を貫くパイプ', cat: 'expert', diff: 3, build: (S) => S.D(S.U(S.sphere(20, [0, 0, 20]), S.cyl('x', 8, -32, 32, 0, 20)), S.sphere(16, [0, 0, 20]), S.cyl('x', 5, -33, 33, 0, 20)) },
  { id: 'H18', name: '斜め穴付き四角錐台', cat: 'expert', diff: 3, build: (S) => S.D(S.extrude('z', S.rect(-25, -25, 25, 25), 0, 35, 0, 0.5), S.move(S.rot(S.cyl('z', 5, -40, 40), 0, 40, 0), 0, 0, 15)) },
  {
    id: 'H19', name: 'あり溝とT溝のブロック', cat: 'expert', diff: 3,
    build: (S) => S.D(S.box(-30, -25, 0, 30, 25, 35), S.extrude('y', [[-8, 36], [8, 36], [13, 24], [-13, 24]], -26, 26), S.box(-31, -5, -1, 31, 5, 11), S.box(-31, -12, 10, 31, 12, 18)),
  },
  {
    id: 'H20', name: '段違い座ぐりの段付きフランジ', cat: 'expert', diff: 3,
    build: (S) => S.D(S.U(S.cyl('z', 32, 0, 10), S.cyl('z', 20, 9, 25)), S.cyl('z', 8, -1, 26), S.cyl('z', 3, -1, 11, 26, 0), S.cyl('z', 6, 6, 11, 26, 0), S.cyl('z', 3, -1, 11, -26, 0), S.cyl('z', 6, 6, 11, -26, 0), S.cyl('z', 3, -1, 26, 0, 13), S.cyl('z', 5.5, 20, 26, 0, 13)),
  },
  { id: 'H21', name: '2隅を斜めに落としたアングル', cat: 'expert', diff: 3, build: (S) => S.keep(S.keep(S.extrude('y', [[-25, 0], [25, 0], [25, 12], [-13, 12], [-13, 40], [-25, 40]], -20, 20), [-1, -1, -1], -52), [0, 1, -1], -30) },
  { id: 'H22', name: '2方向の階段', cat: 'expert', diff: 3, build: (S) => S.U(S.box(-25, -25, 0, 25, 25, 10), S.box(-25, -25, 9, 10, 10, 22), S.box(-25, -25, 21, -5, -5, 34)) },
  { id: 'H23', name: '異径・偏心の十字相貫', cat: 'expert', diff: 3, build: (S) => S.U(S.cyl('x', 14, -35, 35, 0, 20), S.cyl('y', 8, -35, 35, 0, 27)) },
  { id: 'H24', name: '斜め端面のキー溝付き円筒', cat: 'expert', diff: 3, build: (S) => S.D(S.keep(S.cyl('z', 20, 0, 50), [-0.5, 0, -1], -45), S.cyl('z', 7, -1, 60), S.box(-2.5, 5, -1, 2.5, 10, 60)) },
  { id: 'H25', name: '穴付き正八面体', cat: 'expert', diff: 3, build: (S) => S.D(S.hull([[25, 0, 25], [-25, 0, 25], [0, 25, 25], [0, -25, 25], [0, 0, 0], [0, 0, 50]]), S.cyl('x', 6, -26, 26, 0, 25)) },
  { id: 'H26', name: '傾いた角穴のブロック', cat: 'expert', diff: 3, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 35), S.move(S.rot(S.cbox(12, 12, 80), 0, 30, 45), 0, 0, 17.5)) },
  {
    id: 'H27', name: '3方向に形の違う穴', cat: 'expert', diff: 3,
    build: (S) => S.D(S.cbox(40, 40, 40, [0, 0, 20]), S.cyl('x', 7, -21, 21, 0, 30), S.box(-14, -21, 4, -2, 21, 16), S.extrude('z', [[2, 2], [18, 2], [10, 16]], -1, 41)),
  },
  {
    id: 'H28', name: 'スポーク付きホイール', cat: 'expert', diff: 3,
    build: (S) => S.D(S.U(S.D(S.cyl('z', 30, 0, 12), S.cyl('z', 25, -1, 13)), S.cyl('z', 9, 0, 16), ...[0, 45, 90, 135].map((a) => S.rot(S.box(-27, -2.5, 0, 27, 2.5, 6), 0, 0, a))), S.cyl('z', 4, -1, 17)),
  },
  {
    id: 'H29', name: '2回曲げのステー', cat: 'expert', diff: 3,
    build: (S) => S.D(S.extrude('y', [[-35, 0], [-8, 0], [7, 25], [35, 25], [35, 30], [4, 30], [-11, 5], [-35, 5]], -15, 15), S.cyl('z', 4, -1, 31, -25, 0), S.extrude('z', S.slot(8, 8, 24, 0), -1, 31)),
  },
  {
    id: 'H30', name: 'Vブロック', cat: 'expert', diff: 3,
    build: (S) => S.D(S.box(-30, -25, 0, 30, 25, 40), S.extrude('x', [[-16, 41], [16, 41], [0, 25]], -31, 31), S.box(-31, -2, 19, 31, 2, 26), S.box(-31, -26, 8, 31, -20, 14), S.box(-31, 20, 8, 31, 26, 14)),
  },
];

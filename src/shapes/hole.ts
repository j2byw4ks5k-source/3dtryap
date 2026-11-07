import type { ShapeDef } from './types';

export const hole: ShapeDef[] = [
  { id: 'C01', name: '中央貫通穴付き板', cat: 'hole', diff: 1, build: (S) => S.D(S.box(-30, -20, 0, 30, 20, 10), S.cyl('z', 8, -1, 11)) },
  {
    id: 'C02', name: '4穴付き板', cat: 'hole', diff: 1,
    build: (S) => S.D(S.box(-30, -20, 0, 30, 20, 10), ...[[-20, -10], [20, -10], [20, 10], [-20, 10]].map(([x, y]) => S.cyl('z', 4, -1, 11, x, y))),
  },
  { id: 'C03', name: '止まり穴付きブロック', cat: 'hole', diff: 1, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 30), S.cyl('z', 9, 12, 31)) },
  { id: 'C04', name: '座ぐり穴', cat: 'hole', diff: 2, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 25), S.cyl('z', 6, -1, 26), S.cyl('z', 11, 15, 26)) },
  { id: 'C05', name: '皿穴', cat: 'hole', diff: 2, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 20), S.cyl('z', 6, -1, 21), S.cone('z', 6, 14, 12, 20.01)) },
  { id: 'C06', name: '長穴付き板', cat: 'hole', diff: 1, build: (S) => S.D(S.box(-30, -20, 0, 30, 20, 10), S.extrude('z', S.slot(30, 12), -1, 11)) },
  { id: 'C07', name: '横穴付きブロック', cat: 'hole', diff: 1, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 40), S.cyl('x', 9, -26, 26, 0, 20)) },
  { id: 'C08', name: '直交2方向の横穴', cat: 'hole', diff: 2, build: (S) => S.D(S.box(-25, -25, 0, 25, 25, 40), S.cyl('x', 8, -26, 26, 0, 20), S.cyl('y', 6, -26, 26, 0, 20)) },
  { id: 'C09', name: '段付き穴', cat: 'hole', diff: 2, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 40), S.cyl('z', 6, -1, 41), S.cyl('z', 12, 20, 41)) },
  { id: 'C10', name: '角穴付き板', cat: 'hole', diff: 1, build: (S) => S.D(S.box(-30, -20, 0, 30, 20, 12), S.box(-12, -8, -1, 12, 8, 13)) },
  { id: 'C11', name: '斜め穴付きブロック', cat: 'hole', diff: 3, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 35), S.move(S.rot(S.cyl('z', 6, -40, 40), 0, 45, 0), 0, 0, 17.5)) },
  { id: 'C12', name: '横穴付き丸棒', cat: 'hole', diff: 2, build: (S) => S.D(S.cyl('z', 15, 0, 60), S.cyl('x', 5, -16, 16, 0, 35)) },
  { id: 'C13', name: '縦穴と横穴の合流', cat: 'hole', diff: 3, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 40), S.cyl('z', 7, -1, 41, 8, 0), S.cyl('x', 5, -26, 8, 0, 20)) },
  {
    id: 'C14', name: 'PCD 6穴フランジ板', cat: 'hole', diff: 2,
    build: (S) => S.D(S.cyl('z', 35, 0, 10), S.cyl('z', 12, -1, 11), ...Array.from({ length: 6 }, (_, i) => S.cyl('z', 4, -1, 11, 24 * Math.cos((i * Math.PI) / 3), 24 * Math.sin((i * Math.PI) / 3)))),
  },
  { id: 'C15', name: '鍵穴形の穴', cat: 'hole', diff: 2, build: (S) => S.D(S.box(-30, -20, 0, 30, 20, 10), S.cyl('z', 9, -1, 11, -8, 0), S.box(-8, -4, -1, 18, 4, 11)) },
  { id: 'C16', name: '止まり横穴（片側）', cat: 'hole', diff: 2, build: (S) => S.D(S.box(-25, -20, 0, 25, 20, 30), S.cyl('y', 8, -21, 5, 0, 15)) },
  { id: 'C17', name: '貫通穴付き円板', cat: 'hole', diff: 1, build: (S) => S.D(S.cyl('z', 30, 0, 12), S.cyl('z', 10, -1, 13, 12, 0)) },
];

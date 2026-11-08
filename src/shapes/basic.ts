import type { ShapeDef } from './types';

export const basic: ShapeDef[] = [
  { id: 'A01', name: '立方体', cat: 'basic', diff: 1, build: (S) => S.cbox(40, 40, 40, [0, 0, 20]) },
  { id: 'A02', name: '直方体', cat: 'basic', diff: 1, build: (S) => S.box(-30, -15, 0, 30, 15, 20) },
  { id: 'A03', name: '円柱', cat: 'basic', diff: 1, build: (S) => S.cyl('z', 20, 0, 50) },
  { id: 'A04', name: '横置き円柱', cat: 'basic', diff: 1, build: (S) => S.cyl('x', 15, -30, 30, 0, 15) },
  { id: 'A05', name: '円錐', cat: 'basic', diff: 1, build: (S) => S.cone('z', 25, 0, 0, 50) },
  { id: 'A06', name: '円錐台', cat: 'basic', diff: 1, build: (S) => S.cone('z', 25, 12, 0, 40) },
  { id: 'A07', name: '球', cat: 'basic', diff: 1, build: (S) => S.sphere(25, [0, 0, 25]) },
  { id: 'A08', name: '半球', cat: 'basic', diff: 1, build: (S) => S.keep(S.sphere(25), [0, 0, 1], 0) },
  { id: 'A09', name: 'トーラス', cat: 'basic', diff: 2, build: (S) => S.revolve('z', S.circle(8, 22, 8)) },
  { id: 'A10', name: '三角柱', cat: 'basic', diff: 1, build: (S) => S.extrude('y', [[-25, 0], [25, 0], [0, 35]], -20, 20) },
  { id: 'A11', name: '六角柱', cat: 'basic', diff: 1, build: (S) => S.prism('z', 6, 22, 0, 40) },
  { id: 'A12', name: '四角錐', cat: 'basic', diff: 1, build: (S) => S.extrude('z', S.rect(-22, -22, 22, 22), 0, 40, 0, 0.001) },
  { id: 'A13', name: '三角錐', cat: 'basic', diff: 2, build: (S) => S.hull([[-25, -15, 0], [25, -15, 0], [0, 25, 0], [0, 0, 40]]) },
  { id: 'A14', name: '円筒（パイプ）', cat: 'basic', diff: 1, build: (S) => S.D(S.cyl('z', 20, 0, 50), S.cyl('z', 14, -1, 51)) },
  { id: 'A15', name: '角パイプ', cat: 'basic', diff: 1, build: (S) => S.D(S.box(-20, -20, 0, 20, 20, 60), S.box(-15, -15, -1, 15, 15, 61)) },
  { id: 'A16', name: '双円錐', cat: 'basic', diff: 2, build: (S) => S.U(S.cone('z', 20, 0, 25, 50), S.cone('z', 0, 20, 0, 25)) },
  { id: 'A17', name: '四角錐台', cat: 'basic', diff: 1, build: (S) => S.extrude('z', S.rect(-25, -25, 25, 25), 0, 30, 0, 0.5) },
  { id: 'A18', name: '八角柱（横置き）', cat: 'basic', diff: 1, build: (S) => S.prism('y', 8, 20, -25, 25, 0, 20, 22.5) },
];

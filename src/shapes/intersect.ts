import type { ShapeDef } from './types';

export const intersect: ShapeDef[] = [
  { id: 'F01', name: '同径円柱のT字相貫', cat: 'intersect', diff: 2, build: (S) => S.U(S.cyl('x', 12, -35, 35, 0, 12), S.cyl('z', 12, 12, 45)) },
  { id: 'F02', name: '同径円柱の十字相貫', cat: 'intersect', diff: 2, build: (S) => S.U(S.cyl('x', 12, -35, 35, 0, 15), S.cyl('y', 12, -35, 35, 0, 15)) },
  { id: 'F03', name: '異径円柱のT字相貫', cat: 'intersect', diff: 2, build: (S) => S.U(S.cyl('x', 15, -35, 35, 0, 15), S.cyl('z', 8, 15, 45)) },
  { id: 'F04', name: '偏心T字相貫', cat: 'intersect', diff: 3, build: (S) => S.U(S.cyl('x', 15, -35, 35, 0, 15), S.cyl('z', 7, 15, 45, 0, 7)) },
  { id: 'F05', name: '斜め円柱の相貫', cat: 'intersect', diff: 3, build: (S) => S.U(S.cyl('x', 14, -35, 35, 0, 14), S.move(S.rot(S.cyl('z', 8, 0, 40), 0, 45, 0), 0, 0, 14)) },
  { id: 'F06', name: '角柱を貫く円柱', cat: 'intersect', diff: 2, build: (S) => S.U(S.box(-15, -15, 0, 15, 15, 50), S.cyl('x', 8, -35, 35, 0, 25)) },
  { id: 'F07', name: '円柱を貫く角柱', cat: 'intersect', diff: 2, build: (S) => S.U(S.cyl('z', 16, 0, 50), S.box(-35, -7, 18, 35, 7, 32)) },
  { id: 'F08', name: 'スタインメッツ立体（2円柱の共通部）', cat: 'intersect', diff: 3, build: (S) => S.I(S.cyl('x', 20, -25, 25, 0, 20), S.cyl('y', 20, -25, 25, 0, 20)) },
  { id: 'F09', name: '3円柱の共通部', cat: 'intersect', diff: 3, build: (S) => S.I(S.cyl('x', 20, -25, 25, 0, 20), S.cyl('y', 20, -25, 25, 0, 20), S.cyl('z', 20, -5, 45)) },
  { id: 'F10', name: '円柱に刺さる円錐', cat: 'intersect', diff: 3, build: (S) => S.U(S.cyl('x', 14, -35, 35, 0, 14), S.cone('z', 10, 4, 14, 45)) },
  { id: 'F11', name: '球を貫く円柱', cat: 'intersect', diff: 2, build: (S) => S.U(S.sphere(20, [0, 0, 20]), S.cyl('x', 8, -35, 35, 0, 20)) },
  { id: 'F12', name: '中空T字管の相貫', cat: 'intersect', diff: 3, build: (S) => S.D(S.U(S.cyl('x', 14, -35, 35, 0, 14), S.cyl('z', 10, 14, 45)), S.cyl('x', 10, -36, 36, 0, 14), S.cyl('z', 6, 0, 46)) },
  { id: 'F13', name: '円柱と角柱の共通部', cat: 'intersect', diff: 3, build: (S) => S.I(S.cyl('z', 22, 0, 40), S.cbox(36, 36, 40, [0, 0, 20])) },
];

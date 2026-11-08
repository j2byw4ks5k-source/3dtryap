import type { ShapeDef } from './types';

export const revolve: ShapeDef[] = [
  { id: 'E01', name: '段付き軸', cat: 'revolve', diff: 1, build: (S) => S.revolve('x', [[0, -35], [8, -35], [8, -15], [14, -15], [14, 15], [10, 15], [10, 35], [0, 35]], 0, 14) },
  { id: 'E02', name: 'Vプーリ', cat: 'revolve', diff: 2, build: (S) => S.D(S.revolve('z', [[0, 0], [30, 0], [30, 3], [20, 10], [30, 17], [30, 20], [0, 20]]), S.cyl('z', 7, -1, 21)) },
  { id: 'E03', name: '端面環状溝付き円板', cat: 'revolve', diff: 2, build: (S) => S.revolve('z', [[0, 0], [30, 0], [30, 15], [22, 15], [22, 8], [14, 8], [14, 15], [0, 15]]) },
  { id: 'E04', name: 'ノズル', cat: 'revolve', diff: 2, build: (S) => S.revolve('z', [[6, 0], [18, 0], [18, 20], [8, 45], [4, 45], [12, 20], [12, 5], [6, 5]]) },
  { id: 'E05', name: '中空半球（ボウル）', cat: 'revolve', diff: 2, build: (S) => S.D(S.keep(S.sphere(25, [0, 0, 25]), [0, 0, -1], -25), S.sphere(21, [0, 0, 25])) },
  { id: 'E06', name: 'ボトル形', cat: 'revolve', diff: 2, build: (S) => S.revolve('z', [[0, 0], [18, 0], [18, 30], [8, 42], [8, 55], [0, 55]]) },
  { id: 'E07', name: '溝付き軸', cat: 'revolve', diff: 1, build: (S) => S.revolve('x', [[0, -35], [12, -35], [12, -12], [8, -12], [8, -6], [12, -6], [12, 6], [8, 6], [8, 12], [12, 12], [12, 35], [0, 35]], 0, 12) },
  { id: 'E08', name: '底付きカップ', cat: 'revolve', diff: 1, build: (S) => S.revolve('z', [[0, 0], [20, 0], [20, 40], [16, 40], [16, 6], [0, 6]]) },
  { id: 'E09', name: 'ドーム付き円柱', cat: 'revolve', diff: 1, build: (S) => S.U(S.cyl('z', 18, 0, 30), S.keep(S.sphere(18, [0, 0, 30]), [0, 0, 1], 30)) },
  { id: 'E10', name: '鼓形', cat: 'revolve', diff: 1, build: (S) => S.revolve('z', [[0, 0], [22, 0], [8, 25], [22, 50], [0, 50]]) },
  { id: 'E11', name: '面取りリング', cat: 'revolve', diff: 2, build: (S) => S.revolve('z', [[15, 0], [27, 0], [30, 3], [30, 12], [27, 15], [15, 15]]) },
  { id: 'E12', name: '横向きテーパ付き軸', cat: 'revolve', diff: 2, build: (S) => S.revolve('y', [[0, -30], [10, -30], [10, -5], [16, 5], [16, 30], [0, 30]], 0, 16) },
];

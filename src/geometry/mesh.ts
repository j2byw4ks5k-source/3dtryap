// Manifold → インデックス付き三角形メッシュ
import type { Manifold } from 'manifold-3d';

export interface TriMesh {
  pos: Float32Array; // xyz 連続
  idx: Uint32Array; // 三角形インデックス
}

export function toTriMesh(m: Manifold): TriMesh {
  const mesh = m.getMesh();
  const np = mesh.numProp;
  const nv = mesh.vertProperties.length / np;
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    pos[i * 3] = mesh.vertProperties[i * np];
    pos[i * 3 + 1] = mesh.vertProperties[i * np + 1];
    pos[i * 3 + 2] = mesh.vertProperties[i * np + 2];
  }
  return { pos, idx: new Uint32Array(mesh.triVerts) };
}

export function bboxOf(t: TriMesh) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < t.pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], t.pos[i + k]);
      max[k] = Math.max(max[k], t.pos[i + k]);
    }
  return { min, max, size: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) };
}

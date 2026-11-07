import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import { SHAPES, buildShape, type ShapeDef } from '../shapes';
import { toTriMesh, bboxOf, type TriMesh } from '../geometry/mesh';

export interface Built {
  def: ShapeDef;
  m: Manifold;
  mesh: TriMesh;
  bb: ReturnType<typeof bboxOf>;
}

const cache = new Map<string, Built>();
const MAX = 24; // WASM メモリ節約のため LRU で保持数を制限

export function getBuilt(w: ManifoldToplevel, def: ShapeDef): Built {
  const hit = cache.get(def.id);
  if (hit) {
    cache.delete(def.id);
    cache.set(def.id, hit);
    return hit;
  }
  const m = buildShape(w, def);
  const mesh = toTriMesh(m);
  const b: Built = { def, m, mesh, bb: bboxOf(mesh) };
  cache.set(def.id, b);
  if (cache.size > MAX) {
    const [k, v] = cache.entries().next().value!;
    cache.delete(k);
    v.m.delete();
  }
  return b;
}

export const shapeById = (id: string) => SHAPES.find((s) => s.id === id)!;

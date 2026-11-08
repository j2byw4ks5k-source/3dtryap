import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import { makeDSL } from './dsl';
import type { ShapeDef } from './types';
import { basic } from './basic';
import { step } from './step';
import { hole } from './hole';
import { part } from './part';
import { revolve } from './revolve';
import { intersect } from './intersect';
import { puzzle } from './puzzle';
import { expert } from './expert';

export * from './types';
export const SHAPES: ShapeDef[] = [...basic, ...step, ...hole, ...part, ...revolve, ...intersect, ...puzzle, ...expert];

/** 形状を生成（中間オブジェクトは解放済み） */
export function buildShape(w: ManifoldToplevel, def: ShapeDef): Manifold {
  const { S, cleanup } = makeDSL(w);
  const m = def.build(S);
  cleanup(m);
  return m;
}

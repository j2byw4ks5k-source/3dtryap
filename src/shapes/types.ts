import type { Manifold } from 'manifold-3d';
import type { DSL } from './dsl';

export type Category = 'basic' | 'step' | 'hole' | 'part' | 'revolve' | 'intersect' | 'puzzle';
export const CATEGORY_LABEL: Record<Category, string> = {
  basic: '基本立体',
  step: '段付き・切欠き',
  hole: '穴加工',
  part: '機械部品',
  revolve: '回転体',
  intersect: '相貫体',
  puzzle: 'パズル',
};

export interface ShapeDef {
  id: string;
  name: string;
  cat: Category;
  diff: 1 | 2 | 3;
  build: (S: DSL) => Manifold;
}

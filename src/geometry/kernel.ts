// manifold-3d (WASM) の初期化。ブラウザ／Node 両対応。
import Module from 'manifold-3d';
import type { ManifoldToplevel } from 'manifold-3d';

let wasmPromise: Promise<ManifoldToplevel> | null = null;

/** @param wasmUrl ブラウザで .wasm の URL を明示したいとき（Vite の ?url import） */
export function initKernel(wasmUrl?: string): Promise<ManifoldToplevel> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const opts = wasmUrl ? { locateFile: () => wasmUrl } : undefined;
      const wasm = await (Module as unknown as (o?: object) => Promise<ManifoldToplevel>)(opts);
      wasm.setup();
      return wasm;
    })();
  }
  return wasmPromise;
}

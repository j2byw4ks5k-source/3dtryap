import './style.css';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { initKernel } from './geometry/kernel';
import { App } from './ui/app';

initKernel(wasmUrl)
  .then((w) => new App(document.getElementById('app')!, w))
  .catch((e) => {
    document.getElementById('app')!.innerHTML = `<div class="loading">読み込みに失敗しました<br><small>${String(e)}</small></div>`;
  });

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

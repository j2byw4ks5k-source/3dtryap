import { defineConfig } from 'vite';

// GitHub Pages は /<repo>/ 配下で配信されるため相対パスでビルドする
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  optimizeDeps: { exclude: ['manifold-3d'] },
});

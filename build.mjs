// Empacota o jogo num único arquivo JS (usado por build-artifact.py).
import { build } from 'esbuild';
import path from 'node:path';
const vendor = path.resolve('vendor/three');
await build({
  entryPoints: ['src/main.js'], bundle: true, format: 'esm', minify: true, target: 'es2020', outfile: 'dist/bundle.js',
  plugins: [{ name: 'three-vendor', setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(vendor, 'three.module.min.js') }));
    b.onResolve({ filter: /^three\/addons\// }, a => ({ path: path.join(vendor, 'addons', a.path.slice('three/addons/'.length)) }));
  } }],
});

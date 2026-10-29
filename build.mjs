// Empacota o jogo num único arquivo JS (usado por build-artifact.py).
import { build } from "esbuild";
await build({ entryPoints: ["src/main.js"], bundle: true, format: "esm", minify: true, target: "es2020", outfile: "dist/bundle.js" });

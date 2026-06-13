import { build } from 'esbuild';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');

build({
  entryPoints: ['src/app.ts', 'src/styles.css'],
  outdir: 'dist',
  bundle: true,
  sourcemap: true,
  minify: !isWatch,
  splitting: false,
  format: 'iife',
  globalName: 'App',
}).catch(() => process.exit(1));

if (isWatch) {
  console.log('Watching for changes...');
}

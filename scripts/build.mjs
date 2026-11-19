import {cp,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('dist/vendor/pdfjs',{recursive:true});
for(const file of ['build/pdf.mjs','build/pdf.worker.mjs','cmaps','standard_fonts','LICENSE']) {
  // The compatibility build also supports school tablets without newer
  // Uint8Array APIs (toHex/fromBase64), in both the page and PDF worker.
  const source=file.startsWith('build/')?`legacy/${file}`:file;
  await cp(`node_modules/pdfjs-dist/${source}`,`dist/vendor/pdfjs/${file}`,{recursive:true});
}

await build({
  entryPoints: ['lib/quiz-excel-worker.js'],
  outfile: 'dist/vendor/quiz-excel-worker.js',
  platform: 'browser',
  format: 'esm',
  bundle: true,
  minify: true,
  legalComments: 'linked',
});

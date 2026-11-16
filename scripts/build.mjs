import {cp,mkdir} from 'node:fs/promises';
await mkdir('dist/vendor/pdfjs',{recursive:true});
for(const file of ['build/pdf.mjs','build/pdf.worker.mjs','cmaps','standard_fonts','LICENSE']) {
  await cp(`node_modules/pdfjs-dist/${file}`,`dist/vendor/pdfjs/${file}`,{recursive:true});
}

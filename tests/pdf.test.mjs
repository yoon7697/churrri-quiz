import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';

// Use the shipped compatibility files. Only adapt asset URLs to local paths
// because PDF.js uses Node file readers rather than browser fetch in this test.
await import('../scripts/build.mjs');
let code=await readFile(new URL('../dist/pdf-source.js',import.meta.url),'utf8');
for(const p of ['cmaps','standard_fonts'])code=code.replace(`new URL('./vendor/pdfjs/${p}/',import.meta.url).href`,JSON.stringify(resolve('dist/vendor/pdfjs/'+p)+'/'));
const moduleURL=new URL(`../dist/.pdf-test-${process.pid}.mjs`,import.meta.url);
await writeFile(moduleURL,code);
let readPDF;
try { ({readPDF}=await import(moduleURL.href)); } finally { await unlink(moduleURL); }
const file=bytes=>({size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});

function document(pages=1,text='') {
  const objects=['<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Count ${pages} /Kids [${Array.from({length:pages},(_,i)=>`${4+i*2} 0 R`).join(' ')}] >>`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  for(let i=0;i<pages;i++){
    const stream=`BT /F1 12 Tf 10 700 Td (${text}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500000 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5+i*2} 0 R >>`,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  let pdf='%PDF-1.4\n';const offsets=[0];
  objects.forEach((s,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${s}\nendobj\n`;});
  const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('');
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
test('real Korean PDF extracts lesson text with shipped CMaps and worker',async()=>{
  const bytes=Buffer.from(await readFile(new URL('./fixtures/water.pdf.base64',import.meta.url),'utf8'),'base64');
  const progress=[],text=await readPDF(file(bytes),p=>progress.push(p));
  assert.ok(text.includes('액체인 물이 기체인 수증기로 변하는 현상은 증발입니다.'));
  assert.ok(text.includes('응결'));assert.equal(progress.length,1);
});
test('text-free and invalid PDF fail with actionable messages',async()=>{
  await assert.rejects(readPDF(file(document())),/스캔·사진 PDF/);
  await assert.rejects(readPDF(file(Buffer.from('not a PDF'))),/PDF 파일인지/);
  await assert.rejects(readPDF(file(Buffer.from('%PDF-1.4 broken'))),/PDF를 읽지 못했어요/);
});
test('PDF size, page and extracted-text limits are enforced',async()=>{
  await assert.rejects(readPDF({size:10*1024*1024+1,arrayBuffer(){throw Error('must not read oversized file');}}),/10MB/);
  await assert.rejects(readPDF(file(document(51))),/50쪽/);
  await assert.rejects(readPDF(file(document(1,'A'.repeat(16001)))),/16,000자/);
});

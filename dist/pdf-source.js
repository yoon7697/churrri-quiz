export async function readPDF(file,onProgress=()=>{}) {
  if(file.size>10*1024*1024)throw Error('10MB 이하 PDF를 선택해 주세요.');
  const lib=await import('./vendor/pdfjs/build/pdf.mjs');
  lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/build/pdf.worker.mjs',import.meta.url).href;
  let task,doc;
  try {
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-'))throw Error('PDF 파일인지 확인해 주세요.');
    task=lib.getDocument({data:bytes,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,
      standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,isEvalSupported:false});
    doc=await task.promise;
    if(doc.numPages>50)throw Error('50쪽 이하 PDF를 선택해 주세요. 필요한 차시만 따로 저장하면 좋아요.');
    let text='';
    for(let i=1;i<=doc.numPages;i++) {
      onProgress(`${i} / ${doc.numPages}쪽에서 글을 읽고 있어요…`);
      const page=await doc.getPage(i),content=await page.getTextContent();
      text+=content.items.filter(v=>'str' in v).map(v=>v.str+(v.hasEOL?'\n':' ')).join('')+'\n';
      page.cleanup();
      if(text.length>16000)throw Error('PDF 내용이 16,000자를 넘어요. 필요한 차시만 골라 다시 올려 주세요.');
    }
    if(text.trim().length<40)throw Error('읽을 수 있는 글이 부족해요. 스캔·사진 PDF는 내용을 직접 붙여넣어 주세요.');
    return text.trim();
  } catch(e) {
    if(e.name==='PasswordException')throw Error('암호가 없는 PDF를 선택해 주세요.');
    if(e.name==='InvalidPDFException')throw Error('PDF를 읽지 못했어요. 파일을 확인하거나 내용을 직접 붙여넣어 주세요.');
    throw e;
  } finally {if(task)await task.destroy();}
}

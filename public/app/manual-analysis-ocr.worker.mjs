// Owning the OCR worker from another dedicated worker gives the UI a handle
// before Tesseract starts loading. Terminating this owner also terminates its
// dependent workers, including failures/cancellation during language startup.
let recognizer;
self.onmessage=async ({data})=>{
  try{
    if(data.operation==='initialize'){
      const {default:Tesseract}=await import('./vendor/ocr/tesseract.esm.min.js');
      const local=path=>new URL(path,import.meta.url).href;
      recognizer=await Tesseract.createWorker('eng',1,{workerPath:local('./vendor/ocr/worker.min.js'),corePath:local('./vendor/ocr/'),langPath:local('./vendor/ocr/'),
        workerBlobURL:false,legacyCore:false,legacyLang:false,gzip:true,cacheMethod:'none',
        logger:value=>self.postMessage({type:'progress',value}),errorHandler:error=>{throw error;}});
      self.postMessage({id:data.id,result:{ready:true}});
    }else if(data.operation==='recognize'&&recognizer){
      const result=await recognizer.recognize(new Uint8Array(data.image),{}, {text:true});
      self.postMessage({id:data.id,result:{text:result.data.text||'',confidence:result.data.confidence||0}});
    }else throw new Error('The OCR worker is not ready.');
  }catch(error){self.postMessage({id:data.id,error:{name:error?.name||'Error',message:error?.message||String(error),stack:error?.stack,code:error?.code}});}
};

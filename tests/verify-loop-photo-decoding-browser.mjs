// Synthetic images only. Verifies browser decoding/orientation, not physical iPhone support.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const pw=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browsers=(process.env.FINDR_PHOTO_BROWSERS||'chromium').split(',');
const url=process.env.FINDR_FIELD_URL||'http://127.0.0.1:4186/app/';
for(const name of browsers) {
  const executablePath=process.env[name==='webkit'?'FINDR_WEBKIT':'FINDR_CHROMIUM'];
  const browser=await pw[name].launch({headless:true,...(executablePath?{executablePath}:{}),...(name==='chromium'?{args:['--no-sandbox']}:{} )});
  try {
    const context=await browser.newContext({serviceWorkers:'block'});
    const page=await context.newPage();await page.goto(url);
    const result=await page.evaluate(async()=>{
      const {prepareLoopPhoto}=await import('./loop-photo-import.mjs');
      const canvas=document.createElement('canvas');canvas.width=400;canvas.height=200;
      const draw=canvas.getContext('2d');draw.fillStyle='#fff';draw.fillRect(0,0,400,200);
      draw.fillStyle='#000';draw.font='35px sans-serif';draw.fillText('SYNTHETIC PHOTO',10,80);
      const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'));
      const bytes=new Uint8Array(await jpeg.arrayBuffer());
      // APP1 EXIF orientation 6: browsers must apply the 90-degree rotation.
      const exif=Uint8Array.from([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
      const rotated=new File([bytes.slice(0,2),exif,bytes.slice(2)],'synthetic-orientation6.jpg',{type:'image/jpeg'});
      const prepared=await prepareLoopPhoto(rotated);
      const failures={};
      for(const [label,type,name] of [['invalid','image/png','synthetic-invalid.png'],['heic','image/heic','synthetic-invalid.heic']]) {
        try {await prepareLoopPhoto(new File(['Synthetic invalid image'],name,{type}));}
        catch(error){failures[label]={code:error.code,message:error.message};}
      }
      return {workingImage:prepared.workingImage,failures};
    });
    assert.equal(result.workingImage.width,200);assert.equal(result.workingImage.height,400);
    assert.equal(result.failures.invalid.code,'LOOP_PHOTO_UNREADABLE');
    assert.equal(result.failures.heic.code,'LOOP_PHOTO_UNSUPPORTED_HEIC');
    console.log(JSON.stringify({browser:name,version:browser.version(),physicalDevice:false,...result},null,2));
  } finally {await browser.close();}
}

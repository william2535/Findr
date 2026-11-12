import downloads from '../../../../lib/download-map.json';
import {pagesPreflight, withPagesCors} from '../../../../lib/pages-cors.mjs';
const urls:Record<string,string> = downloads;
function safe(url:URL) {
  const h=url.hostname.toLowerCase();
  return ['https:','http:'].includes(url.protocol) && !url.username && !url.password && (!url.port || ['80','443'].includes(url.port)) && !h.includes(':') && h.includes('.') && !h.endsWith('.local') && !h.endsWith('.localhost') && !/^\d+\.\d+\.\d+\.\d+$/.test(h);
}
export const OPTIONS = (request:Request) => pagesPreflight(request, {methods: ['GET'], headers: ['range', 'if-range']});
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
  return withPagesCors(request, await getManual(request,context), ['Content-Length','Content-Range','Accept-Ranges','ETag','Last-Modified']);
}
async function getManual(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params; if(!urls[id]) return new Response('Manual not in this catalogue snapshot.',{status:404});
  const requestedRange=request.headers.get('range');
  if(requestedRange && !/^bytes=\d+-\d*$/.test(requestedRange))return new Response('Only a single forward byte range is supported.',{status:400});
  if(requestedRange){const match=requestedRange.match(/^bytes=(\d+)-(\d*)$/)!;const start=Number(match[1]),end=match[2]?Number(match[2]):null;if(!Number.isSafeInteger(start)||start<0||start>=125829120||end!==null&&(!Number.isSafeInteger(end)||end<start||end>=125829120))return new Response('Invalid PDF byte range.',{status:400});}
  const ifRange=request.headers.get('if-range');
  const upstreamHeaders:Record<string,string>={'Accept':'application/pdf,application/octet-stream;q=0.8','User-Agent':'FINDR/0.32 (manual download requested by user)'};
  if(requestedRange)upstreamHeaders.Range=requestedRange;
  if(requestedRange&&ifRange&&ifRange.length<256&&!/[\r\n]/.test(ifRange))upstreamHeaders['If-Range']=ifRange;
  let url=new URL(urls[id]);
  try {
    for(let i=0;i<6;i++) {
      if(!safe(url))return new Response('Unsupported publisher address.',{status:400});
      const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(60000),headers:upstreamHeaders});
      if([301,302,303,307,308].includes(r.status)){ const next=r.headers.get('location');if(!next)break;url=new URL(next,url);continue; }
      if(r.status===416)return new Response('The saved download range is no longer available. Restart the PDF.',{status:416});
      if(!r.ok)return new Response('Publisher returned '+r.status,{status:502});
      const rangeTotal=Number(r.headers.get('content-range')?.match(/\/(\d+)$/)?.[1]||0);
      if(rangeTotal>125829120||Number(r.headers.get('content-length')||0)>125829120)return new Response('This file exceeds the 120 MB app limit. Open the publisher link.',{status:413});
      const headers=new Headers({'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
      const size=r.headers.get('content-length');if(size)headers.set('Content-Length',size);
      for(const key of ['Content-Range','Accept-Ranges','ETag','Last-Modified']){const value=r.headers.get(key);if(value)headers.set(key,value);}
      return new Response(r.body,{headers,status:r.status===206?206:200});
    }
    return new Response('Too many publisher redirects.',{status:502});
  } catch { return new Response('Publisher unavailable. Retry or import the PDF from its source.',{status:502}); }
}

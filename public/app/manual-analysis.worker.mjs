import {buildManualAnalysis, searchManualPages} from './manual-analysis-core.mjs';
self.onmessage = ({data}) => {
  try {
    const result = data.operation === 'analyse' ? buildManualAnalysis(data.payload) : data.operation === 'search' ? searchManualPages(data.payload.analysis,data.payload.query,data.payload.options) : null;
    if (!result) throw new Error('Unsupported manual worker operation.');
    self.postMessage({id:data.id,result});
  } catch (error) { self.postMessage({id:data.id,error:{name:error.name,message:error.message,stack:error.stack,code:error.code}}); }
};

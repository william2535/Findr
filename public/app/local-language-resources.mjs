// Reproducible optional model pack. Model files are never part of the app shell.
export const LOCAL_LANGUAGE_VERSION='2026-11-11.3';
export const LOCAL_MODEL_CACHE='findr-language-model-v1';
export const LOCAL_MODEL_CHUNK_BYTES=8*1024*1024;
export const LOCAL_MODEL={
 id:'onnx-community/SmolLM2-360M-Instruct-ONNX',
 title:'SmolLM2 360M Instruct · int8 · local CPU',
 revision:'fe7c7db4c8921c9e3fa1c65cfd296fb3b1b1a8f9',
 dtype:'q8',backend:'wasm',parameters:360000000,license:'Apache-2.0',
 originalModel:'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct',
 modelCard:'https://huggingface.co/onnx-community/SmolLM2-360M-Instruct-ONNX',
 maxInputTokens:768,maxNewTokens:96,
 limits:'Compact local language model. Interpretations need source checks. It does not verify electrical procedures, measurements or compatibility. CPU replies can take tens of seconds; saved references remain available.'
};
const files=[
 ['config.json',961,'74c6493e7352434a031c0e2bd55a015ef90ac25d549ca1dcc7972a6731459456'],
 ['generation_config.json',132,'3a6555a034b32bf2fc6d35cc16207dc95c8af520b2d45febe48a1ad6cb46ff63'],
 ['tokenizer.json',3522656,'7d27c493c729a66ecefc837280b05d948b1ed50d130eebdbf911b1b36cf38ed7'],
 ['tokenizer_config.json',3794,'7b85619980209ca801effcd87e5df7084a21abc3d8b8d27003a6b4ffcce170ef'],
 ['onnx/model_quantized.onnx',363115149,'5ee6c8dc6791050d8779687a16c8167643a234e00ea41e06a92e05f88003dbb3']
];
export const LOCAL_MODEL_FILES=files.map(([path,bytes,sha256])=>({path,bytes,sha256,url:`https://huggingface.co/${LOCAL_MODEL.id}/resolve/${LOCAL_MODEL.revision}/${path}`}));
export const LOCAL_MODEL_BYTES=LOCAL_MODEL_FILES.reduce((sum,file)=>sum+file.bytes,0);
export const LOCAL_MODEL_RUNTIME_PATHS=['./vendor/local-language/transformers.min.js','./vendor/local-language/ort-wasm-simd-threaded.mjs','./vendor/local-language/ort-wasm-simd-threaded.wasm','./vendor/local-language/hashes/sha2.js','./vendor/local-language/hashes/_md.js','./vendor/local-language/hashes/_u64.js','./vendor/local-language/hashes/utils.js','./local-language-worker.mjs','./local-language-download.mjs','./local-language-cache.mjs','./local-language-resources.mjs','./local-language-recovery.mjs'];
export const LOCAL_MODEL_RUNTIME_BYTES=12090801; // Bundled runtime/vendor bytes; app modules are part of the app shell.
export function localModelPartCount(file){return Math.ceil(file.bytes/LOCAL_MODEL_CHUNK_BYTES);}
export function localModelPartBytes(file,index){return Math.min(LOCAL_MODEL_CHUNK_BYTES,file.bytes-index*LOCAL_MODEL_CHUNK_BYTES);}
export function modelResourceURL(file){return file.url;}

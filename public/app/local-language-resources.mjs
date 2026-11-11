// Reproducible optional model pack. Model files are never part of the app shell.
export const LOCAL_LANGUAGE_VERSION='2026-11-11.4';
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

// Downloading or testing this optional pack never changes the active profile.
const conversationModel={
 id:'unsloth/Qwen3.5-2B-GGUF',title:'Experimental conversation model · Qwen3.5 2B Q4_K_M',
 revision:'f6d5376be1edb4d416d56da11e5397a961aca8ae',dtype:'Q4_K_M',backend:'wasm',runtime:'wllama-3.13.0',parameters:2000000000,license:'Apache-2.0',
 originalModel:'https://huggingface.co/Qwen/Qwen3.5-2B',modelCard:'https://huggingface.co/unsloth/Qwen3.5-2B-GGUF',
 experimental:true,dialogueVersion:1,dialogueFormat:'tasks-json',contextTokens:1536,maxInputTokens:1356,maxNewTokens:180,
 limits:'Experimental request interpretation. Benchmark results were mixed; corrections and component changes can still be misunderstood. One tested Chromium CPU took about 90 seconds for a multi-step request. iPhone capacity and speed are unverified. Manuals remain the source of technical facts; no cloud fallback.'
};
const conversationFiles=[{path:'Qwen3.5-2B-Q4_K_M.gguf',bytes:1280835840,sha256:'aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223',url:'https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/f6d5376be1edb4d416d56da11e5397a961aca8ae/Qwen3.5-2B-Q4_K_M.gguf'}];
const commonRuntime=['./local-language-worker.mjs','./local-language-download.mjs','./local-language-cache.mjs','./local-language-resources.mjs','./local-language-recovery.mjs','./local-language-gguf.mjs','./vendor/local-language/hashes/sha2.js','./vendor/local-language/hashes/_md.js','./vendor/local-language/hashes/_u64.js','./vendor/local-language/hashes/utils.js'];
export const GGUF_RUNTIME_PATHS={module:'./vendor/local-language/wllama/index.min.js',wasm:'./vendor/local-language/wllama/wllama.wasm',compatWorker:'./vendor/local-language/wllama-compat/wllama.js',compatWasm:'./vendor/local-language/wllama-compat/wllama.wasm'};
export const LOCAL_LANGUAGE_PROFILES=Object.freeze({
 compact:Object.freeze({id:'compact',title:'Compact reference model',experimental:false,model:LOCAL_MODEL,files:LOCAL_MODEL_FILES,bytes:LOCAL_MODEL_BYTES,runtimePaths:LOCAL_MODEL_RUNTIME_PATHS,runtimeBytes:LOCAL_MODEL_RUNTIME_BYTES}),
 'conversation-2b':Object.freeze({id:'conversation-2b',title:conversationModel.title,experimental:true,model:conversationModel,files:conversationFiles,bytes:1280835840,runtimePaths:[...commonRuntime,...Object.values(GGUF_RUNTIME_PATHS)],runtimeBytes:29395450})
});
export function getLocalModelProfile(id='compact'){const profile=LOCAL_LANGUAGE_PROFILES[id];if(!profile)throw Object.assign(new Error('Unknown local language model profile.'),{code:'MODEL_PROFILE_INVALID'});return profile;}

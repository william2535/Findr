// FINDR project foundation — local-only, versioned records.
// No navigation or database migration is performed by importing this module.
export const PROJECT_SCHEMA_VERSION = 1;
export const PROJECT_SYSTEMS = Object.freeze(['fire','intruder','cctv','access']);
export const TEST_STATUSES = Object.freeze(['not_tested','pass','fail','blocked','not_applicable']);
export const ACTION_STATUSES = Object.freeze(['open','in_progress','blocked','resolved','verified']);
const id = () => globalThis.crypto?.randomUUID?.() || 'prj-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const required = (value, field) => { if(typeof value!=='string'||!value.trim()) throw new Error(field+' is required'); return value.trim(); };
export function createProject({name,site='',system='fire'}={}) {
  if(!PROJECT_SYSTEMS.includes(system)) throw new Error('Unsupported project system');
  const now=new Date().toISOString();
  return {schemaVersion:PROJECT_SCHEMA_VERSION,id:id(),name:required(name,'Project name'),site:String(site).trim(),system,createdAt:now,updatedAt:now,revision:1,matrices:[],testCases:[],testRuns:[],actions:[],assets:[]};
}
export function validateProject(project) {
  if(!project||project.schemaVersion!==PROJECT_SCHEMA_VERSION) throw new Error('Unsupported project backup version');
  required(project.id,'Project ID'); required(project.name,'Project name');
  if(!PROJECT_SYSTEMS.includes(project.system)) throw new Error('Invalid system');
  for(const key of ['matrices','testCases','testRuns','actions','assets']) if(!Array.isArray(project[key])) throw new Error('Invalid '+key);
  return project;
}
export function addTestCase(project,{reference,input,expectedOutputs=[]}) {
  validateProject(project);
  if(!Array.isArray(expectedOutputs)||!expectedOutputs.length) throw new Error('Expected outputs required');
  const test={id:id(),reference:required(reference,'Test reference'),input:required(input,'Input'),expectedOutputs:expectedOutputs.map(String),createdAt:new Date().toISOString()};
  return update(project,'testCases',test);
}
export function recordTest(project,{testCaseId,status,actualOutputs=[],notes='',witness='',evidenceRefs=[]}) {
  validateProject(project);
  if(!project.testCases.some(x=>x.id===testCaseId)) throw new Error('Unknown test case');
  if(!TEST_STATUSES.includes(status)) throw new Error('Invalid test status');
  const run={id:id(),testCaseId,status,actualOutputs:actualOutputs.map(String),notes:String(notes),witness:String(witness),evidenceRefs:[...evidenceRefs],recordedAt:new Date().toISOString()};
  return update(project,'testRuns',run);
}
export function addAction(project,{title,priority='normal',sourceTestRunId=null,owner='',dueDate=null}) {
  validateProject(project);
  if(sourceTestRunId&&!project.testRuns.some(x=>x.id===sourceTestRunId)) throw new Error('Unknown test run');
  const action={id:id(),title:required(title,'Action title'),priority,status:'open',sourceTestRunId,owner:String(owner),dueDate,createdAt:new Date().toISOString()};
  return update(project,'actions',action);
}
function update(project,key,item){return {...project,[key]:[...project[key],item],revision:project.revision+1,updatedAt:new Date().toISOString()};}
export function projectSummary(project){
  validateProject(project);
  const latest=new Map();for(const run of project.testRuns)latest.set(run.testCaseId,run.status);
  return {totalTests:project.testCases.length,passed:[...latest.values()].filter(s=>s==='pass').length,failed:[...latest.values()].filter(s=>s==='fail').length,untested:project.testCases.filter(t=>!latest.has(t.id)).length,openActions:project.actions.filter(a=>!['resolved','verified'].includes(a.status)).length};
}
export function exportProject(project){validateProject(project);return JSON.stringify({format:'findr-project',exportVersion:1,project},null,2);}
export function importProject(text){const parsed=JSON.parse(text);if(parsed.format!=='findr-project'||parsed.exportVersion!==1)throw new Error('Not a supported FINDR project backup');return validateProject(parsed.project);}

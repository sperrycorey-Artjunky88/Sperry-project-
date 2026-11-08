import {emptyState} from './core.mjs';
import {backup,readBackup} from './storage.mjs';
export const MODE_KEY='core-ai-storage-mode';
export function createWorkspaceSession({client,openLocal,readLocal,preferences}){
 let local=null,state=emptyState(),mode=preferences.getItem(MODE_KEY)==='shared'?'shared':'local',remembered=true;
 const remember=value=>{try{preferences.setItem(MODE_KEY,value);remembered=true;}catch{remembered=false;}};
 return {
  get sharedSnapshot(){const current=client.snapshot;return current?structuredClone(current):null;},get hasSharedSnapshot(){return client.snapshot!==null;},get state(){return structuredClone(state);},get mode(){return mode;},get remembered(){return remembered;},
  async start(){if(mode==='shared')state=(await client.read()).state;else {local=await openLocal();state=local.state;}return this.state;},
  async checkShared(){if(mode==='shared')throw Error('Use Refresh shared after saving your drafts.');return client.read();},
  async useShared(){const result=await client.read();state=result.state;mode='shared';remember(mode);return this.state;},
  async useLocal(){const next=await openLocal();local=next;state=local.state;mode='local';remember(mode);return this.state;},
  async refresh(){if(mode==='shared'){state=(await client.read()).state;}else{local=await openLocal();state=local.state;}return this.state;},
  async save(next){const result=mode==='shared'?(await client.save(next)).state:await local.save(next);state=result;return this.state;},
  async importShared(raw,{confirmed=false}={}){if(mode!=='shared')throw Error('Select shared storage before importing there.');const result=await client.importBackup(raw,{confirmed});state=result.state;return {...result,state:this.state};},
  async uploadLocal(raw,{confirmed=false}={}){
   if(confirmed!==true)throw Error('Confirm the upload and saved backup first.');
   const exported=await readBackup(JSON.parse(raw)),current=await readLocal();
   if((await backup(exported)).checksum!==(await backup(current)).checksum)throw Error('Local data changed after export. Download a new backup before uploading.');
   const result=await client.importBackup(raw,{confirmed:true});
   state=result.state;mode='shared';remember(mode);return {...result,state:this.state};
  }
 };
}

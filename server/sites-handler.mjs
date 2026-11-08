// Preparation adapter, not a standalone Worker or a deployed route.
// getUser must call Sites' trusted server-only identity helper in host context.
// Never implement getUser by copying an unverified browser header/body value.
import {createSharedStore} from './shared-store.mjs';
import {createWorkspaceApi} from './workspace-api.mjs';
const unavailable=()=>Response.json({error:'Shared storage is not enabled or is unavailable. Local data has not been changed.'},{status:503,headers:{'Cache-Control':'no-store'}});
export function createSitesHandler({getUser}){
 if(typeof getUser!=='function')throw Error('A trusted Sites identity resolver is required.');
 return async function handle(request,env={}){
  if(env.WORKSPACE_SHARED_ENABLED!=='true'||typeof env.WORKSPACE_OWNER_ID!=='string'||!env.WORKSPACE_OWNER_ID.trim()||!env.DB?.prepare||!env.DB?.batch)return unavailable();
  try{
   const user=await getUser();
   const api=createWorkspaceApi({store:createSharedStore(env.DB),ownerId:env.WORKSPACE_OWNER_ID});
   return await api(request,typeof user?.id==='string'?user.id:null);
  }catch{return unavailable();}
 };
}

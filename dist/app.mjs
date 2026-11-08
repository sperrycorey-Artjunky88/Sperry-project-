import {emptyState,uid,validate,mergeBackup,handoff} from './core.mjs';
import {openWorkspace,backup,readBackup,readCommittedState,recoveryRecords,LEGACY_KEY as KEY} from './storage.mjs';
import {createSharedClient} from './shared-client.mjs';
import {createWorkspaceSession,MODE_KEY} from './workspace-session.mjs';
const $=id=>document.getElementById(id);
let storage, saving=false,migrationRaw=null,sharedReady=false;
let state=emptyState(), selected=null, editingTask=null, editingLesson=null, pendingApproval=null, view='work', blocked=false, timer;
try {storage=createWorkspaceSession({client:createSharedClient(),openLocal:openWorkspace,readLocal:readCommittedState,preferences:localStorage});state=await storage.start();$('save-state').textContent='Ready · '+(storage.mode==='shared'?'saved in shared workspace':'saved on this browser');}catch(e){blocked=true;warn('Saving paused: '+e.message+' Your original browser data has not been overwritten. Export recovery data and keep this page open.');}
selected=state.tasks.at(-1)?.id||null;
function warn(message){$('warning').textContent=message;$('warning').hidden=false;}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('toast').hidden=true,4500);}
async function save(next){if(blocked||saving){toast('Saving is paused. Keep your unsaved text.');return false;}saving=true;const controls=[...document.querySelectorAll('button,input,select,textarea')].filter(n=>!n.disabled);controls.forEach(n=>n.disabled=true);try{state=await storage.save(next);$('save-state').textContent=(storage.mode==='shared'?'Saved to shared workspace ':'Saved in this browser ')+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});return true;}catch(e){blocked=true;warn('Not saved: '+e.message+' Export recovery data and keep any unsaved text before reloading.');toast('Not saved. Please keep this page open.');return false;}finally{saving=false;controls.forEach(n=>n.disabled=false);}}
async function change(fn){const next=structuredClone(state);fn(next);return save(next);}
function current(){return state.tasks.find(t=>t.id===selected);}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function action(text,handler,cls=''){const b=el('button',cls,text);b.type='button';b.onclick=handler;return b;}
function showView(name){view=name;for(const v of ['work','lessons','guide'])$('view-'+v).hidden=v!==name;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===name));}
function renderTasks(){const list=$('task-list');list.replaceChildren();if(!state.tasks.length)list.append(el('p','empty-list','Your next good idea starts here.'));for(const t of [...state.tasks].reverse().filter(t=>t.title.toLowerCase().includes($('task-search').value.toLowerCase())&&($('task-filter').value==='all'||t.status===$('task-filter').value))){const b=action('',()=>{if(saving||!safeToLeave())return;selected=t.id;renderTasks();renderTask();showView('work');},'task-link'+(t.id===selected?' selected':''));b.append(el('span','task-icon',t.status==='complete'?'✓':'◇'));const label=el('span','',t.title);label.append(el('small','',t.status==='complete'?'Completed':`${t.responses.length} response${t.responses.length===1?'':'s'}`));b.append(label);list.append(b);}}
function reviewDirty(){const t=current();return t && ['agreement','disagreement','decision','outcome'].some(k=>$(k).value!==t[k]);}
function safeToLeave(){return !($('response-body').value.trim()||reviewDirty())||confirm('You have unsaved text in this task. Leave it behind and switch?');}
function renderTask(){const t=current();$('empty').hidden=!!t;$('task-work').hidden=!t;if(!t)return;$('task-title').textContent=t.title;$('task-goal').textContent=t.goal;$('task-constraints').textContent=t.constraints||'No constraints recorded.';$('complete-task').textContent=t.status==='complete'?'Reopen task':'Mark complete';for(const k of ['agreement','disagreement','decision','outcome'])$(k).value=t[k];$('response-body').value='';renderResponses();}
function renderResponses(){const t=current();const list=$('responses');list.replaceChildren();$('copy-review').disabled=!t?.responses.length;if(!t?.responses.length){list.append(el('div','no-response','No responses yet. Copy the brief into an AI chat, then paste the answer below.'));return;}for(const [i,r] of t.responses.entries()){const card=el('article','response-card');const palette={Juniper:['#83aa70','#ecf3e3'],Joe:['#dfa87a','#faeee2'],Gemini:['#a7a0d2','#f0edf8']}[r.agent]||['#94b5b8','#eaf3f3'];card.style.setProperty('--accent',palette[0]);card.style.setProperty('--tint',palette[1]);const h=el('div','agent');h.append(el('span','avatar',r.agent.charAt(0)),el('span','',r.agent));card.append(h,el('time','',`Response ${i+1} · ${new Date(r.created).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`));const preview=el('pre','',r.body.length>650?r.body.slice(0,650)+'…':r.body);card.append(preview);if(r.body.length>650){const d=el('details');d.append(el('summary','','Read full response'),el('pre','',r.body));card.append(d);}list.append(card);}}
function renderLessons(){const list=$('lessons-list');list.replaceChildren();$('lesson-count').textContent=state.lessons.filter(l=>l.status==='approved').length;if(!state.lessons.length){const box=el('div','card empty');box.append(el('div','orbit','↗'),el('h2','','Experience into better habits.'),el('p','','Save a correction or something that helped. Add evidence and a test, then decide whether it belongs in future handoffs.'),action('＋ Propose your first lesson',()=>openLesson(), 'primary'));list.append(box);return;}
 for(const l of [...state.lessons].reverse()){const card=el('article','card lesson-card'),head=el('div','card-heading');head.append(el('span','pill '+l.status,l.status==='approved'?'Approved for handoffs':'Proposed · not in handoffs'),el('span','quiet',l.result?'Test result recorded':'Not yet tested'));card.append(head,el('h2','',l.rule));const dl=el('dl');for(const [name,value] of [['Evidence',l.evidence],['Test',l.test],['Observed result',l.result||'No result recorded yet.']])dl.append(el('dt','',name),el('dd','',value));card.append(dl);const task=state.tasks.find(t=>t.id===l.taskId);if(task)card.append(el('p','quiet','From task: '+task.title));const buttons=el('div','button-row');buttons.append(action('Edit / record result',()=>openLesson(l.id)));if(l.status==='proposed')buttons.append(action('Review & approve',()=>{pendingApproval=l.id;$('approve-text').textContent=l.rule;$('approve-dialog').showModal();},'primary'));else buttons.append(action('Return to proposed',async()=>{if(await change(s=>s.lessons.find(x=>x.id===l.id).status='proposed')){renderLessons();toast('Lesson removed from future handoffs. The record is kept.');}}));card.append(buttons);list.append(card);}}
function openTask(edit=false){if(saving)return;if(!edit&&!safeToLeave())return;editingTask=edit?selected:null;const t=edit?current():null;$('task-dialog-title').textContent=edit?'Edit the shared brief':'Start a task';for(const k of ['title','goal','constraints'])$(k).value=t?.[k]||'';$('task-dialog').showModal();$('title').focus();}
function openLesson(id=null){editingLesson=id;const l=state.lessons.find(x=>x.id===id);$('lesson-dialog-title').textContent=id?'Update a lesson':'Propose a lesson';for(const k of ['rule','evidence','test','result'])$('lesson-'+k).value=l?.[k]||'';$('lesson-dialog').showModal();$('lesson-rule').focus();}
async function copy(mode){const task=current();if(!task)return;if(mode==='review'&&reviewDirty()){toast('Save your review first so the handoff includes your latest notes.');$('review-form').scrollIntoView({behavior:'smooth'});return;}const text=handoff(task,state.lessons,mode);try{await navigator.clipboard.writeText(text);toast(mode==='brief'?'Brief copied. Paste it into your AI chat.':'Cross-review copied. Paste it into your AI chat.');}catch{$('copy-text').value=text;$('copy-dialog').showModal();$('copy-text').focus();$('copy-text').select();}}
$('task-form').onsubmit=async e=>{e.preventDefault();const title=$('title').value.trim(),goal=$('goal').value.trim();if(!title||!goal){toast('Add a task name and goal.');return;}const id=editingTask||uid();if(await change(s=>{const values={title,goal,constraints:$('constraints').value.trim()};if(editingTask)Object.assign(s.tasks.find(t=>t.id===id),values);else s.tasks.push({id,created:new Date().toISOString(),...values,status:'active',responses:[],agreement:'',disagreement:'',decision:'',outcome:''});})){selected=id;$('task-dialog').close();renderTasks();if(editingTask){$('task-title').textContent=title;$('task-goal').textContent=goal;$('task-constraints').textContent=current().constraints||'No constraints recorded.';}else renderTask();showView('work');toast('Task saved. Your shared brief is ready.');}};
$('response-form').onsubmit=async e=>{e.preventDefault();const body=$('response-body').value.trim();if(!body)return;if(await change(s=>s.tasks.find(t=>t.id===selected).responses.push({id:uid(),agent:$('agent').value,body,created:new Date().toISOString()}))){$('response-body').value='';renderTasks();renderResponses();toast('Response saved.');}};
$('review-form').onsubmit=async e=>{e.preventDefault();if(await change(s=>{const t=s.tasks.find(x=>x.id===selected);for(const k of ['agreement','disagreement','decision','outcome'])t[k]=$(k).value;}))toast('Review and outcome saved.');};
$('lesson-form').onsubmit=async e=>{e.preventDefault();const values={};for(const k of ['rule','evidence','test','result'])values[k]=$('lesson-'+k).value.trim();if(!values.rule||!values.evidence||!values.test){toast('Add the lesson, evidence, and a test.');return;}if(await change(s=>{if(editingLesson)Object.assign(s.lessons.find(l=>l.id===editingLesson),values,{status:'proposed'});else s.lessons.push({id:uid(),created:new Date().toISOString(),taskId:selected||'',...values,status:'proposed'});})){renderLessons();$('lesson-dialog').close();showView('lessons');toast('Lesson saved as proposed.');}};
$('approve-form').onsubmit=async e=>{e.preventDefault();if(await change(s=>s.lessons.find(l=>l.id===pendingApproval).status='approved')){renderLessons();$('approve-dialog').close();toast('Approved. Future handoffs will include this lesson.');}};
$('complete-task').onclick=async()=>{if(await change(s=>{const t=s.tasks.find(x=>x.id===selected);t.status=t.status==='complete'?'active':'complete';})){renderTasks();$('complete-task').textContent=current().status==='complete'?'Reopen task':'Mark complete';toast(current().status==='complete'?'Task marked complete. All work is kept.':'Task reopened.');}};
function download(text,name){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('backup').onclick=async()=>{try{if(blocked&&storage?.mode==='shared'){await exportLastSharedView();return;}if(blocked){download(JSON.stringify({format:'core-workspace-recovery-v1',legacyRaw:localStorage.getItem(KEY),records:await recoveryRecords()},null,2),'core-workspace-recovery.json');toast('Recovery download started. Keep this file for recovery; it is not a normal import.');return;}const data=await backup(storage.mode==='shared'?await latestSharedStateForBackup():await readCommittedState());await readBackup(data);download(JSON.stringify(data,null,2),`core-workspace-${new Date().toISOString().slice(0,10)}.json`);toast('Verified backup download started. Check the file is saved somewhere safe.');}catch(e){if(storage?.mode==='shared'){await exportLastSharedView();return;}try{const raw=localStorage.getItem(KEY);if(raw!==null)download(raw,'core-workspace-legacy-recovery.json');}catch{}warn('Backup could not be completed: '+e.message+' Keep this page open.');}};
$('restore').onclick=()=>{if(blocked){toast('Import is blocked to protect unreadable saved data. Use another browser and keep a recovery copy.');return;}if(safeToLeave())$('import-file').click();};
$('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('Backup is too large (maximum 20 MB).');const raw=await file.text();const incoming=await readBackup(JSON.parse(raw));if(!safeToLeave()){toast('Import cancelled. Unsaved text is kept.');return;}if(storage.mode==='shared'){if(!confirm('Import this backup into the shared workspace? Existing records and local originals are kept.'))return;await storageOperation(async()=>{const result=await storage.importShared(raw,{confirmed:true});adoptStorage();toast(`${result.added} records added. Imported lessons need approval.`);});return;}const {state:next,added}=mergeBackup(state,incoming);if(await save(next)){selected=selected||state.tasks.at(-1)?.id||null;renderTasks();renderTask();renderLessons();toast(`${added} records added. Imported lessons need approval.`);}}catch(err){toast(err instanceof SyntaxError?'This file is not valid JSON. Nothing was imported.':err.message);}finally{e.target.value='';}};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('new-task').onclick=()=>openTask();$('start-task').onclick=()=>openTask();$('edit-task').onclick=()=>openTask(true);$('new-lesson').onclick=()=>openLesson();$('propose-from-task').onclick=()=>openLesson();$('copy-brief').onclick=()=>copy('brief');$('copy-review').onclick=()=>copy('review');$('select-copy').onclick=()=>{$('copy-text').focus();$('copy-text').select();$('copy-text').setSelectionRange(0,$('copy-text').value.length);};
window.addEventListener('beforeunload',e=>{if(saving||$('response-body').value.trim()||reviewDirty()||[...document.querySelectorAll('dialog[open] textarea,dialog[open] input')].some(n=>!n.readOnly&&n.value.trim())){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===MODE_KEY){blocked=true;warn('This workspace changed in another tab. Saving is paused to prevent overwriting it. Keep any unsaved text, then reload this page.');}});
$('task-search').oninput=renderTasks;$('task-filter').onchange=renderTasks;
$('persist-storage').onclick=async()=>{try{const kept=await navigator.storage?.persist?.();toast(kept?'Browser granted persistent storage. Keep external backups too.':'Browser did not grant persistent storage. Keep external backups.');}catch{toast('Persistent storage is unavailable. Keep external backups.');}};
updateStorageLabel();renderTasks();renderTask();renderLessons();showView(view);


function updateStorageLabel(){
 const shared=storage?.mode==='shared';
 $('storage-button').textContent='Storage: '+(shared?'Shared':'This browser');
 $('storage-label').textContent=shared?'Shared workspace':'Saved on this browser';
 $('storage-help').textContent=shared?'Changes save to the shared workspace. AI replies are still pasted manually.':'This browser keeps its own records. Shared storage requires explicit connection and upload.';
 $('refresh-shared').hidden=!shared;$('storage-mode').textContent=shared?'You are working in shared storage. Local originals remain on this browser.':'You are working in this browser only. No tasks are uploaded automatically.';
 $('storage-check').hidden=shared;$('storage-use').hidden=shared;$('storage-migrate').hidden=shared;
}
function storageButtons(){
 $('storage-use').disabled=!sharedReady;
 $('storage-confirm').disabled=!migrationRaw||!sharedReady;
 $('storage-upload').disabled=!migrationRaw||!sharedReady||!$('storage-confirm').checked;
}
function workspaceDrafts(){return !!($('response-body').value.trim()||reviewDirty()||[...document.querySelectorAll('dialog[open]:not(#storage-dialog) textarea,dialog[open]:not(#storage-dialog) input')].some(n=>!n.readOnly&&n.value.trim()));}
function requireSavedDrafts(){if(workspaceDrafts()){toast('Save or copy your unsaved text before changing or refreshing storage.');return false;}return true;}
async function storageOperation(fn){
 if(saving)return;saving=true;
 const controls=[...document.querySelectorAll('button,input,select,textarea')].filter(n=>!n.disabled);controls.forEach(n=>n.disabled=true);
 try{await fn();}catch(e){if(storage?.mode==='shared'){blocked=true;warn(e.message+' Keep unsaved text and reconnect before saving.');}$('storage-remote-status').textContent=e.message;toast(e.message);}
 finally{saving=false;controls.forEach(n=>n.disabled=false);storageButtons();$('copy-review').disabled=!current()?.responses.length;}
}
function adoptStorage(){
 state=storage.state;selected=state.tasks.some(t=>t.id===selected)?selected:state.tasks.at(-1)?.id||null;
 blocked=false;$('warning').hidden=true;renderTasks();renderTask();renderLessons();updateStorageLabel();
 $('save-state').textContent='Ready · '+(storage.mode==='shared'?'shared workspace':'this browser');
 if(!storage.remembered)warn('Storage changed for this tab, but the browser could not remember your choice. Keep a backup before closing.');
 $('storage-dialog').close();
}
$('storage-button').onclick=()=>{
 migrationRaw=null;sharedReady=false;$('storage-confirm').checked=false;storageButtons();updateStorageLabel();
 $('storage-remote-status').textContent=storage?.mode==='shared'?'Use Refresh shared to load changes after saving your drafts.':'Check availability to read shared record counts. This does not upload your data.';
 $('storage-dialog').showModal();
};
$('storage-check').onclick=()=>storageOperation(async()=>{
 sharedReady=false;const result=await storage.checkShared();sharedReady=true;
 $('storage-remote-status').textContent=`Shared workspace available: ${result.state.tasks.length} tasks, ${result.state.lessons.length} lessons. No local data has been uploaded.`;
});
$('storage-use').onclick=()=>{if(!requireSavedDrafts())return;storageOperation(async()=>{await storage.useShared();adoptStorage();});};
$('storage-local').onclick=()=>{if(!requireSavedDrafts())return;storageOperation(async()=>{await storage.useLocal();adoptStorage();});};
$('storage-export').onclick=()=>storageOperation(async()=>{
 migrationRaw=null;$('storage-confirm').checked=false;
 const data=await backup(await readCommittedState());await readBackup(data);migrationRaw=JSON.stringify(data,null,2);
 download(migrationRaw,`core-workspace-before-sharing-${new Date().toISOString().slice(0,10)}.json`);
 $('storage-remote-status').textContent=`Backup download started: ${JSON.parse(data.raw).tasks.length} local tasks. Check that the file is saved, then confirm before uploading. Unsaved text is not included.`;
});
$('storage-confirm').onchange=storageButtons;
$('storage-upload').onclick=()=>{if(!requireSavedDrafts())return;storageOperation(async()=>{
 const result=await storage.uploadLocal(migrationRaw,{confirmed:$('storage-confirm').checked});adoptStorage();toast(`${result.added} records added to shared storage. Imported lessons need approval. Local originals are kept.`);
});};
$('refresh-shared').onclick=()=>{if(!requireSavedDrafts())return;storageOperation(async()=>{await storage.refresh();adoptStorage();});};
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();}));

async function exportLastSharedView(){
 if(!storage?.hasSharedSnapshot){warn('No verified shared snapshot is available in this tab. Reconnect before exporting shared work, or use this browser’s originals.');return;}
 download(JSON.stringify(await backup(state),null,2),'core-workspace-last-verified.json');
 warn('Downloaded this tab’s last verified shared view. It may omit newer remote changes. Unsaved text is not included.');
 toast('Last verified shared backup downloaded. Reconnect for the latest shared data.');
}

async function latestSharedStateForBackup(){
 const latest=await createSharedClient().read(),floor=storage.sharedSnapshot;
 if(floor&&(latest.revision<floor.revision||(latest.revision===floor.revision&&latest.checksum!==floor.checksum)))throw Error('Shared backup reply predates or contradicts this tab’s verified view.');
 return latest.state;
}

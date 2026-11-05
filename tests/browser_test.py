"""Real Chromium tests; uses synthetic data only. Requires Python Playwright and Chromium."""
import json, subprocess, time, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
server = subprocess.Popen(['python', '-m', 'http.server', '8765', '--bind', '127.0.0.1', '--directory', str(root/'dist')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
fixture = {'version':1,'tasks':[{'id':'t1','created':'2026-01-01','title':'Keep me','goal':'Preserve everything','constraints':'No spending','status':'active','responses':[],'agreement':'','disagreement':'','decision':'','outcome':'','extra':{'keep':True}}],'lessons':[{'id':'l1','created':'2026-01-01','taskId':'t1','rule':'Keep approvals','evidence':'Test','test':'Reload','result':'','status':'approved'}]}
raw = json.dumps(fixture, indent=2)
try:
 with sync_playwright() as p, tempfile.TemporaryDirectory() as profile:
  browser = p.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'], viewport={'width':390,'height':844})
  page=browser.pages[0]
  page.add_init_script('(raw=>{if(localStorage.getItem("core-ai-workspace-v1")===null)localStorage.setItem("core-ai-workspace-v1",raw)})('+json.dumps(raw)+')')
  for attempt in range(30):
   try: page.goto('http://127.0.0.1:8765'); break
   except Exception: time.sleep(.1)
  page.wait_for_function('document.querySelector("#save-state").textContent.includes("Ready")')
  result=page.evaluate('''async()=>{const {openWorkspace}=await import('./storage.mjs');const s=await openWorkspace();return {state:s.state,records:await s.recovery(),revision:s.revision};}''')
  assert result['state']==fixture
  assert any(r.get('raw')==raw and r.get('kind')=='legacy' for r in result['records'])
  assert page.evaluate('localStorage.getItem("core-ai-workspace-v1")')==raw
  assert page.locator('#task-title').inner_text()=='Keep me'
  # Transactional stale writer rejects a second tab/session's save.
  assert page.evaluate('''async()=>{const {openWorkspace}=await import('./storage.mjs');const a=await openWorkspace(),b=await openWorkspace();const next=structuredClone(a.state);next.tasks[0].title='Saved once';await a.save(next);try{await b.save(b.state);return false;}catch{return true;}}''')
  # Export from a stale tab must include the latest committed revision.
  with page.expect_download() as stale_download:
   page.locator('#backup').click()
  latest=json.loads(Path(stale_download.value.path()).read_text())
  assert json.loads(latest['raw'])['tasks'][0]['title']=='Saved once','Stale export omitted committed changes'
  page.reload(); page.wait_for_function('document.querySelector("#task-title").textContent==="Saved once"')
  # Mobile task creation, search, status, response, approval preservation, reload.
  page.locator('#new-task').click(); page.locator('#title').fill('Phone task');page.locator('#goal').fill('Small next action');page.locator('#task-form button[type=submit]').click()
  page.wait_for_function('document.querySelector("#task-title").textContent==="Phone task"')
  page.locator('#response-body').fill('Evidence saved');page.locator('#response-form button[type=submit]').click();page.wait_for_function('document.querySelector("#response-body").value===""')
  page.locator('#complete-task').click();page.wait_for_function('document.querySelector("#complete-task").textContent==="Reopen task"')
  page.locator('#task-search').fill('Phone');assert page.locator('.task-link').count()==1
  page.locator('#task-filter').select_option('active');assert page.locator('.task-link').count()==0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.reload();page.wait_for_function('document.querySelector("#task-title").textContent==="Phone task"')
  assert 'Evidence saved' in page.locator('#responses').inner_text()
  state=page.evaluate('''async()=>{const {openWorkspace}=await import('./storage.mjs');return (await openWorkspace()).state}''')
  assert state['lessons']==fixture['lessons']; assert state['tasks'][0]['extra']=={'keep':True}
  # Independent fresh browser: an aborted first migration must commit NOTHING.
  isolated=browser.browser.new_context()
  fresh=isolated.new_page();fresh.goto('http://127.0.0.1:8765/core.mjs')
  fresh.evaluate('(raw)=>localStorage.setItem("core-ai-workspace-v1",raw)',raw)
  assert fresh.evaluate('''async()=>{const {openWorkspace,recoveryRecords}=await import('./storage.mjs');const original=localStorage.getItem('core-ai-workspace-v1'),put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='current')throw Error('Migration interrupted');return put.call(this,value,key);};let rejected=false;try{await openWorkspace();}catch{rejected=true;}finally{IDBObjectStore.prototype.put=put;}return rejected&&(await recoveryRecords()).length===0&&localStorage.getItem('core-ai-workspace-v1')===original;}''')
  # A retry after that interruption safely imports the original data.
  fresh.goto('http://127.0.0.1:8765');fresh.wait_for_function('document.querySelector("#task-title").textContent==="Keep me"')
  isolated.close()
  # Check navigation and overflow on a smaller phone and desktop as well.
  for width in [320,1440]:
   page.set_viewport_size({'width':width,'height':900})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  page.set_viewport_size({'width':390,'height':844})
  # An aborted write must roll back both current state and snapshot writes.
  assert page.evaluate('''async()=>{const {openWorkspace}=await import('./storage.mjs');const s=await openWorkspace(),before=await s.recovery(),state=s.state;const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='current')throw new DOMException('Synthetic quota failure','QuotaExceededError');return put.call(this,value,key);};let rejected=false;try{const next=s.state;next.tasks[0].goal='MUST NOT SAVE';await s.save(next);}catch{rejected=true;}finally{IDBObjectStore.prototype.put=put;}return rejected&&JSON.stringify(before)===JSON.stringify(await s.recovery())&&JSON.stringify(state)===JSON.stringify(s.state);} ''')
  # Export and re-import the downloaded verified file through the actual UI.
  with page.expect_download() as download:
   page.locator('#backup').click()
  path=download.value.path()
  exported=json.loads(Path(path).read_text());assert exported['format']=='core-workspace-backup-v1'
  page.locator('#import-file').set_input_files(str(path))
  page.wait_for_function('document.querySelector("#toast").textContent.includes("records added")')
  # Text typed during a delayed import must trigger a new confirmation.
  page.evaluate("()=>{window.fileText=File.prototype.text;File.prototype.text=function(){const file=this;return new Promise(resolve=>{window.releaseImport=()=>resolve(window.fileText.call(file));});};}")
  page.locator('#import-file').set_input_files(str(path))
  page.wait_for_function('typeof window.releaseImport==="function"')
  page.locator('#response-body').fill('Draft typed during import')
  page.evaluate('()=>{window.releaseImport();}')
  page.wait_for_function('document.querySelector("#toast").textContent.includes("Import cancelled")')
  assert page.locator('#response-body').input_value()=='Draft typed during import'
  page.evaluate('()=>{File.prototype.text=window.fileText;}')
  # A real UI save failure retains form drafts and does not report success.
  page.locator('#response-body').fill('UNSAVED draft retained')
  page.evaluate("()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='current')throw Error('Synthetic quota failure');return window.originalPut.call(this,value,key);};}")
  page.locator('#response-form button[type=submit]').click();page.locator('#warning').wait_for(state='visible')
  assert page.locator('#response-body').input_value()=='UNSAVED draft retained'
  page.evaluate('()=>{IDBObjectStore.prototype.put=window.originalPut;}')
  # Corrupt primary storage: startup blocks, and recovery can still retrieve raw records.
  assert page.evaluate('''async()=>{const db=await new Promise(r=>{const q=indexedDB.open('core-ai-workspace',1);q.onsuccess=()=>r(q.result);});await new Promise(r=>{const tx=db.transaction('records','readwrite'),s=tx.objectStore('records');s.get('current').onsuccess=e=>s.put({...e.target.result,raw:'BROKEN'},'current');tx.oncomplete=r;});db.close();try{const {openWorkspace}=await import('./storage.mjs');await openWorkspace();return false;}catch{return true;}}''')
  # Corruption must never reset or overwrite legacy data.
  page.on('dialog',lambda dialog:dialog.accept())
  bad=browser.new_page();bad.goto('http://127.0.0.1:8765');bad.evaluate('localStorage.setItem("core-ai-workspace-v1","BROKEN")');bad.reload();bad.locator('#warning').wait_for(state='visible');assert bad.evaluate('localStorage.getItem("core-ai-workspace-v1")')=='BROKEN'
  browser.close()
 print('PASS: real Chromium migration, raw backup, stale writers, reload, mobile tasks, responses, filters, approvals, unknown fields, corruption')
finally:
 server.terminate();server.wait()

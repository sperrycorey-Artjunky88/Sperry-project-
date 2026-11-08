"""UI-to-Worker-to-SQL tests using synthetic records and identity; never production."""
import json,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fixture={'version':1,'tasks':[{'id':'local-task','created':'2026-01-01','title':'Original local task','goal':'Keep this work','constraints':'No spending','status':'active','responses':[],'agreement':'','disagreement':'','decision':'','outcome':'','extra':'preserved'}],'lessons':[{'id':'lesson','created':'2026-01-01','taskId':'local-task','rule':'Verified lesson','evidence':'Observed','test':'Try','result':'','status':'approved'}]}
with tempfile.TemporaryDirectory() as directory:
 server=subprocess.Popen(['node','tests/helpers/shared-server.mjs',str(Path(directory)/'test.sqlite')],cwd=root,stdout=subprocess.PIPE,text=True)
 try:
  origin=json.loads(server.stdout.readline())['origin']
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
   a=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
   b=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
   for context in [a,b]:context.add_cookies([{'name':'core_test_user','value':'owner','url':origin}])
   page=a.new_page();page.add_init_script('(raw=>{if(localStorage.getItem("core-ai-workspace-v1")===null)localStorage.setItem("core-ai-workspace-v1",raw)})('+json.dumps(json.dumps(fixture))+')')
   api_requests=[];page.on('request',lambda r:api_requests.append(r.url) if '/api/' in r.url else None)
   page.goto(origin);page.wait_for_function('document.querySelector("#task-title").textContent==="Original local task"')
   assert not api_requests,'No cloud request is allowed before opt-in'
   page.locator('#storage-button').click()
   page.locator('#storage-check').click();page.wait_for_function('!document.querySelector("#storage-use").disabled')
   assert page.locator('#storage-upload').is_disabled()
   with page.expect_download() as download:page.locator('#storage-export').click()
   exported=json.loads(Path(download.value.path()).read_text());assert json.loads(exported['raw'])==fixture
   page.locator('#storage-confirm').check();page.locator('#storage-upload').click()
   page.wait_for_function('document.querySelector("#storage-button").textContent.includes("Shared")')
   assert page.evaluate('JSON.parse(localStorage.getItem("core-ai-workspace-v1"))')==fixture
   other=b.new_page();other.goto(origin);other.locator('#storage-button').click();other.locator('#storage-check').click();other.wait_for_function('!document.querySelector("#storage-use").disabled');other.locator('#storage-use').click()
   other.wait_for_function('document.querySelector("#task-title").textContent==="Original local task"')
   other.locator('#new-task').click();other.locator('#title').fill('Created in another browser');other.locator('#goal').fill('Same shared workspace');other.locator('#task-form button[type=submit]').click();other.wait_for_function('document.querySelector("#task-title").textContent==="Created in another browser"')
   page.locator('#refresh-shared').click();page.wait_for_function('document.querySelectorAll(".task-link").length===2')
   page.reload();page.wait_for_function('document.querySelectorAll(".task-link").length===2');assert 'Shared' in page.locator('#storage-button').inner_text()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   # Two tabs now have the same revision; another edit invalidates this one.
   other.locator('#complete-task').click();other.wait_for_function('document.querySelector("#complete-task").textContent==="Reopen task"')
   page.locator('#response-body').fill('Unsaved evidence must survive the conflict');page.locator('#response-form button[type=submit]').click();page.locator('#warning').wait_for(state='visible')
   assert page.locator('#response-body').input_value()=='Unsaved evidence must survive the conflict'
   page.locator('#storage-button').click();page.locator('#storage-local').click();assert 'Shared' in page.locator('#storage-button').inner_text();assert page.locator('#response-body').input_value()
   page.locator('[data-close="storage-dialog"]').click();page.locator('#response-body').fill('');page.locator('#refresh-shared').click();page.wait_for_function('document.querySelector("#warning").hidden')
   # Export from shared mode includes the latest remote state and remains portable.
   with page.expect_download() as shared_download:page.locator('#backup').click()
   downloaded_path=shared_download.value.path();data=json.loads(Path(downloaded_path).read_text());assert len(json.loads(data['raw'])['tasks'])==2
   assert json.loads(data['raw'])['lessons'][0]['status']=='proposed'
   page.once('dialog',lambda d:d.accept());page.locator('#import-file').set_input_files(str(downloaded_path));page.wait_for_function('document.querySelector("#toast").textContent.includes("records added")')
   import sqlite3
   with sqlite3.connect('file:'+str(Path(directory)/'test.sqlite')+'?mode=ro',uri=True) as db:
    assert db.execute('SELECT COUNT(*) FROM workspace_imports').fetchone()[0]==2
    assert db.execute('SELECT raw_backup FROM workspace_imports ORDER BY revision DESC LIMIT 1').fetchone()[0]==Path(downloaded_path).read_text()
   # A fresh export client must not accept an older reply than the active session.
   import hashlib
   empty={'version':1,'tasks':[],'lessons':[]};older={'revision':0,'state':empty,'checksum':hashlib.sha256(json.dumps(empty,separators=(',',':')).encode()).hexdigest()}
   page.route(origin+'/api/workspace',lambda route:route.fulfill(status=200,content_type='application/json',headers={'ETag':'"0"'},body=json.dumps(older)))
   with page.expect_download() as rollback_download:page.locator('#backup').click()
   assert rollback_download.value.suggested_filename=='core-workspace-last-verified.json'
   assert len(json.loads(json.loads(Path(rollback_download.value.path()).read_text())['raw'])['tasks'])==2
   page.unroute(origin+'/api/workspace')
   # Failed writes retain dialog text; no automatic retry or silent local save.
   a.request.get(origin+'/__test/fail-next');page.locator('#new-task').click();page.locator('#title').fill('Uncommitted task');page.locator('#goal').fill('Keep the draft');page.locator('#task-form button[type=submit]').click();page.locator('#warning').wait_for(state='visible');assert page.locator('#title').input_value()=='Uncommitted task';assert page.locator('#task-dialog').is_visible()
   page.locator('[data-close="task-dialog"]').click();page.locator('#refresh-shared').click();page.wait_for_function('document.querySelector("#warning").hidden')
   assert page.locator('.task-link').count()==2
   # Local mode still has the original single record, with its extension fields.
   page.locator('#storage-button').click();page.locator('#storage-local').click();page.wait_for_function('document.querySelector("#storage-button").textContent.includes("This browser")');assert page.locator('.task-link').count()==1
   assert page.evaluate('''async()=>{const {readCommittedState}=await import('./storage.mjs');return (await readCommittedState()).tasks[0].extra}''')=='preserved'
   assert page.evaluate('''async()=>{const {readCommittedState}=await import('./storage.mjs');return (await readCommittedState()).lessons[0].status}''')=='approved'
   # Offline startup never falls back to local or exports a misleading empty snapshot.
   b.request.get(origin+'/__test/offline',headers={'x-test-value':'true'})
   with other.expect_download(timeout=3000) as offline_download:other.locator('#backup').click()
   fallback=offline_download.value;assert fallback.suggested_filename=='core-workspace-last-verified.json'
   assert len(json.loads(json.loads(Path(fallback.path()).read_text())['raw'])['tasks'])==2
   other.reload();other.locator('#warning').wait_for(state='visible');assert 'Shared' in other.locator('#storage-button').inner_text()
   other.locator('#backup').click();other.wait_for_function('document.querySelector("#warning").textContent.includes("No verified shared snapshot")')
   b.request.get(origin+'/__test/offline',headers={'x-test-value':'false'});other.locator('#refresh-shared').click();other.wait_for_function('document.querySelectorAll(".task-link").length===2')
   # Restart the backend process and reopen the same persistent SQL file.
   port=origin.rsplit(':',1)[1];server.terminate();server.wait(timeout=10)
   server=subprocess.Popen(['node','tests/helpers/shared-server.mjs',str(Path(directory)/'test.sqlite'),port],cwd=root,stdout=subprocess.PIPE,text=True)
   assert json.loads(server.stdout.readline())['origin']==origin
   other.reload();other.wait_for_function('document.querySelectorAll(".task-link").length===2')
   # Missing identity and forged incoming headers get no shared data.
   c=browser.new_context();anonymous=c.new_page();anonymous.goto(origin);anonymous.locator('#storage-button').click();anonymous.locator('#storage-check').click();anonymous.wait_for_function('document.querySelector("#storage-remote-status").textContent.includes("Sign in")');assert anonymous.locator('#storage-use').is_disabled()
   assert c.request.get(origin+'/api/workspace',headers={'oai-authenticated-user-id':'synthetic-owner'}).status==401
   browser.close()
  print('PASS: UI opt-in, verified migration, two isolated browsers, reload, shared export, conflict/draft retention, failed write, local originals, mobile, auth')
 finally:
  server.terminate();server.wait(timeout=10)

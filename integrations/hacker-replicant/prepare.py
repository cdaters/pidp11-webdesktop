"""Mac/developer shell: patch a disposable checkout of the exact reviewed revision.
Does not install/run anything or edit the original clone. Copy only original
integration modules; retain upstream source and LICENSE with the checkout.
"""
import pathlib,subprocess,sys,shutil
root=pathlib.Path(sys.argv[1]).resolve()
revision=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD']).decode().strip()
if revision!='6f8a2aca7786736e01bdf5ba9b44bf66a7f19349':raise SystemExit('Unreviewed upstream revision')
if subprocess.check_output(['git','-C',str(root),'status','--porcelain']).strip():raise SystemExit('Disposable checkout must be clean')
source=pathlib.Path(__file__).resolve().parent
shutil.copyfile(source/'read-only.mjs',root/'read-only.mjs')
shutil.copyfile(source/'read-only-ui.js',root/'public/read-only-ui.js')
p=root/'server.js';text=p.read_text()
text="import { installReadOnly } from './read-only.mjs';\nimport { createServer as createTLS } from 'node:https';\n"+text
text=text.replace('app.use(express.json());','app.use(express.json({ limit: "24kb" }));\ninstallReadOnly(app);')
old="app.listen(PORT, () => console.log(`PiDP-11 Hacker Replicant chat-backend on :${PORT}`));"
assert old in text
text=text.replace(old,"if (process.env.PIDP11_READONLY === '1') {\n  createTLS({cert:readFileSync(process.env.COMPANION_CERT), key:readFileSync(process.env.COMPANION_KEY)},app).listen(PORT,'127.0.0.1');\n} else {\n  "+old+"\n}")
text=text.replace('    CONSOLE_URL\n', "    process.env.PIDP11_READONLY === '1' ? 'about:blank' : CONSOLE_URL\n")
p.write_text(text)
p=root/'public/index.html';text=p.read_text()
text=text.replace("  let messages = [];","  let messages = [];\n  let activeRequest;\n  let historyGeneration=0;\n  window.addEventListener('pidp11-revoke',()=>{historyGeneration++;activeRequest?.abort();messages=[];});\n  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel question';\n  cancel.onclick=()=>activeRequest?.abort();form.append(cancel);")
text=text.replace("    const text = input.value.trim();","    if(activeRequest)return;\n    activeRequest=new AbortController();\n    const requestGeneration=historyGeneration;\n    const shareSelection=document.getElementById('include-selection');\n    const includeSelection=shareSelection?.checked===true;\n    const selectionId=shareSelection?.dataset.selectionId;\n    if(shareSelection)shareSelection.checked=false;\n    const text = input.value.trim();")
text=text.replace("    if (!text) return;","    if (!text) {activeRequest=undefined;return;}")
text=text.replace("        method: 'POST',","        method: 'POST',\n        signal: activeRequest.signal,")
text=text.replace('body: JSON.stringify({ messages,','body: JSON.stringify({ includeSelection, selectionId, messages,')
text=text.replace('      clearInterval(ticker);','      clearInterval(ticker);\n      activeRequest=undefined;')
text=text.replace('The control toggle is off -- I', 'Machine control is unavailable in this read-only mode. I').replace("won't touch the machine unless you turn it on.", "cannot operate the machine. Answers are experimental.")
text=text.replace("            messages.push({ role: 'assistant', content: responseText });", "            if(requestGeneration===historyGeneration)messages.push({ role: 'assistant', content: responseText });")
text=text.replace('</body>','<script src="/read-only-ui.js"></script>\n</body>')
p.write_text(text)
print('Prepared explicitly modified upstream read-only mode; original clone unchanged.')

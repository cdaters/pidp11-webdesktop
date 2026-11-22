// Genuine supervised V7; narrow faults target only this lab's owned companion.
import {chromium, expect} from '@playwright/test';
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {harness, root} from '../m59/harness.mjs';

if (!root.endsWith('/m514/v7')) throw Error('Explicit M5.14 V7 laboratory required');
const docker = code => execFileSync('docker', ['exec', 'pidp11-m551', 'python3', '-c', code], {encoding: 'utf8'});
const base = 'https://127.0.0.1:8445';
const browser = await chromium.launch();
const result = {guest: 'UNIX V7', environment: 'Mac-hosted ARM64 Linux', osIdentity: 'operator-attested'};
try {
  const before = await harness('status');
  expect(before.lines.find(line => line.id === 'v7-dc0').state).toBe('attached');
  expect(before.lines.find(line => line.id === 'v7-dc0').supervision).toBeTruthy();
  const context = await browser.newContext({ignoreHTTPSErrors: true});
  expect((await context.request.post(base + '/api/v1/login', {headers: {Origin: base}, data: {token: readFileSync(root + '/writer.token', 'utf8').trim()}})).status()).toBe(200);
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('button', {name: 'Open Guest terminal', exact: true}).click();
  await page.getByLabel('Guest endpoint').selectOption('v7-dc0');
  await page.locator('[data-connect]').click();
  await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  await page.locator('[data-acquire]').click();
  await expect(page.locator('[data-release]')).toBeEnabled();
  const screen = page.locator('.guest-xterm .xterm-rows');
  async function command(text) {
    await page.locator('.guest-xterm textarea').focus();
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');
  }
  await command('');
  await expect.poll(() => screen.innerText()).toMatch(/login:|\$\s*$/);
  if ((await screen.innerText()).includes('login:')) await command('dmr');
  await command('echo M514_SUPERVISED_LINE');
  await expect.poll(async () => ((await screen.innerText()).match(/M514_SUPERVISED_LINE/g) || []).length).toBeGreaterThanOrEqual(2);
  result.genuineCommand = true;
  docker('import os,pathlib,signal; p=int(pathlib.Path("/work/supervisor.pid").read_text()); assert b"/lab/m512/supervisor.py" in pathlib.Path(f"/proc/{p}/cmdline").read_bytes(); os.kill(p,signal.SIGSTOP)');
  await expect.poll(async () => (await harness('status')).lines.find(line => line.id === 'v7-dc0').state).toBe('unavailable');
  await expect(page.locator('[data-acquire]')).toBeDisabled();
  docker('import os,pathlib,signal; os.kill(int(pathlib.Path("/work/supervisor.pid").read_text()),signal.SIGCONT)');
  await new Promise(resolve => setTimeout(resolve, 500));
  expect((await harness('status')).lines.find(line => line.id === 'v7-dc0').state).toBe('unavailable');
  result.delayedRenewalCannotRevive = true;
  expect(await harness('console', 'echo M514_AFTER_OBSERVER_LOSS\r')).toContain('M514_AFTER_OBSERVER_LOSS');
  expect(await harness('traditional', 'echo M514_SERIAL_AFTER_LOSS\r')).toContain('M514_SERIAL_AFTER_LOSS');
  result.independentConsoleAndSerial = true;

  docker('import pathlib,os,signal; matches=[p for p in pathlib.Path("/proc").iterdir() if p.name.isdigit() and (p/"cmdline").exists() and (p/"cmdline").read_bytes().startswith(b"/fixtures/webdesktop-service\\x00serve\\x00")]; assert len(matches)==1; p=matches[0]; pathlib.Path("/work/killed-bridge.pid").write_text(p.name); os.kill(int(p.name),signal.SIGKILL)');
  await harness('bridge-stop'); // Reap the exact killed child; no guest action.
  expect(await harness('console', 'echo M514_WITHOUT_COMPANION\r')).toContain('M514_WITHOUT_COMPANION');
  const refused = docker('import subprocess,json; r=subprocess.run(["/fixtures/webdesktop-service","serve","-config","/tmp/m551-config/config.json"],capture_output=True,timeout=5); print(json.dumps({"exit":r.returncode,"staleDiagnostic":b"existing entries are preserved" in r.stderr}))');
  expect(JSON.parse(refused)).toEqual({exit: 1, staleDiagnostic: true});
  docker('import pathlib,os,stat; old=pathlib.Path("/proc")/pathlib.Path("/work/killed-bridge.pid").read_text(); assert not old.exists(); p=pathlib.Path("/tmp/m551-control/control.sock"); s=p.lstat(); assert stat.S_ISSOCK(s.st_mode) and s.st_uid==os.geteuid() and stat.S_IMODE(s.st_mode)==0o600; p.unlink()');
  const fresh = await harness('bridge-start');
  expect(fresh.instance).not.toBe(before.instance);
  expect(fresh.lines.every(line => line.state === 'detached')).toBe(true);
  expect([401, 403]).toContain((await context.request.get(base + '/api/v1/terminals')).status());
  result.forcedTerminationAndExplicitStaleSocketRecovery = true;
  result.freshDetachedInstanceOldSessionRefused = true;
  result.pass = true;
} finally {
  writeFileSync(root + '/m514-supervision.json', JSON.stringify(result, null, 2) + '\n');
  await browser.close();
}

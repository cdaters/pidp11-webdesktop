// One reviewed campaign at a time for a fresh M5.19 V7 copy. Never reclaim a lock.
import { spawn } from 'node:child_process';
import { resolve, relative } from 'node:path';
import { acquireCampaign } from '../m515/campaign.mjs';
const root = process.env.PIDP551_WORK;
if (!root?.endsWith('/m519/v7')) throw Error('Explicit fresh M5.19 V7 directory required');
const script = resolve(process.argv[2] ?? '');
const local = relative(resolve('lab'), script);
if (!local.endsWith('.mjs') || local.startsWith('..')) throw Error('Reviewed local lab module required');
const release = acquireCampaign(root);
const child = spawn(process.execPath, [script], { stdio: 'inherit', env: process.env });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', () => { release(); process.exitCode = 1; });
child.on('exit', (code, signal) => { release(); process.exitCode = signal ? 1 : code; });

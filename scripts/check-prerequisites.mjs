// No network, installation, guest connection or filesystem mutation.
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function prerequisiteErrors(version, installed = () => true) {
  const match = /^v?(\d+)\.(\d+)\./.exec(version);
  const errors = [];
  if (!match || Number(match[1]) < 22 || (Number(match[1]) === 22 && Number(match[2]) < 18)) {
    errors.push('Node.js 22.18 or newer is required. Check node --version and select a supported Node installation.');
  }
  for (const name of ['vite', 'typescript', '@xterm/xterm', '@xterm/addon-fit']) {
    if (!installed(name)) errors.push(`Missing locked dependency ${name}. Run npm ci from this source directory, then retry.`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dependencies = process.argv.includes('--dependencies');
  const errors = prerequisiteErrors(process.version, name => !dependencies || existsSync(new URL(`../node_modules/${name}/package.json`, import.meta.url)));
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Browser demo prerequisites ready. No Pi, Go, Docker or model is required.');
  }
}

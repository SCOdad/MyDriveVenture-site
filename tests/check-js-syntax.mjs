import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const roots = ['assets/js', 'tests'];
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(full);
  }
}
for (const root of roots) await walk(root);

let failed = false;
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax failure: ${file}`);
    console.error(result.stderr || result.stdout);
  }
}
if (failed) process.exit(1);
console.log(`JavaScript syntax OK: ${files.length} files`);

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('BKLG-0130 secure nudge handoff may return to family, log, or profile only',()=>{
  const source=fs.readFileSync(new URL('../assets/js/auth-welcome-handoff.js',import.meta.url),'utf8');
  assert.match(source,/\['\/family\/','\/log\/','\/profile\/'\]/);
  assert.doesNotMatch(source,/\/text-parker\/.*includes\(u\.pathname\)/,'Public Text Parker opt-in page must not become an authenticated return target');
});

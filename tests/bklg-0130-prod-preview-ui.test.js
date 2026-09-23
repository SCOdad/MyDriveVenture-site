const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'staging/nudge-live/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'staging/nudge-live/live.js'),'utf8');

assert.match(html,/PROD DATA — READ ONLY/);
assert.match(html,/live\.css/);
assert.match(js,/cayoyqwrmouxuttloemc/,'live preview must point explicitly to PROD');
assert.match(js,/lifecycle-nudge-preview/);
assert.match(js,/action:'preview'/);
assert.doesNotMatch(js,/update_rule|save_template|send_live|send_test/,'live preview UI must expose no write\/send actions');
assert.match(js,/payload\.read_only/,'live preview must fail closed unless endpoint declares read-only');
assert.match(js,/payload\.environment!=='PROD'/,'live preview must fail closed unless endpoint declares PROD');

console.log('BKLG-0130 PROD read-only preview UI safety contract passed');

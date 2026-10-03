const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('indexV2.html','utf8');
test('BKLG-0220 preserves the production homepage and isolated source boundary',()=>{
 // Check route isolation without pinning unrelated future homepage edits.
 assert.doesNotMatch(fs.readFileSync('index.html','utf8'), /indexv2\.(?:css|js)|indexV2\.html/);
 assert.doesNotMatch(html,/canonical-header\.js|href=["'][^"']*waitlist/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/Nationwide logging is not yet available/);
});

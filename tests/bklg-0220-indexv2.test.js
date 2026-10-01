const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const html = fs.readFileSync('indexV2.html','utf8');
test('BKLG-0220 preserves the production homepage and isolated source boundary',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('index.html')).digest('hex'),'66e518214f2015c51a734ea3896e73cc5c0f40b299f485d7d05a0f4f8fc34ecc');
 assert.doesNotMatch(html,/canonical-header\.js|href=["'][^"']*waitlist/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/Nationwide logging is not yet available/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const read = path => fs.readFileSync(path,'utf8');
test('BKLG-0220 publishes an indexable homepage with production identity and current availability',()=>{
 const html = read('index.html');
 assert.doesNotMatch(html,/noindex|DEV preview|Planned availability|not yet available|SCOCRAFT LLC|href=["'][^"']*waitlist/);
 assert.match(html,/<link rel="canonical" href="https:\/\/mydriveventure.com\/">/);
 assert.match(html,/Michigan and Kansas/);
 assert.match(html,/Michigan sole proprietor/);
 assert.match(html,/\/assets\/js\/ga4\.js/);
 assert.match(html,/\/assets\/js\/meta-pixel\.js/);
 assert.equal(read('indexV2.html').replace('  <meta name="robots" content="noindex,nofollow">\n',''),html);
});
test('BKLG-0220 retains the exact pre-cutover homepage as a non-indexable archive',()=>{
 const original = fs.readFileSync('archive/homepage-2026-10-03/index.html');
 assert.equal(crypto.createHash('sha256').update(original).digest('hex'),'14e86946bd92d3a21b490eb19116fc2af7f702715a4244a485cdaa21cd08ef6e');
 assert.match(read('_headers'),/\/archive\/\*\n  X-Robots-Tag: noindex, nofollow/);
});

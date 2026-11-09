import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const profile=readFileSync(new URL('../assets/js/profile.js',import.meta.url),'utf8');
const family=readFileSync(new URL('../assets/js/family-card-profile.js',import.meta.url),'utf8');
test('Profile confirms only server-authorized requirement actions',()=>{
 assert.ok(profile.includes("r.authority?.allowed===true"));
 assert.ok(!profile.includes("GROWNUP_ONLY_REQUIREMENTS"));
 assert.ok(!profile.includes("/needs confirmation/i.test(r.reason||'')"));
 assert.ok(profile.includes('An authorized person must confirm this requirement.'));
});
test('Family Hub follows the same per-requirement server capability',()=>{
 assert.ok(family.includes("r.authority?.allowed===true"));
 assert.ok(!family.includes("/needs confirmation/i.test(r.reason||'')"));
 assert.ok(family.includes("data-confirm-requirement"));
});
test('both surfaces fail closed when authority projection is missing',()=>{
 for(const src of [profile,family]) assert.ok(src.includes("r.authority?.allowed===true"));
});

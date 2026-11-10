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

test('Family Hub does not eagerly fan out optional detail requests for every driver',()=>{
 assert.ok(family.includes("new IntersectionObserver"));
 assert.ok(family.includes("activeDetailRequests<2"));
 assert.ok(family.includes("void enrichDriver(card,false)"));
 assert.ok(family.includes("prioritizeDetail(card)"));
 assert.ok(family.includes("void enrichDriver(card,true)"));
 assert.ok(family.includes("r.authority?.allowed===true"));
});

test('Operator Driver Console inspects licensing without exposing confirmations or stage mutations',()=>{
 const operator=readFileSync(new URL('../assets/js/log-operator-support.js',import.meta.url),'utf8');
 assert.ok(operator.includes("action:'license_inspect'"));
 assert.ok(operator.includes("inspection_only!==true"));
 assert.ok(operator.includes('Inspect licensing (read only)'));
 assert.ok(operator.includes('Operator cannot confirm third-party requirements or advance stages.'));
 assert.ok(!operator.includes("action:'record_license_requirement'"));
 assert.ok(!operator.includes("action:'advance_license_stage'"));
});

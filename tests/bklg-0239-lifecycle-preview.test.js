import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page=readFileSync('operator/lifecycle/index.html','utf8');
const client=readFileSync('operator/lifecycle/operator.js','utf8');

test('BKLG-0239 exposes authenticated impact preview and human-readable counts',()=>{
 for(const id of ['lifecycle-form','lifecycle-kind','lifecycle-id','lifecycle-result',
   'lifecycle-summary','driver-transition-panel','family-transition-panel','purge-panel'])
  assert.ok(page.includes('id="'+id+'"'),'missing '+id);
 assert.match(client,/auth.getSession\(\)/);
 assert.match(client,/auth.refreshSession\(\)/);
 assert.match(client,/function showSummary/);
 assert.match(client,/createElement\('li'\)/);
 assert.match(client,/textContent = name/);
});

test('BKLG-0239 driver transitions require exact name, status and reason',()=>{
 assert.match(client,/expected_status:\s*driver.status/);
 assert.match(client,/confirmation !== driver.display_name/);
 assert.match(client,/reason.length < 8/);
 assert.match(client,/transition_driver/);
 assert.match(client,/transitionPanel.hidden = true/);
});

test('BKLG-0239 family transition and purge remain capability-gated',()=>{
 assert.match(client,/capabilities.transition/);
 assert.match(client,/capabilities.purge/);
 assert.match(client,/family-transition-panel'\).hidden = true/);
 assert.match(client,/purge-panel'\).hidden = true/);
 assert.match(client,/action:'purge_'\+selectedKind/);
 assert.match(client,/id!==selectedId/);
 assert.match(client,/confirmation!==expectedName/);
 assert.match(client,/reason.length<12/);
 assert.match(client,/expectedStatus!=='INACTIVE'/);
 assert.match(page,/I understand this purge cannot be undone/);
});

test('BKLG-0239 lifecycle surface is hidden until live operator auth',()=>{
 assert.match(page,/id="lifecycle-app" hidden/);
 assert.match(page,/id="lifecycle-auth-gate"/);
 assert.match(page,/id="lifecycle-signin-link"/);
 assert.doesNotMatch(page,/BKLG-0239 · Operator only/);
 assert.match(page,/#lifecycle-id\{width:min\(100%,44ch\)/);
 assert.match(client,/action:'authorize'/);
 assert.match(client,/operatorAuthorized = true/);
 assert.match(client,/operatorAuthorized = false/);
 assert.match(client,/family\.family_status/);
 assert.match(client,/family\.membership_status/);
});

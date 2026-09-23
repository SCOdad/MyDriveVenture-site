const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const recovery=require('../assets/js/drive-save-recovery.js');

const rpc=fs.readFileSync('assets/js/log-drive-rpc.js','utf8');
const profile=fs.readFileSync('assets/js/profile.js','utf8');

test('BKLG-0195 treats pre-permit acknowledgement as a known non-ambiguous business condition',()=>{
  assert.equal(recovery.isAmbiguous({code:'PRE_PERMIT_ACK_REQUIRED'}),false);
  assert.match(rpc,/const PRE_PERMIT_CODE='PRE_PERMIT_ACK_REQUIRED'/);
  assert.match(rpc,/info\.code===PRE_PERMIT_CODE/);
});

test('BKLG-0195 presents all three approved pre-permit choices before resubmission',()=>{
  assert.match(rpc,/Edit drive date\/time/);
  assert.match(rpc,/Update permit date/);
  assert.match(rpc,/Keep as non-certifying/);
  assert.match(rpc,/Nothing has been saved yet/);
  assert.match(rpc,/acknowledge_pre_permit:true/);
  assert.match(rpc,/prePermitKey\(operation,driverId,driveId,requested\)/);
});

test('BKLG-0195 preserves overlap and save-recovery behavior around the new decision',()=>{
  assert.match(rpc,/confirmOverlapWarning/);
  assert.match(rpc,/pendingForCurrentDriver/);
  assert.match(rpc,/recoverPendingMutation/);
  assert.match(rpc,/showPrePermitDecision\(info,\{operation:'CREATE'/);
  assert.match(rpc,/showPrePermitDecision\(info,\{operation:'EDIT'/);
});

test('BKLG-0195 licensing correction link selects the intended driver profile',()=>{
  assert.match(rpc,/\/profile\/\?driver=\$\{encodeURIComponent\(driverId\)\}#license-card/);
  assert.match(profile,/new URLSearchParams\(location\.search\)\.get\('driver'\)/);
  assert.match(profile,/String\(s\.driver_id\|\|''\)===String\(requestedDriverId\)/);
});

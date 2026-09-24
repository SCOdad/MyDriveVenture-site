const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const recovery=require('../assets/js/drive-save-recovery.js');

const rpc=fs.readFileSync('assets/js/log-drive-rpc.js','utf8');
const css=fs.readFileSync('assets/css/log.css','utf8');

test('BKLG-0195 treats pre-permit acknowledgement as a known non-ambiguous business condition',()=>{
  assert.equal(recovery.isAmbiguous({code:'PRE_PERMIT_ACK_REQUIRED'}),false);
  assert.match(rpc,/const PRE_PERMIT_CODE='PRE_PERMIT_ACK_REQUIRED'/);
  assert.match(rpc,/info\.code===PRE_PERMIT_CODE/);
});

test('BKLG-0195 pre-permit warning is a simple go-back or proceed decision',()=>{
  assert.match(rpc,/Before permit date/);
  assert.match(rpc,/This drive can be saved, but it will not count/);
  assert.match(rpc,/Go back/);
  assert.match(rpc,/Proceed anyway/);
  assert.doesNotMatch(rpc,/Edit drive date\/time/);
  assert.doesNotMatch(rpc,/Update permit date/);
  assert.doesNotMatch(rpc,/Keep as non-certifying/);
  assert.match(rpc,/acknowledge_pre_permit:true/);
  assert.match(rpc,/prePermitKey\(operation,driverId,driveId,requested\)/);
});

test('BKLG-0195 uses overlap-style warning treatment with red pre-permit eyebrow',()=>{
  assert.match(rpc,/drive-prepermit-warning/);
  assert.match(rpc,/drive-prepermit-eyebrow/);
  assert.match(css,/\.drive-prepermit-warning/);
  assert.match(css,/\.drive-prepermit-eyebrow/);
  assert.match(css,/#d94343/);
});

test('BKLG-0195 preserves overlap and save-recovery behavior around the pre-permit decision',()=>{
  assert.match(rpc,/confirmOverlapWarning/);
  assert.match(rpc,/pendingForCurrentDriver/);
  assert.match(rpc,/recoverPendingMutation/);
  assert.match(rpc,/showPrePermitDecision\(info,\{operation:'CREATE'/);
  assert.match(rpc,/showPrePermitDecision\(info,\{operation:'EDIT'/);
});

test('BKLG-0195 trip archive flags pre-permit drives and reveals the saved row',()=>{
  const archive=fs.readFileSync('assets/js/log-prepilot-v2.js','utf8');
  assert.match(archive,/drive-item-prepermit/);
  assert.match(archive,/Before permit date · Does not count/);
  assert.match(archive,/dv:reveal-drive/);
  assert.match(archive,/showAllDrives=true/);
  assert.match(archive,/scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/);
  assert.match(rpc,/new CustomEvent\('dv:reveal-drive'/);
});

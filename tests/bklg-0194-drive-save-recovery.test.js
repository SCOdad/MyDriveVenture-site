const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const recovery=require('../assets/js/drive-save-recovery.js');

function fakeStorage(){
  const map=new Map();
  return {
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    removeItem:key=>map.delete(key)
  };
}

test('BKLG-0194 freezes the original CREATE payload with its source_event_id',()=>{
  const requested={drive_date:'2026-09-19',start_time:'12:00',end_time:'12:20',lesson_ids:['a'],notes:'first'};
  const body={action:'mutate_drive',operation:'CREATE',driver_id:'driver-1',source_event_id:'event-1',...requested};
  const pending=recovery.makePending({operation:'CREATE',driverId:'driver-1',sourceEventId:'event-1',requested,body});
  requested.notes='changed after submit';
  body.notes='changed after submit';
  assert.equal(pending.source_event_id,'event-1');
  assert.equal(pending.requested.notes,'first');
  assert.equal(pending.body.notes,'first');
});

test('BKLG-0194 persists only valid pending mutations in session-scoped storage',()=>{
  const storage=fakeStorage();
  const pending=recovery.makePending({
    operation:'EDIT',driverId:'driver-1',driveId:'drive-1',expectedRevision:4,
    requested:{notes:'updated'},body:{action:'mutate_drive',operation:'EDIT',driver_id:'driver-1',drive_id:'drive-1',expected_revision:4,notes:'updated'}
  });
  recovery.save(pending,storage);
  assert.deepEqual(recovery.load(storage),pending);
  recovery.clear(storage);
  assert.equal(recovery.load(storage),null);
});

test('BKLG-0194 EDIT recovery adopts saved values, retries unchanged revision, and stops on competing revision',()=>{
  assert.equal(recovery.editRecoveryAction({expectedRevision:4,currentRevision:5,payloadMatches:true}),'ADOPT');
  assert.equal(recovery.editRecoveryAction({expectedRevision:4,currentRevision:4,payloadMatches:false}),'RETRY');
  assert.equal(recovery.editRecoveryAction({expectedRevision:4,currentRevision:5,payloadMatches:false}),'CONFLICT');
});

test('BKLG-0194 classifies timeout/network uncertainty separately from server validation',()=>{
  assert.equal(recovery.isAmbiguous({code:'DV_SAVE_TIMEOUT'}),true);
  assert.equal(recovery.isAmbiguous({code:'NETWORK_UNCERTAIN'}),true);
  assert.equal(recovery.isAmbiguous({code:''}),true);
  assert.equal(recovery.isAmbiguous({code:'VALIDATION_ERROR'}),false);
  assert.equal(recovery.isAmbiguous({code:'CONFLICT'}),false);
});

test('BKLG-0194 shared drive RPC uses one bounded recovery lifecycle for CREATE and EDIT',()=>{
  const source=fs.readFileSync('assets/js/log-drive-rpc.js','utf8');
  assert.match(source,/DV_DRIVE_SAVE_RECOVERY/);
  assert.match(source,/recovery\.timeoutMs\(\)/);
  assert.match(source,/operation:'CREATE'/);
  assert.match(source,/operation:'EDIT'/);
  assert.match(source,/makePending\(\{operation:'CREATE'/);
  assert.match(source,/makePending\(\{operation:'EDIT'/);
  assert.match(source,/Check unfinished save/);
  assert.match(source,/button\.className='button secondary button-small app-hidden'/);
  assert.match(source,/classList\.toggle\('app-hidden',!active\)/);
  assert.match(source,/function savePending\(pending\)\{recovery\.save\(pending\)\}/);
  assert.doesNotMatch(source,/function savePending\(pending\)\{recovery\.save\(pending\);setRecoveryPending\(true\)\}/);
  assert.match(source,/editRecoveryAction/);
  assert.match(source,/same\(pending\.requested,initial\.drive\)/);
  assert.match(source,/setSubmitting\(true\)/);
  assert.match(source,/querySelectorAll\('input,select,textarea,button'\)/);
  assert.match(source,/dv:driver-changing',[\s\S]*setSubmitting\(false\);resetEditForDriverChange\(\)/);
  assert.match(source,/Finish checking the unfinished save before editing another drive\./);
  assert.match(source,/function enterEdit\(d,\{scroll=true,preservePriorDraft=true,allowPending=false\}=\{\}\)\{if\(!allowPending&&pendingForCurrentDriver\(\)\)/);
  assert.match(source,/function resetAfterEdit\(\)\{resetNewDriveForm\(\)\}/);
  assert.match(source,/Drive updated and verified:[\s\S]*Ready to log another drive\./);
  assert.match(source,/async function authoritativeDriveAfterSave/);
  assert.match(source,/Drive saved\. Still verifying the saved drive…/);
  assert.match(source,/authoritativeDriveAfterSave\(driverId,id\)/);
  assert.match(source,/Drive edit recovered and verified:[\s\S]*Ready to log another drive\./);
  assert.doesNotMatch(source,/Please try again\.['"]\),35000/);
});

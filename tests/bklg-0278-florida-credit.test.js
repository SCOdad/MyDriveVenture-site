const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const source=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8')
const detail=fs.readFileSync('assets/js/log-drive-detail-v4.js','utf8')
const css=fs.readFileSync('assets/css/log.css','utf8')
const begin=source.indexOf('  function floridaCreditMarkup(d){')
const end=source.indexOf('  function floridaWorkCommuteMarkup(d){',begin)
assert.ok(begin>=0&&end>begin)
const markup=new Function(source.slice(begin,end)+'; return floridaCreditMarkup')()
test('partially restricted Florida drive shows red eyebrow and preserved history',()=>{
 const html=markup({florida_credit:{license_stage:'LEARNER',prohibited_minutes:15,pending_minutes:0}})
 assert.match(html,/FLORIDA RESTRICTION · 15 MIN DO NOT COUNT/)
 assert.match(html,/15 min excluded from qualifying credit/)
 assert.match(html,/Original drive retained/)
 assert.match(css,/\.drive-item-fl-restricted/)
 assert.match(css,/#d94343/)
 assert.doesNotMatch(html,/illegal|violation/i)
})
test('unverified classification is pending, not falsely restricted',()=>{
 assert.match(markup({fl_credit_missing:true,florida_credit:null}),/evaluation is pending/)
 assert.match(markup({florida_credit:{license_stage:'LEARNER',prohibited_minutes:0,pending_minutes:30}}),/review pending for 30 min/)
 assert.equal(markup({florida_credit:null}),'')
 assert.equal(markup({florida_credit:{license_stage:'STATE_NEUTRAL',prohibited_minutes:30}}),'')
})
test('all four supervisor checkbox controls and submission endpoint are removed',()=>{
 assert.doesNotMatch(source,/floridaSupervisorAttestationMarkup|fl-supervision-form|age_at_least_21|nearest_right_seat|attest_fl_supervision/)
 assert.doesNotMatch(source,/valid_driver_license|declarant_supervised_drive/)
 assert.match(source,/floridaCreditMarkup\(d\)/)
 assert.match(source,/floridaWorkCommuteMarkup\(d\)/)
})
test('work commute exception remains a distinct adult declaration',()=>{
 const a=source.indexOf('  function floridaWorkCommuteMarkup(d){')
 const b=source.indexOf('  function vehicleMarkup(v){',a)
 const form=new Function('esc',source.slice(a,b)+';return floridaWorkCommuteMarkup')(v=>String(v))
 assert.equal(form({fl_can_confirm_work:false,florida_credit:{pending_minutes:15}}),'')
 assert.match(form({id:'a',drive_revision:2,fl_can_confirm_work:true,florida_credit:{pending_minutes:15}}),/direct_to_from_work/)
 assert.match(source,/action:'attest_fl_work_commute'/)
})
test('trip detail displays qualifying night and restricted time separately',()=>{
 assert.match(detail,/FLORIDA RESTRICTION/)
 assert.match(detail,/Qualifying credit:/)
 assert.match(detail,/Florida qualifying night/)
 assert.match(detail,/Recorded night/)
 assert.match(detail,/drive-fl-detail-restriction/)
 assert.match(source,/floridaCreditCache\.clear\(\)/)
 assert.match(source,/modelEpoch/)
})

test('Florida credit from authenticated endpoint binds to dashboard v1 rows lacking revision',()=>{
 const src=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
 const a=src.indexOf('  function mergeFloridaCreditRows('), b=src.indexOf('  async function ensureFloridaCredits(',a);
 assert.ok(a>0&&b>a);
 const merge=new Function(src.slice(a,b)+';return mergeFloridaCreditRows')();
 const sourceRows=[{id:'drive1',driver_id:'FL',duration_minutes:31},{id:'drive2',driver_id:'MI'}];
 const serverRows=[{drive_id:'drive1',drive_revision:2,florida_credit:{prohibited_minutes:16,credited_night_minutes:15},can_confirm_work:false}];
 const out=merge(sourceRows,'FL',serverRows);
 assert.equal(out[0].drive_revision,2);
 assert.equal(out[0].florida_credit.prohibited_minutes,16);
 assert.equal(out[0].fl_credit_missing,false);
 assert.equal(out[1],sourceRows[1]);
 const stale=merge([{...sourceRows[0],drive_revision:3}],'FL',serverRows);
 assert.equal(stale[0].florida_credit,null);
 assert.equal(stale[0].fl_credit_missing,true);
});

test('Florida credit success repaints recent drives after authoritative rows merge',()=>{
 const src=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8')
 assert.match(src,/model\.recent_drives=mergeFloridaCreditRows\(model\.recent_drives\|\|\[\],driverId,rows\)/)
 assert.match(src,/syncFloridaRecentWarnings\(\)/)
 assert.match(src,/FLORIDA RESTRICTION · \$\{excluded\} MIN DO NOT COUNT/)
})

test('Recent Drives has an independent red-brow synchronizer after Florida credit merge',()=>{
 const src=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
 assert.match(src,/function syncFloridaRecentWarnings\(\)/)
 assert.match(src,/card\.classList\.toggle\('drive-item-fl-restricted',count>0\)/)
 assert.match(src,/card\.prepend\(notice\)/)
 assert.match(src,/syncFloridaRecentWarnings\(\);\s*window\.dispatchEvent/)
 assert.match(src,/if\(currentDriverId===driverId\)\{render\(renderGeneration\);syncFloridaRecentWarnings\(\);\}/)
});
test('driver-only favorite color is resilient to unrelated licensing and SMS fetch failures',()=>{
 const src=fs.readFileSync('assets/js/family-card-profile.js','utf8');
 const before=src.slice(src.indexOf('async function enrichDriver('),src.indexOf('async function enrichCards('));
 assert.ok(before.indexOf('renderColorPicker(card,s)')<before.indexOf("api('profile-api','license_overview'"))
 assert.match(src,/try\{await loadSubjects\(\)\}catch/)
 assert.match(src,/loadPendingChanges\(\)\.catch/)
 assert.match(src,/host\.dataset\.ready='true'/);
});

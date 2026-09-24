const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const dashboard=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
const archive=fs.readFileSync('assets/js/log-prepilot-v2.js','utf8');

test('BKLG-0111 Trip Archive reads canonical vehicle presentation from recent drive records',()=>{
  assert.match(dashboard,/const vehicleName=d\.vehicle_name\|\|'Vehicle'/);
  assert.match(archive,/const vehicleName=d\.vehicle_name\|\|'Vehicle'/);
  assert.match(dashboard,/\$\{esc\(vehicleName\)\}/);
  assert.match(archive,/\$\{esc\(vehicleName\)\}/);
});

test('BKLG-0111 keeps selectable Garage vehicles active-only',()=>{
  assert.match(dashboard,/activeVehicles=\(\)=>model\.vehicles\.filter\(v=>v\.driver_id===currentDriverId&&v\.status!=='ARCHIVED'\)/);
});

test('BKLG-0111 no longer maintains a second historical vehicle read model',()=>{
  assert.doesNotMatch(dashboard,/historical_vehicles/);
  assert.doesNotMatch(dashboard,/get_authenticated_historical_vehicles_v1/);
  assert.doesNotMatch(dashboard,/hydrateHistoricalVehicles/);
  assert.doesNotMatch(archive,/historical_vehicles/);
  assert.doesNotMatch(archive,/dv:historical-vehicles-updated/);
});

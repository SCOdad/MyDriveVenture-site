const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const dashboard=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
const archive=fs.readFileSync('assets/js/log-prepilot-v2.js','utf8');

test('BKLG-0111 loads archived vehicles as historical lookup data without expanding selectable vehicles',()=>{
  assert.match(dashboard,/historical_vehicles:\[\]/);
  assert.match(dashboard,/get_authenticated_historical_vehicles_v1/);
  assert.match(dashboard,/activeVehicles=\(\)=>model\.vehicles\.filter\(v=>v\.driver_id===currentDriverId&&v\.status!=='ARCHIVED'\)/);
  assert.match(dashboard,/vehicleForDrive=vehicleId=>\(model\.vehicles\|\|\[\]\).*historical_vehicles/s);
});

test('BKLG-0111 trip archive resolves historical vehicle names before generic fallback',()=>{
  assert.match(dashboard,/const v=vehicleForDrive\(d\.vehicle_id\)/);
  assert.match(archive,/model\.historical_vehicles\|\|\[\]/);
  assert.match(archive,/v\?\.name\|\|'Vehicle'/);
});

test('BKLG-0111 historical vehicle lookup failure does not block dashboard access',()=>{
  assert.match(dashboard,/model\.historical_vehicles=!historicalResult\.error&&Array\.isArray\(historicalResult\.data\)\?historicalResult\.data:\[\]/);
});

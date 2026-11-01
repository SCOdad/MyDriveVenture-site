const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const detail=fs.readFileSync(path.join(__dirname,'../assets/js/log-drive-detail-v4.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'../assets/js/log-dashboard-entry-v5.js'),'utf8');
test('BKLG-0235 credits Visual Crossing in existing trip-detail weather source',()=>{
  assert.match(detail,/data-drive-weather-source/);
  assert.match(detail,/observation\?\.attribution_source\|\|observation\?\.source/);
  assert.match(detail,/https:\/\/www\.visualcrossing\.com\//);
  assert.match(detail,/rel="noopener noreferrer"/);
  assert.match(detail,/National Weather Service/);
  assert.match(detail,/NOAA\/NCEI/);
});
test('BKLG-0235 PA refresh preserves original weather source and loader busts cache',()=>{
  assert.match(detail,/showPaWeatherSummary/);
  assert.match(detail,/source\.innerHTML=weatherSourceMarkup/);
  assert.match(loader,/log-drive-detail-v4\.js\?v=20261101-bklg0235-attribution1/);
});

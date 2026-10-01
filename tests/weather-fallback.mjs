import assert from 'node:assert/strict';

const WEATHER_TTL_MS=5*60*1000;
const weatherCache=new Map();
let lastWeatherKey='',lastUi=null,invokeImpl=null,now=()=>Date.now();
const app={client:{functions:{invoke:async()=>invokeImpl()}},getDriverId:()=>driver.id};
function setWeather(summary,road=''){lastUi={summary,road}}
function conditionSummary(conditions){const set=new Set((conditions||[]).map(x=>String(x).toUpperCase()));if(set.has('THUNDERSTORM'))return 'Storms';if(set.has('FREEZING_PRECIPITATION'))return 'Freezing precipitation';if(set.has('SNOW'))return 'Snow';if(set.has('RAIN')||set.has('DRIZZLE'))return 'Rain';if(set.has('FOG'))return 'Fog';if(set.has('CLOUDY'))return 'Cloudy';if(set.has('CLEAR'))return 'Clear';return 'Weather unavailable'}
function roadSummary(ctx){const set=new Set((ctx?.conditions||[]).map(x=>String(x).toUpperCase()));if(ctx?.status!=='CLASSIFIED'||ctx?.hasPrecipitation==null)return 'Conditions unavailable';if(set.has('FREEZING_PRECIPITATION'))return 'Icy / slick possible';if(set.has('SNOW'))return 'Snow / slush possible';if(ctx.hasPrecipitation||set.has('RAIN')||set.has('DRIZZLE')||set.has('THUNDERSTORM'))return 'Wet pavement possible';if(set.has('FOG'))return 'Dry · reduced visibility';return 'Dry / normal'}
function applyWeather(data){const ctx=data?.weather_context||data;if(!ctx||ctx.status!=='CLASSIFIED'){setWeather(ctx?.status==='LOCATION_PENDING'?'Location needed':'Weather unavailable','Conditions unavailable');return}setWeather(conditionSummary(ctx.conditions),roadSummary(ctx))}
async function renderWeather(driver){const key=`${driver.id}:weather-context-current`;if(key===lastWeatherKey)return;lastWeatherKey=key;setWeather('Loading…','Checking…');const cached=weatherCache.get(key);if(cached&&now()-cached.at<WEATHER_TTL_MS){if(app.getDriverId?.()===driver.id)applyWeather(cached.data);return}try{const {data,error}=await app.client.functions.invoke('drive-ops',{body:{action:'weather_context_current',driver_id:driver.id}});if(error||!data?.ok)throw new Error(data?.error||error?.message||'Weather unavailable');weatherCache.set(key,{at:now(),data});if(app.getDriverId?.()===driver.id)applyWeather(data)}catch{if(app.getDriverId?.()!==driver.id)return;if(cached){applyWeather(cached.data);return}setWeather('Weather unavailable','Conditions unavailable')}}
function reset(){lastWeatherKey='';lastUi=null;weatherCache.clear();}
const driver={id:'d1'};
const rainy={ok:true,weather_context:{status:'CLASSIFIED',conditions:['RAIN'],hasPrecipitation:true}};

reset();invokeImpl=async()=>({data:rainy,error:null});await renderWeather(driver);assert.deepEqual(lastUi,{summary:'Rain',road:'Wet pavement possible'});assert.equal(weatherCache.size,1);

lastWeatherKey='';invokeImpl=async()=>{throw new Error('network')};await renderWeather(driver);assert.deepEqual(lastUi,{summary:'Rain',road:'Wet pavement possible'},'cached canonical weather should survive transient failure');

reset();invokeImpl=async()=>{throw new Error('network')};await renderWeather(driver);assert.deepEqual(lastUi,{summary:'Weather unavailable',road:'Conditions unavailable'},'uncached failure should degrade safely');

reset();invokeImpl=async()=>({data:{ok:true,weather_context:{status:'LOOKUP_PENDING',conditions:[],hasPrecipitation:null}},error:null});await renderWeather(driver);assert.deepEqual(lastUi,{summary:'Weather unavailable',road:'Conditions unavailable'},'lookup pending must not render dry');

console.log('weather fallback fixtures passed: 4');

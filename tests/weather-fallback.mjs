import assert from 'node:assert/strict';

const WEATHER_TTL_MS=5*60*1000;
const weatherCache=new Map();
let lastWeatherKey='',lastUi=null,fetchImpl=null,now=()=>Date.now();
function weatherText(code){code=Number(code);if(code===0)return 'Clear';if([1,2,3].includes(code))return 'Cloudy';if([45,48].includes(code))return 'Fog';if((code>=51&&code<=67)||(code>=80&&code<=82))return 'Rain';if((code>=71&&code<=77)||(code>=85&&code<=86))return 'Snow';if(code>=95)return 'Storms';return 'Mixed'}
function weatherSeverity(code){code=Number(code);if(code>=95)return 5;if((code>=71&&code<=77)||(code>=85&&code<=86))return 4;if((code>=51&&code<=67)||(code>=80&&code<=82))return 3;if([45,48].includes(code))return 2;if([1,2,3].includes(code))return 1;return 0}
function meaningfulWeather(c,hourly){const currentCode=Number(c.weather_code),precip=Number(c.precipitation||0),rain=Number(c.rain||0),snow=Number(c.snowfall||0);let code=currentCode;if(snow>0&&weatherSeverity(code)<4)code=71;else if((rain>0||precip>0)&&weatherSeverity(code)<3)code=61;const times=hourly?.time||[],codes=hourly?.weather_code||[],current=new Date(c.time||Date.now()).getTime();for(let i=0;i<times.length;i++){const t=new Date(times[i]).getTime();if(!Number.isFinite(t)||t<current-30*60*1000||t>current+90*60*1000)continue;if(weatherSeverity(codes[i])>weatherSeverity(code))code=Number(codes[i])}return code}
function roadText(c,meaningfulCode){const code=Number(meaningfulCode??c.weather_code),precip=Number(c.precipitation||0),rain=Number(c.rain||0),snow=Number(c.snowfall||0);if([56,57,66,67].includes(code))return 'Icy / slick possible';if(snow>0||(code>=71&&code<=77)||(code>=85&&code<=86))return 'Snow / slush possible';if(rain>0||precip>0||(code>=51&&code<=67)||(code>=80&&code<=82)||code>=95)return 'Wet pavement possible';if([45,48].includes(code))return 'Dry · reduced visibility';return 'Dry / normal'}
function setWeather(summary,road=''){lastUi={summary,road}}
function applyWeather(j){const c=j.current||{},code=meaningfulWeather(c,j.hourly),temp=Number(c.temperature_2m);if(!Number.isFinite(temp))throw new Error('Missing current temperature');setWeather(`${Math.round(temp)}°F · ${weatherText(code)}`,roadText(c,code))}
async function renderWeather(driver){const key=`${driver.id}:${driver.home_latitude}:${driver.home_longitude}`;if(key===lastWeatherKey)return;lastWeatherKey=key;setWeather('Loading…','Checking…');if(driver.home_latitude==null||driver.home_longitude==null){setWeather('Location needed','Unavailable');return}const cached=weatherCache.get(key);if(cached&&now()-cached.at<WEATHER_TTL_MS){try{applyWeather(cached.data);return}catch{weatherCache.delete(key)}}try{const r=await fetchImpl();if(!r.ok)throw new Error();const j=await r.json();weatherCache.set(key,{at:now(),data:j});applyWeather(j)}catch{if(cached){try{applyWeather(cached.data);return}catch{}}setWeather('Weather unavailable','Conditions unavailable')}}
function reset(){lastWeatherKey='';lastUi=null;weatherCache.clear();}
const driver={id:'d1',home_latitude:42.7,home_longitude:-83.4};
const rainy={current:{time:'2026-08-22T08:00:00-04:00',temperature_2m:65,weather_code:3,precipitation:.4,rain:.4,snowfall:0},hourly:{time:[],weather_code:[]}};

reset();fetchImpl=async()=>({ok:true,json:async()=>rainy});await renderWeather(driver);assert.deepEqual(lastUi,{summary:'65°F · Rain',road:'Wet pavement possible'});assert.equal(weatherCache.size,1);

lastWeatherKey='';fetchImpl=async()=>{throw new Error('network')};await renderWeather(driver);assert.deepEqual(lastUi,{summary:'65°F · Rain',road:'Wet pavement possible'},'cached data should survive provider failure');

reset();fetchImpl=async()=>{throw new Error('network')};await renderWeather(driver);assert.deepEqual(lastUi,{summary:'Weather unavailable',road:'Conditions unavailable'},'uncached failure should degrade safely');

reset();await renderWeather({id:'d2',home_latitude:null,home_longitude:null});assert.deepEqual(lastUi,{summary:'Location needed',road:'Unavailable'});

console.log('weather fallback fixtures passed: 4');

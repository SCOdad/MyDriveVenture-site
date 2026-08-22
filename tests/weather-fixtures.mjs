import assert from 'node:assert/strict';

function weatherText(code){code=Number(code);if(code===0)return 'Clear';if([1,2,3].includes(code))return 'Cloudy';if([45,48].includes(code))return 'Fog';if((code>=51&&code<=67)||(code>=80&&code<=82))return 'Rain';if((code>=71&&code<=77)||(code>=85&&code<=86))return 'Snow';if(code>=95)return 'Storms';return 'Mixed'}
function weatherSeverity(code){code=Number(code);if(code>=95)return 5;if((code>=71&&code<=77)||(code>=85&&code<=86))return 4;if((code>=51&&code<=67)||(code>=80&&code<=82))return 3;if([45,48].includes(code))return 2;if([1,2,3].includes(code))return 1;return 0}
function meaningfulWeather(c,hourly){const currentCode=Number(c.weather_code),precip=Number(c.precipitation||0),rain=Number(c.rain||0),snow=Number(c.snowfall||0);let code=currentCode;if(snow>0&&weatherSeverity(code)<4)code=71;else if((rain>0||precip>0)&&weatherSeverity(code)<3)code=61;const times=hourly?.time||[],codes=hourly?.weather_code||[],now=new Date(c.time||Date.now()).getTime();for(let i=0;i<times.length;i++){const t=new Date(times[i]).getTime();if(!Number.isFinite(t)||t<now-30*60*1000||t>now+90*60*1000)continue;if(weatherSeverity(codes[i])>weatherSeverity(code))code=Number(codes[i])}return code}
function roadText(c,meaningfulCode){const code=Number(meaningfulCode??c.weather_code),precip=Number(c.precipitation||0),rain=Number(c.rain||0),snow=Number(c.snowfall||0);if([56,57,66,67].includes(code))return 'Icy / slick possible';if(snow>0||(code>=71&&code<=77)||(code>=85&&code<=86))return 'Snow / slush possible';if(rain>0||precip>0||(code>=51&&code<=67)||(code>=80&&code<=82)||code>=95)return 'Wet pavement possible';if([45,48].includes(code))return 'Dry · reduced visibility';return 'Dry / normal'}

const baseTime='2026-08-22T08:00:00-04:00';
const cases=[
  {name:'clear',current:{time:baseTime,weather_code:0,precipitation:0,rain:0,snowfall:0},hourly:{time:[],weather_code:[]},summary:'Clear',road:'Dry / normal'},
  {name:'cloudy',current:{time:baseTime,weather_code:3,precipitation:0,rain:0,snowfall:0},hourly:{time:[],weather_code:[]},summary:'Cloudy',road:'Dry / normal'},
  {name:'cloudy plus active rain upgrades to rain',current:{time:baseTime,weather_code:3,precipitation:0.4,rain:0.4,snowfall:0},hourly:{time:[],weather_code:[]},summary:'Rain',road:'Wet pavement possible'},
  {name:'near-term thunderstorm outranks cloudy current',current:{time:baseTime,weather_code:3,precipitation:0,rain:0,snowfall:0},hourly:{time:['2026-08-22T08:00:00-04:00','2026-08-22T09:00:00-04:00'],weather_code:[3,95]},summary:'Storms',road:'Wet pavement possible'},
  {name:'snow signal upgrades cloudy current',current:{time:baseTime,weather_code:3,precipitation:0.2,rain:0,snowfall:0.2},hourly:{time:[],weather_code:[]},summary:'Snow',road:'Snow / slush possible'},
  {name:'freezing rain reports slick',current:{time:baseTime,weather_code:56,precipitation:0.2,rain:0.2,snowfall:0},hourly:{time:[],weather_code:[]},summary:'Rain',road:'Icy / slick possible'},
  {name:'fog reduces visibility',current:{time:baseTime,weather_code:45,precipitation:0,rain:0,snowfall:0},hourly:{time:[],weather_code:[]},summary:'Fog',road:'Dry · reduced visibility'},
  {name:'far-future storm outside horizon does not override current',current:{time:baseTime,weather_code:3,precipitation:0,rain:0,snowfall:0},hourly:{time:['2026-08-22T11:00:00-04:00'],weather_code:[95]},summary:'Cloudy',road:'Dry / normal'}
];

for(const tc of cases){const code=meaningfulWeather(tc.current,tc.hourly);assert.equal(weatherText(code),tc.summary,`${tc.name}: summary`);assert.equal(roadText(tc.current,code),tc.road,`${tc.name}: road`)}
console.log(`weather fixtures passed: ${cases.length}`);

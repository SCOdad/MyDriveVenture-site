import assert from 'node:assert/strict';

function conditionSummary(conditions){const set=new Set((conditions||[]).map(x=>String(x).toUpperCase()));if(set.has('THUNDERSTORM'))return 'Storms';if(set.has('FREEZING_PRECIPITATION'))return 'Freezing precipitation';if(set.has('SNOW'))return 'Snow';if(set.has('RAIN')||set.has('DRIZZLE'))return 'Rain';if(set.has('FOG'))return 'Fog';if(set.has('CLOUDY'))return 'Cloudy';if(set.has('CLEAR'))return 'Clear';return 'Weather unavailable'}
function roadSummary(ctx){const set=new Set((ctx?.conditions||[]).map(x=>String(x).toUpperCase()));if(ctx?.status!=='CLASSIFIED'||ctx?.hasPrecipitation==null)return 'Conditions unavailable';if(set.has('FREEZING_PRECIPITATION'))return 'Icy / slick possible';if(set.has('SNOW'))return 'Snow / slush possible';if(ctx.hasPrecipitation||set.has('RAIN')||set.has('DRIZZLE')||set.has('THUNDERSTORM'))return 'Wet pavement possible';if(set.has('FOG'))return 'Dry · reduced visibility';return 'Dry / normal'}

const cases=[
  {name:'canonical clear can render dry',ctx:{status:'CLASSIFIED',conditions:['CLEAR'],hasPrecipitation:false},summary:'Clear',road:'Dry / normal'},
  {name:'canonical cloudy can render dry',ctx:{status:'CLASSIFIED',conditions:['CLOUDY'],hasPrecipitation:false},summary:'Cloudy',road:'Dry / normal'},
  {name:'canonical rain renders wet',ctx:{status:'CLASSIFIED',conditions:['RAIN'],hasPrecipitation:true},summary:'Rain',road:'Wet pavement possible'},
  {name:'canonical thunderstorm renders wet',ctx:{status:'CLASSIFIED',conditions:['THUNDERSTORM'],hasPrecipitation:true},summary:'Storms',road:'Wet pavement possible'},
  {name:'canonical snow renders slush',ctx:{status:'CLASSIFIED',conditions:['SNOW'],hasPrecipitation:true},summary:'Snow',road:'Snow / slush possible'},
  {name:'canonical freezing precipitation renders slick',ctx:{status:'CLASSIFIED',conditions:['FREEZING_PRECIPITATION','RAIN'],hasPrecipitation:true},summary:'Freezing precipitation',road:'Icy / slick possible'},
  {name:'canonical fog renders reduced visibility',ctx:{status:'CLASSIFIED',conditions:['FOG'],hasPrecipitation:false},summary:'Fog',road:'Dry · reduced visibility'},
  {name:'unavailable never renders dry',ctx:{status:'LOOKUP_PENDING',conditions:[],hasPrecipitation:null},summary:'Weather unavailable',road:'Conditions unavailable'},
];

for(const tc of cases){assert.equal(conditionSummary(tc.ctx.conditions),tc.summary,`${tc.name}: summary`);assert.equal(roadSummary(tc.ctx),tc.road,`${tc.name}: road`)}
console.log(`weather fixtures passed: ${cases.length}`);

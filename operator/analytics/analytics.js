(()=>{'use strict';
const status=document.getElementById('analytics-status'),content=document.getElementById('analytics-content');
let lastData=null,calendarMode='weekly';
const environmentNote=document.getElementById('environment-note');if(environmentNote)environmentNote.hidden=window.DV_ENVIRONMENT_CONFIG?.name!=='dev';
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('en-US');
const cell=(value,max,denominator=1)=>{const rate=document.getElementById('intensity').value==='rate',adjusted=rate?value/Math.max(1,denominator):value;const opacity=max?Math.max(.06,Math.min(.92,adjusted/max*.92)):.06;return '<td title="'+fmt(value)+' drives" style="background:rgba(47,125,74,'+opacity+');color:var(--warm-white)+'">'+(value||'')+'</td>'};
const table=(labels,cols,rows,denominators=[])=>{const rate=document.getElementById('intensity').value==='rate';const max=Math.max(0,...rows.flatMap((row,i)=>row.map(v=>rate?Number(v)/Math.max(1,denominators[i]||0):Number(v))));return '<table class="heat-table"><thead><tr><th></th>'+cols.map(c=>'<th scope="col">'+h(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map((row,i)=>'<tr><th class="heat-label" scope="row">'+h(labels[i])+'</th>'+row.map(x=>cell(x,max,denominators[i]||1)).join('')+'</tr>').join('')+'</tbody></table>'};

const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function calendar(records){
 const dates=Object.keys(records).sort();if(!dates.length)return '<p>No completed drives recorded.</p>';
 const parse=date=>new Date(date+'T12:00:00Z');
 const iso=date=>date.toISOString().slice(0,10);
 const weekdayIndex=date=>(date.getUTCDay()+6)%7;
 if(calendarMode==='monthly'){
   const period=document.getElementById('period').value;
   const today=new Date();const end=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate(),12));
   const from=parse(dates[0]);
   // Restrict weekday-occurrence denominators to the selected observation window.
   const begin=period==='all'?from:new Date(end);
   if(period!=='all')begin.setUTCDate(begin.getUTCDate()+1-Number(period));
   // Bounded periods include zero-drive days before the first recorded drive.
   const groups=new Map();
   for(let day=new Date(begin);day<=end;day.setUTCDate(day.getUTCDate()+1)){
     const month=iso(day).slice(0,7),slot=weekdayIndex(day);
     if(!groups.has(month))groups.set(month,{counts:Array(7).fill(0),occurrences:Array(7).fill(0)});
     groups.get(month).occurrences[slot]++;
   }
   for(const [date,count] of Object.entries(records)){
     const group=groups.get(date.slice(0,7));if(group)group.counts[weekdayIndex(parse(date))]+=Number(count)||0;
   }
   const labels=[...groups.keys()],rows=labels.map(key=>groups.get(key).counts);
   const rate=document.getElementById('intensity').value==='rate';
   // Monthly normalization uses the number of weekday occurrences, not the total month length.
   const drivers=lastData?.sample?.drivers||1;
   const measures=labels.map(key=>groups.get(key).counts.map((count,i)=>count/Math.max(1,groups.get(key).occurrences[i])/(rate?drivers:1)));
   const max=Math.max(0,...measures.flat());
   document.getElementById('calendar-note').textContent='Monthly shading: average drives per occurrence of each weekday'+(rate?', divided by observed drivers':'')+'. Cells display total drives.';
   return '<table class="heat-table"><thead><tr><th>Month</th>'+weekday.map(day=>'<th scope="col">'+day+'</th>').join('')+'</tr></thead><tbody>'+
     labels.map((key,i)=>'<tr><th class="heat-label" scope="row">'+new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',year:'numeric'}).format(parse(key+'-01'))+'</th>'+
       rows[i].map((count,j)=>{const appearances=groups.get(key).occurrences[j],avg=appearances?count/appearances:0,opacity=max?Math.max(.06,Math.min(.92,measures[i][j]/max*.92)):.06;
         return '<td title="'+count+' drives across '+appearances+' '+weekday[j]+'s; '+avg.toFixed(2)+' drives per '+weekday[j]+'" style="background:rgba(47,125,74,'+opacity+');color:var(--warm-white)+'">'+(count||'')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table>';
 }
 const from=parse(dates[0]),to=parse(dates[dates.length-1]),start=new Date(from);start.setUTCDate(start.getUTCDate()-weekdayIndex(start));
 const labels=[],rows=[];for(let d=new Date(start);d<=to;d.setUTCDate(d.getUTCDate()+7)){
   const row=[],stamp=iso(d);labels.push(stamp);
   for(let i=0;i<7;i++){const day=new Date(d);day.setUTCDate(day.getUTCDate()+i);row.push(records[iso(day)]||0)}rows.push(row)
 }
 document.getElementById('calendar-note').textContent='Weekly shading: '+(document.getElementById('intensity').value==='rate'?'drives per observed driver':'total drives')+'.';
 return table(labels,weekday,rows,labels.map(label=>lastData?.week_drivers?.[label]||0))
}
function summaries(rows){if(!rows?.length)return '<p>Not enough data.</p>';return '<table class="data-table"><thead><tr><th>Band</th><th>Drives</th><th>Drivers</th><th>Drives / observed driver</th><th>Mean duration</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+h(r.label)+'</td><td>'+fmt(r.drives)+'</td><td>'+fmt(r.drivers)+'</td><td>'+Number(r.average_minutes).toFixed(1)+' min</td></tr>').join('')+'</tbody></table>'}
function cohorts(rows){if(!rows.length)return '<p>No families.</p>';const max=Math.max(1,...rows.flatMap(r=>r.weeks.map(w=>w?.active||0)));return '<table class="heat-table"><thead><tr><th>Cohort</th><th>Families</th>'+Array.from({length:12},(_,i)=>'<th>W'+i+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><th class="heat-label">'+h(r.month)+'</th><th>'+fmt(r.families)+'</th>'+r.weeks.map(w=>{const v=w?.active||0,eligible=w?.eligible||0,pct=eligible?Math.round(v/eligible*100):0,opacity=eligible?v/max*.9:0;return '<td title="'+v+' of '+eligible+' eligible families" style="background:rgba(47,125,74,'+opacity+');color:var(--warm-white)+'">'+(eligible?pct+'%':'—')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table>'}
function details(rows,cols){return '<table class="data-table"><thead><tr>'+cols.map(([k,title])=>'<th>'+h(title)+'</th>').join('')+'</tr></thead><tbody>'+(rows||[]).map(r=>'<tr>'+cols.map(([k])=>'<td>'+h(r[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
function renderAgeExperience(payload){
 const target=document.getElementById('age-experience'),count=document.getElementById('age-experience-count');
 if(!payload?.cells){target.textContent='Age × experience data unavailable.';count.textContent='';return}
 const metric=document.getElementById('development-metric').value;
 const value=cell=>metric==='drivers'?cell.drivers:metric==='rate'?(cell.drivers?cell.drives/cell.drivers:null):metric==='duration'?cell.mean_duration:cell.drives;
 const values=payload.cells.flat().map(value).filter(v=>v!==null&&Number.isFinite(v));
 const max=Math.max(0,...values);
 const display=(v,cell)=>cell.drives===0?'—':metric==='duration'?v.toFixed(1):metric==='rate'?v.toFixed(2):fmt(v);
 const totals=payload.cells.flat().reduce((n,cell)=>n+cell.drives,0);
 target.innerHTML='<table class="heat-table"><thead><tr><th scope="col">Age</th>'+payload.experience_hours.map(label=>'<th scope="col">'+h(label)+'</th>').join('')+'</tr></thead><tbody>'+
 payload.cells.map((row,i)=>'<tr><th scope="row" class="heat-label">'+h(payload.ages[i])+'</th>'+row.map(cell=>{
   const v=value(cell),intensity=v===null||!max?0:Math.min(1,v/max),opacity=cell.drives?Math.max(.12,intensity*.9):0;
   const title=payload.ages[i]+' years · '+payload.experience_hours[row.indexOf(cell)]+' prior hours · '+cell.drives+' drives · '+cell.drivers+' drivers · '+(cell.mean_duration==null?'no duration':cell.mean_duration+' min mean');
   return '<td title="'+h(title)+'" style="background:rgba(47,125,74,'+opacity+');color:var(--warm-white)">'+(v===null?'—':display(v,cell))+'</td>';
 }).join('')+'</tr>').join('')+'</tbody></table>';
 count.textContent=fmt(totals)+' drives included in age 14+ bands; blank cells have no observed drives. Age and experience bands refer to the time each drive occurred.';
}
function render(d){lastData=d;document.getElementById('sample').textContent=fmt(d.sample.drives)+' completed drives · '+fmt(d.sample.drivers)+' drivers with drives · '+fmt(d.sample.families)+' registered families'+(d.anomalous_drive_dates?' · '+fmt(d.anomalous_drive_dates)+' invalid-date drives excluded (requires data review)':'');
document.getElementById('definitions').textContent=d.definitions.hour+' · Experience = '+d.definitions.experience+'.';
document.getElementById('calendar').innerHTML=calendar(d.calendar);
document.getElementById('week-hour').innerHTML=table(weekday,Array.from({length:24},(_,i)=>i),d.hour_week,d.weekday_drivers);
document.getElementById('month-hour').innerHTML=table(months,Array.from({length:24},(_,i)=>i),d.month_hour,d.month_drivers);
renderAgeExperience(d.age_experience);
document.getElementById('night').innerHTML=details(d.experience_day_night,[['label','Experience'],['dayMinutes','Day minutes'],['nightMinutes','Night minutes']]);document.getElementById('inactivity').innerHTML=details(d.inactivity,[['label','Experience'],['drivers','Drivers'],['idle7','Idle 7+ days'],['idle30','Idle 30+ days']]);
const p=d.first_second;document.getElementById('second').textContent=fmt(p.secondWithin30)+' of '+fmt(p.eligible30)+' drivers with at least 30 days of observation ('+(p.eligible30?Math.round(100*p.secondWithin30/p.eligible30):0)+'%) returned for a second drive within 30 days.';
document.getElementById('cohorts').innerHTML=cohorts(d.cohorts);content.hidden=false;status.textContent='Updated '+new Date(d.generated_at).toLocaleString()+(d.include_test_drivers?' · Test drivers included':' · Test drivers excluded');}
async function run(){try{const cfg=window.DV_APP_CONFIG||{},endpoint=window.DV_OPERATOR_ANALYTICS_ENDPOINT;if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey||!endpoint)throw Error('Operator configuration unavailable');
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
const {data:{session}}=await client.auth.getSession();if(!session?.access_token){document.getElementById('analytics-login').hidden=false;status.textContent='Sign in required';return;}document.getElementById('analytics-login').hidden=true;
const request=async token=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,apikey:cfg.publishableKey},body:JSON.stringify({action:'driving_patterns',period:document.getElementById('period').value,include_test_drivers:document.getElementById('include-test-drivers').checked})});
let response=await request(session.access_token);if(response.status===401){const {data}=await client.auth.refreshSession();if(data.session?.access_token)response=await request(data.session.access_token)}
const output=await response.json().catch(()=>({}));if(!response.ok||!output.ok)throw Error(output.error||'Analytics request failed ('+response.status+')');render(output);
}catch(e){status.textContent=e.message||String(e)}}document.getElementById('include-test-drivers').addEventListener('change',()=>{status.textContent='Refreshing driver selection…';run()});document.getElementById('period').addEventListener('change',()=>{status.textContent='Loading selected period…';run()});document.getElementById('development-metric').addEventListener('change',()=>{if(lastData)renderAgeExperience(lastData.age_experience)});document.getElementById('intensity').addEventListener('change',()=>{if(lastData)render(lastData)});document.querySelectorAll('[data-calendar-mode]').forEach(button=>button.addEventListener('click',()=>{calendarMode=button.dataset.calendarMode;document.querySelectorAll('[data-calendar-mode]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});document.getElementById('calendar-heading').textContent=calendarMode==='weekly'?'Calendar: week × weekday':'Calendar: month × weekday';if(lastData)render(lastData)}));run()})();
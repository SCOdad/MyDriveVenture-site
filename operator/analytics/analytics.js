(()=>{'use strict';
const status=document.getElementById('analytics-status'),content=document.getElementById('analytics-content');
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('en-US');
const cell=(value,max)=>{const opacity=max?Math.max(.06,Math.min(.92,value/max*.92)):.06;return '<td title="'+fmt(value)+' drives" style="background:rgba(15,25,35,'+opacity+');color:'+(opacity>.5?'white':'#222')+'">'+(value||'')+'</td>'};
const table=(labels,cols,rows)=>{const max=Math.max(0,...rows.flat().map(Number));return '<table class="heat-table"><thead><tr><th></th>'+cols.map(c=>'<th scope="col">'+h(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map((row,i)=>'<tr><th class="heat-label" scope="row">'+h(labels[i])+'</th>'+row.map(x=>cell(x,max)).join('')+'</tr>').join('')+'</tbody></table>'};
const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function calendar(records){
 const dates=Object.keys(records).sort();if(!dates.length)return '<p>No completed drives recorded.</p>';
 const from=new Date(dates[0]+'T12:00:00Z'),to=new Date(dates[dates.length-1]+'T12:00:00Z'),start=new Date(from);start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);
 const labels=[],rows=[];for(let d=new Date(start);d<=to;d.setUTCDate(d.getUTCDate()+7)){const row=[],stamp=d.toISOString().slice(0,10);labels.push(stamp);for(let i=0;i<7;i++){const day=new Date(d);day.setUTCDate(day.getUTCDate()+i);row.push(records[day.toISOString().slice(0,10)]||0)}rows.push(row)}
 return table(labels,weekday,rows)
}
function summaries(rows){if(!rows?.length)return '<p>Not enough data.</p>';return '<table class="data-table"><thead><tr><th>Band</th><th>Drives</th><th>Drivers</th><th>Mean duration</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+h(r.label)+'</td><td>'+fmt(r.drives)+'</td><td>'+fmt(r.drivers)+'</td><td>'+Number(r.average_minutes).toFixed(1)+' min</td></tr>').join('')+'</tbody></table>'}
function cohorts(rows){if(!rows.length)return '<p>No families.</p>';const max=Math.max(1,...rows.flatMap(r=>r.weeks));return '<table class="heat-table"><thead><tr><th>Cohort</th><th>Families</th>'+Array.from({length:12},(_,i)=>'<th>W'+i+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><th class="heat-label">'+h(r.month)+'</th><th>'+fmt(r.families)+'</th>'+r.weeks.map(v=>{const pct=r.families?Math.round(v/r.families*100):0,opacity=v/max*.9;return '<td title="'+v+' of '+r.families+' families" style="background:rgba(15,25,35,'+opacity+');color:'+(opacity>.5?'white':'#222')+'">'+pct+'%</td>'}).join('')+'</tr>').join('')+'</tbody></table>'}
function details(rows,cols){return '<table class="data-table"><thead><tr>'+cols.map(([k,title])=>'<th>'+h(title)+'</th>').join('')+'</tr></thead><tbody>'+(rows||[]).map(r=>'<tr>'+cols.map(([k])=>'<td>'+h(r[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
function render(d){document.getElementById('sample').textContent=fmt(d.sample.drives)+' completed drives · '+fmt(d.sample.drivers)+' drivers with drives · '+fmt(d.sample.families)+' registered families';
document.getElementById('definitions').textContent=d.definitions.hour+' · Experience = '+d.definitions.experience+'.';
document.getElementById('calendar').innerHTML=calendar(d.calendar);
document.getElementById('week-hour').innerHTML=table(weekday,Array.from({length:24},(_,i)=>i),d.hour_week);
document.getElementById('month-hour').innerHTML=table(months,Array.from({length:24},(_,i)=>i),d.month_hour);
document.getElementById('ages').innerHTML=summaries(d.by_age);document.getElementById('experience').innerHTML=summaries(d.by_experience);
document.getElementById('night').innerHTML=details(d.experience_day_night,[['label','Experience'],['dayMinutes','Day minutes'],['nightMinutes','Night minutes']]);document.getElementById('inactivity').innerHTML=details(d.inactivity,[['label','Experience'],['drivers','Drivers'],['idle7','Idle 7+ days'],['idle30','Idle 30+ days']]);
const p=d.first_second;document.getElementById('second').textContent=fmt(p.secondWithin30)+' of '+fmt(p.first)+' drivers with a recorded first drive ('+(p.first?Math.round(100*p.secondWithin30/p.first):0)+'%) returned for a second drive within 30 days.';
document.getElementById('cohorts').innerHTML=cohorts(d.cohorts);content.hidden=false;status.textContent='Updated '+new Date(d.generated_at).toLocaleString();}
async function run(){try{const cfg=window.DV_APP_CONFIG||{},endpoint=window.DV_OPERATOR_ANALYTICS_ENDPOINT;if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey||!endpoint)throw Error('Operator configuration unavailable');
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw Error('Sign in with an operator account to view analytics.');
const request=async token=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,apikey:cfg.publishableKey},body:JSON.stringify({action:'driving_patterns'})});
let response=await request(session.access_token);if(response.status===401){const {data}=await client.auth.refreshSession();if(data.session?.access_token)response=await request(data.session.access_token)}
const output=await response.json().catch(()=>({}));if(!response.ok||!output.ok)throw Error(output.error||'Analytics request failed ('+response.status+')');render(output);
}catch(e){status.textContent=e.message||String(e)}}run()})();
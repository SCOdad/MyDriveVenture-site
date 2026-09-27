(() => {
  const DAY_MS=86400000;
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  const dateUTC=(y,m,d)=>new Date(Date.UTC(y,m-1,d));
  const addDays=(d,n)=>new Date(d.getTime()+n*DAY_MS);
  const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});

  function nthWeekday(year,month,weekday,ordinal){
    const first=dateUTC(year,month,1);
    const delta=(weekday-first.getUTCDay()+7)%7;
    return addDays(first,delta+(ordinal-1)*7);
  }
  function resolveAnchor(year,anchor){
    if(anchor.kind==='FIXED_DATE') return dateUTC(year,anchor.month,anchor.day);
    if(anchor.kind==='NTH_WEEKDAY') return nthWeekday(year,anchor.month,anchor.weekday,anchor.ordinal);
    throw new Error('Unsupported calendar anchor: '+anchor.kind);
  }
  function resolveRule(year,rule){
    const anchor=resolveAnchor(year,rule.anchor);
    return {start:addDays(anchor,rule.start_offset_days||0),end:addDays(anchor,rule.end_offset_days||0)};
  }
  function normalizeRule(input){
    if(input.mode==='fixed') return {anchor:{kind:'FIXED_DATE',month:+input.startMonth,day:+input.startDay},start_offset_days:0,end_offset_days:Math.round((dateUTC(2000,+input.endMonth,+input.endDay)-dateUTC(2000,+input.startMonth,+input.startDay))/DAY_MS)};
    return {anchor:{kind:'NTH_WEEKDAY',month:+input.month,weekday:+input.weekday,ordinal:+input.ordinal},start_offset_days:+input.startOffset,end_offset_days:+input.endOffset};
  }
  function resolveCalendar(year,rules){
    const yearStart=dateUTC(year,1,1),yearEnd=dateUTC(year,12,31);
    const named=rules.filter(r=>r.enabled!==false).map(r=>({...r,...resolveRule(year,r.rule)})).sort((a,b)=>a.start-b.start);
    const conflicts=[];
    for(let i=1;i<named.length;i++) if(named[i].start<=named[i-1].end) conflicts.push([named[i-1].id,named[i].id]);
    if(conflicts.length) return {valid:false,conflicts,rows:[{theme:'normal',label:'BASE',start:yearStart,end:yearEnd,base:true}]};
    const rows=[];let cursor=yearStart;
    named.forEach(r=>{if(cursor<r.start)rows.push({theme:'normal',label:'BASE',start:cursor,end:addDays(r.start,-1),base:true});rows.push({theme:r.theme,label:r.label,start:r.start,end:r.end,id:r.id});cursor=addDays(r.end,1)});
    if(cursor<=yearEnd)rows.push({theme:'normal',label:'BASE',start:cursor,end:yearEnd,base:true});
    return {valid:true,conflicts:[],rows};
  }
  function themeForDate(year,rules,date){
    const cal=resolveCalendar(year,rules);if(!cal.valid)return 'normal';
    const d=date instanceof Date?date:new Date(date+'T00:00:00Z');
    return cal.rows.find(r=>d>=r.start&&d<=r.end)?.theme||'normal';
  }
  const thanksgivingRule=(startOffset=-7,endOffset=3)=>({anchor:{kind:'NTH_WEEKDAY',month:11,weekday:4,ordinal:4},start_offset_days:startOffset,end_offset_days:endOffset});
  const api={addDays,fmt,iso,nthWeekday,resolveRule,normalizeRule,resolveCalendar,themeForDate,thanksgivingRule};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.DV_THEME_CALENDAR=Object.freeze(api);
})();
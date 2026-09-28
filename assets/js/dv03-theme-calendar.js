(() => {
  const DAY_MS=86400000;
  const PRECEDENCE=Object.freeze(['holiday','season','fallback']);
  const THEME_LEVELS=Object.freeze({halloween:'holiday',thanksgiving:'holiday',christmas:'holiday',valentines:'holiday','st-patricks':'holiday',autumn:'season',winter:'season',spring:'season',patriotic:'season',normal:'fallback'});
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  const dateUTC=(y,m,d)=>new Date(Date.UTC(y,m-1,d));
  const addDays=(d,n)=>new Date(d.getTime()+n*DAY_MS);
  const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
  function fixedDate(year,month,day){
    const d=dateUTC(year,+month,+day);
    if(d.getUTCFullYear()!==year||d.getUTCMonth()+1!==+month||d.getUTCDate()!==+day)throw new Error('Invalid fixed annual date');
    return d;
  }

  function nthWeekday(year,month,weekday,ordinal){
    const first=dateUTC(year,month,1);
    const delta=(weekday-first.getUTCDay()+7)%7;
    return addDays(first,delta+(ordinal-1)*7);
  }
  function resolveAnchor(year,anchor){
    if(anchor.kind==='FIXED_DATE') return fixedDate(year,anchor.month,anchor.day);
    if(anchor.kind==='NTH_WEEKDAY') return nthWeekday(year,anchor.month,anchor.weekday,anchor.ordinal);
    throw new Error('Unsupported calendar anchor: '+anchor.kind);
  }
  function resolveRule(year,rule){
    const anchor=resolveAnchor(year,rule.anchor);
    return {start:addDays(anchor,rule.start_offset_days||0),end:addDays(anchor,rule.end_offset_days||0)};
  }
  function normalizeRule(input){
    if(input.mode==='fixed'){
      const start=fixedDate(2000,input.startMonth,input.startDay),end=fixedDate(2000,input.endMonth,input.endDay);
      if(end<start)throw new Error('Fixed annual end date must not precede start date');
      return {anchor:{kind:'FIXED_DATE',month:+input.startMonth,day:+input.startDay},start_offset_days:0,end_offset_days:Math.round((end-start)/DAY_MS)};
    }
    return {anchor:{kind:'NTH_WEEKDAY',month:+input.month,weekday:+input.weekday,ordinal:+input.ordinal},start_offset_days:+input.startOffset,end_offset_days:+input.endOffset};
  }
  function levelFor(rule){return rule.level||THEME_LEVELS[rule.theme]||'season'}
  function priorityFor(rule){const rank=PRECEDENCE.indexOf(levelFor(rule));return rank<0?PRECEDENCE.length:rank}
  function overlaps(a,b){return a.start<=b.end&&b.start<=a.end}
  function resolveCalendar(year,rules){
    const yearStart=dateUTC(year,1,1),yearEnd=dateUTC(year,12,31);
    const named=rules.filter(r=>r.enabled!==false).map(r=>({...r,level:levelFor(r),priority:priorityFor(r),...resolveRule(year,r.rule)})).filter(r=>r.end>=yearStart&&r.start<=yearEnd).sort((a,b)=>a.start-b.start||a.priority-b.priority||String(a.id).localeCompare(String(b.id)));
    const conflicts=[];
    for(let i=0;i<named.length;i++)for(let j=i+1;j<named.length;j++){
      if(named[j].start>named[i].end)break;
      if(named[i].priority===named[j].priority&&overlaps(named[i],named[j]))conflicts.push([named[i].id,named[j].id]);
    }
    if(conflicts.length) return {valid:false,conflicts,rows:[{theme:'normal',label:'BASE',start:yearStart,end:yearEnd,base:true}]};
    const rows=[];
    for(let day=yearStart;day<=yearEnd;day=addDays(day,1)){
      const winner=named.filter(r=>day>=r.start&&day<=r.end).sort((a,b)=>a.priority-b.priority)[0];
      const current=winner?{theme:winner.theme,label:winner.label,id:winner.id,sourceRuleId:winner.id,level:winner.level,base:false}:{theme:'normal',label:'BASE',sourceRuleId:null,level:'fallback',base:true};
      const previous=rows[rows.length-1];
      if(previous&&previous.theme===current.theme&&previous.sourceRuleId===current.sourceRuleId)previous.end=day;
      else rows.push({...current,start:day,end:day});
    }
    return {valid:true,conflicts:[],rows};
  }
  function themeForDate(year,rules,date){
    const cal=resolveCalendar(year,rules);if(!cal.valid)return 'normal';
    const d=date instanceof Date?date:new Date(date+'T00:00:00Z');
    return cal.rows.find(r=>d>=r.start&&d<=r.end)?.theme||'normal';
  }
  const thanksgivingRule=(startOffset=-7,endOffset=3)=>({anchor:{kind:'NTH_WEEKDAY',month:11,weekday:4,ordinal:4},start_offset_days:startOffset,end_offset_days:endOffset});
  const api={PRECEDENCE,THEME_LEVELS,addDays,fmt,iso,nthWeekday,fixedDate,resolveRule,normalizeRule,resolveCalendar,themeForDate,thanksgivingRule,levelFor};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.DV_THEME_CALENDAR=Object.freeze(api);
})();

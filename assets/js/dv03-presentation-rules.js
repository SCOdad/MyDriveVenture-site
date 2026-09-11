(() => {
  const DAY_START_HOUR = 6;
  const NIGHT_START_HOUR = 18;
  const SCENERY_BY_QUEST = Object.freeze({
    Q000017:{scene:'snack-run',label:'Snack Run',src:'/assets/images/dv03/layers/DV03-L6-SNACK-RUN-BACKGROUND-DRAFT.png?v=56aafef-snack-run'},
    Q000035:{scene:'park',label:'Park',src:'/assets/images/dv03/layers/park.png'},
    Q000036:{scene:'school',label:'School',src:'/assets/images/dv03/layers/DV03-L2-SCHOOL-BACKGROUND-DRAFT.png'},
    Q000038:{scene:'grocery-store',label:'Grocery Store',src:'/assets/images/dv03/layers/DV03-L4-GROCERY-STORE-BACKGROUND-DRAFT.png'},
    Q000039:{scene:'library',label:'Library',src:'/assets/images/dv03/layers/DV03-L5-LIBRARY-BACKGROUND-DRAFT.png?v=721c2d7-library'},
    Q000043:{scene:'drive-thru',label:'Drive Thru',src:'/assets/images/dv03/layers/DV03-L7-DRIVE-THRU-BACKGROUND-DRAFT.png?v=721c2d7-drive-thru'},
    Q000044:{scene:'car-wash',label:'Car Wash',src:'/assets/images/dv03/layers/DV03-L7-CAR-WASH-BACKGROUND-DRAFT.png?v=e83616b-car-wash'},
    Q000046:{scene:'gas-station',label:'Gas Station',src:'/assets/images/dv03/layers/DV03-L8-GAS-STATION-BACKGROUND-DRAFT.png'}
  });

  const numberOr=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
  const displayOrderOf=award=>numberOr(award?.quest?.display_order ?? award?.display_order,Number.POSITIVE_INFINITY);
  const xpOf=award=>numberOr(award?.xp_awarded ?? award?.xp,0);
  const questKeyOf=award=>String(award?.quest_key ?? award?.quest?.quest_key ?? '');
  const awardedAtOf=award=>{const time=Date.parse(award?.awarded_at||'');return Number.isFinite(time)?time:0};
  const sceneryFor=award=>SCENERY_BY_QUEST[questKeyOf(award)]||null;

  function comparePriority(a,b){
    const display=displayOrderOf(a)-displayOrderOf(b);
    if(display!==0)return display;
    const xp=xpOf(b)-xpOf(a);
    if(xp!==0)return xp;
    return questKeyOf(a).localeCompare(questKeyOf(b));
  }

  function rankAwards(awards){return [...(awards||[])].sort(comparePriority)}

  function selectFeaturedAward(awards){return rankAwards(awards)[0]||null}

  function selectPersistentSceneryAward(awards,driverId=null){
    return [...(awards||[])]
      .filter(award=>(!driverId||award?.driver_id===driverId)&&!!sceneryFor(award))
      .sort((a,b)=>awardedAtOf(b)-awardedAtOf(a)||comparePriority(a,b))[0]||null;
  }

  function localHour(timeZone,now=new Date()){
    const zone=timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
      const hour=Number(parts.find(part=>part.type==='hour')?.value);
      return Number.isFinite(hour)?hour:now.getHours();
    }catch(_){return now.getHours()}
  }

  function skyFor(timeZone,now=new Date()){
    const hour=localHour(timeZone,now);
    return hour>=NIGHT_START_HOUR||hour<DAY_START_HOUR?'night':'day';
  }

  function resolvePresentation({awards=[],driverId=null,featuredAwards=[],timeZone=null,now=new Date()}={}){
    const persistentAward=selectPersistentSceneryAward(awards,driverId);
    const persistentScenery=sceneryFor(persistentAward);
    const featuredAward=selectFeaturedAward(featuredAwards);
    const featuredScenery=sceneryFor(featuredAward);
    const featuredMode=featuredAward?(featuredScenery?'scenery':'billboard'):null;
    return Object.freeze({
      sky:skyFor(timeZone,now),
      persistentAward,
      persistentScenery,
      featuredAward,
      featuredScenery,
      featuredMode,
      activeScenery:featuredScenery||persistentScenery,
      showBillboard:featuredMode==='billboard'||(!featuredAward&&!persistentScenery)
    });
  }

  const api=Object.freeze({DAY_START_HOUR,NIGHT_START_HOUR,SCENERY_BY_QUEST,displayOrderOf,xpOf,questKeyOf,sceneryFor,comparePriority,rankAwards,selectFeaturedAward,selectPersistentSceneryAward,localHour,skyFor,resolvePresentation});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.DV03_PRESENTATION_RULES=api;
})();

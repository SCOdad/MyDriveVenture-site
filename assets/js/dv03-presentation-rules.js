(() => {
  const DAY_START_HOUR = 6;
  const NIGHT_START_HOUR = 18;
  const DEFAULT_SCENERY = null;
  const SCENERY_BY_QUEST = Object.freeze({
    Q000017:{scene:'snack-run',label:'Snack Run',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L06-SNACK-RUN.png?v=56aafef-snack-run'},
    Q000035:{scene:'park',label:'Park',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L01-PARK.png'},
    Q000036:{scene:'school',label:'School',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L02-SCHOOL.png'},
    Q000037:{scene:'home',label:'Home',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L03-HOME.png'},
    Q000038:{scene:'grocery-store',label:'Grocery Store',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L04-GROCERY-STORE.png'},
    Q000039:{scene:'library',label:'Library',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L05-LIBRARY.png?v=721c2d7-library'},
    Q000043:{scene:'drive-thru',label:'Drive Thru',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L07-DRIVE-THRU.png?v=721c2d7-drive-thru'},
    Q000044:{scene:'car-wash',label:'Car Wash',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L08-CAR-WASH.png?v=e83616b-car-wash'},
    Q000046:{scene:'gas-station',label:'Gas Station',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L09-GAS-STATION.png'},
    Q000086:{scene:'shopping-center',label:'Shopping Center',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L10-SHOPPING-CENTER.png'},
    Q000087:{scene:'coffee-shop',label:'Coffee Shop',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L11-COFFEE-SHOP.png'},
    Q000088:{scene:'salon-barber',label:'Salon / Barber',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L12-SALON-BARBER.png'},
    Q000089:{scene:'salon-barber',label:'Salon / Barber',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L12-SALON-BARBER.png'},
    Q000090:{scene:'movie-theater',label:'Movie Theater',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L13-MOVIE-THEATER.png'},
    Q000091:{scene:'wrestling-training-center',label:'Wrestling Training Center',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L14-WRESTLING-TRAINING-CENTER.png'},
    Q000092:{scene:'karate-dojo',label:'Karate Dojo',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L15-KARATE-DOJO.png'},
    Q000093:{scene:'pizzeria',label:'Pizzeria',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L16-PIZZERIA.png'},
    Q000094:{scene:'sushi-restaurant',label:'Sushi Restaurant',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L17-SUSHI-RESTAURANT.png'},
    Q000095:{scene:'ice-cream-shop',label:'Ice Cream Shop',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L18-ICE-CREAM-SHOP.png'},
    Q000097:{scene:'airport',label:'Airport',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L20-AIRPORT.png'}
  });

  let themeCalendarState={loaded:false,exists:false,version:0,rules:[]};
  let themeCalendarPromise=null;
  const DETROIT_TZ='America/Detroit';
  function localDateKey(timeZone,now=new Date()){
    let zone=timeZone||DETROIT_TZ;
    const partsFor=z=>new Intl.DateTimeFormat('en-US',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    try{const p=partsFor(zone),get=k=>p.find(x=>x.type===k)?.value;return `${get('year')}-${get('month')}-${get('day')}`}
    catch(_){const p=partsFor(DETROIT_TZ),get=k=>p.find(x=>x.type===k)?.value;return `${get('year')}-${get('month')}-${get('day')}`}
  }
  function setThemeCalendar(config){
    themeCalendarState={loaded:config?.ok===true,exists:config?.exists===true,version:Number(config?.version)||0,rules:Array.isArray(config?.rules)?config.rules:[]};
    return themeCalendarState;
  }
  async function loadThemeCalendar(client){
    if(themeCalendarPromise)return themeCalendarPromise;
    if(!client?.functions?.invoke){setThemeCalendar({ok:false});return false}
    themeCalendarPromise=(async()=>{
      try{
        const {data,error}=await client.functions.invoke('dv03-theme-calendar',{method:'GET'});
        if(error||!data?.ok)throw error||new Error('Theme Calendar unavailable');
        setThemeCalendar(data);return true;
      }catch(_){setThemeCalendar({ok:false});return false}
      finally{if(!themeCalendarState.loaded)themeCalendarPromise=null}
    })();
    return themeCalendarPromise;
  }
  function resolveTheme(timeZone=null,now=new Date()){
    if(!themeCalendarState.loaded||!themeCalendarState.exists||!window.DV_THEME_CALENDAR)return 'normal';
    const date=localDateKey(timeZone,now),year=Number(date.slice(0,4));
    try{
      const calendar=window.DV_THEME_CALENDAR.resolveCalendar(year,themeCalendarState.rules);
      return calendar.valid?window.DV_THEME_CALENDAR.themeForDate(year,themeCalendarState.rules,date):'normal';
    }catch(_){return 'normal'}
  }
  function themeVariant(scenery,award,theme){
    if(!scenery||!theme||theme==='normal')return scenery;
    const questKey=questKeyOf(award),assets=window.DV03_VISUAL_ASSET_REGISTRY?.assets||[];
    const variant=assets.find(asset=>asset.layer==='background'&&asset.theme===theme&&asset.kind==='image'&&asset.src&&(asset.questKeys||[]).includes(questKey));
    return variant?Object.freeze({...scenery,src:variant.src,theme}):scenery;
  }
  function nightSkyForTheme(theme){
    const assets=window.DV03_VISUAL_ASSET_REGISTRY?.assets||[];
    const themed=assets.find(asset=>asset.layer==='sky'&&asset.theme===theme&&asset.kind==='image'&&asset.src);
    const base=assets.find(asset=>asset.layer==='sky'&&asset.theme==='normal'&&asset.kind==='image'&&asset.src);
    return themed?.src||base?.src||null;
  }

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

  function sceneryAvailableForSky(scenery){return !!scenery}

  function firstAvailableScenery(sceneryList,skyMode){
    return (sceneryList||[]).find(scenery=>sceneryAvailableForSky(scenery,skyMode))||DEFAULT_SCENERY;
  }

  function resolvePresentation({awards=[],driverId=null,featuredAwards=[],timeZone=null,now=new Date(),skyMode=null,themeOverride=null}={}){
    const sky=skyMode||skyFor(timeZone,now),theme=themeOverride||resolveTheme(timeZone,now);
    const persistentAward=selectPersistentSceneryAward(awards,driverId);
    const persistentScenery=themeVariant(sceneryFor(persistentAward),persistentAward,theme);
    const featuredAward=selectFeaturedAward(featuredAwards);
    const featuredScenery=themeVariant(sceneryFor(featuredAward),featuredAward,theme);
    const activeScenery=firstAvailableScenery([featuredScenery,persistentScenery],sky);
    const featuredMode=featuredAward?(activeScenery&&activeScenery===featuredScenery?'scenery':'billboard'):null;
    return Object.freeze({
      sky,
      theme,
      persistentAward,
      persistentScenery,
      featuredAward,
      featuredScenery,
      featuredMode,
      activeScenery,
      showBillboard:featuredMode==='billboard'||(!featuredAward&&!activeScenery)
    });
  }

  const api=Object.freeze({DAY_START_HOUR,NIGHT_START_HOUR,DEFAULT_SCENERY,SCENERY_BY_QUEST,displayOrderOf,xpOf,questKeyOf,sceneryFor,comparePriority,rankAwards,selectFeaturedAward,selectPersistentSceneryAward,localHour,skyFor,sceneryAvailableForSky,firstAvailableScenery,localDateKey,setThemeCalendar,loadThemeCalendar,resolveTheme,themeVariant,nightSkyForTheme,resolvePresentation});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.DV03_PRESENTATION_RULES=api;
})();

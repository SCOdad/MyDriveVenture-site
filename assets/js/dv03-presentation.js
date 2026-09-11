/* Presentation-only policy over the canonical dashboard award ledger. */
((root) => {
  const base='/assets/images/dv03/layers/';
  const SCENERY=Object.freeze({
    Q000035:{key:'park',src:base+'park.png'},
    Q000036:{key:'school',src:base+'DV03-L2-SCHOOL-BACKGROUND-DRAFT.png'},
    Q000038:{key:'grocery-store',src:base+'DV03-L4-GROCERY-STORE-BACKGROUND-DRAFT.png'},
    Q000039:{key:'library',src:base+'DV03-L5-LIBRARY-BACKGROUND-DRAFT.png?v=721c2d7-library'},
    Q000017:{key:'snack-run',src:base+'DV03-L6-SNACK-RUN-BACKGROUND-DRAFT.png?v=56aafef-snack-run'},
    Q000043:{key:'drive-thru',src:base+'DV03-L7-DRIVE-THRU-BACKGROUND-DRAFT.png?v=721c2d7-drive-thru'},
    Q000044:{key:'car-wash',src:base+'DV03-L7-CAR-WASH-BACKGROUND-DRAFT.png?v=e83616b-car-wash'},
    Q000046:{key:'gas-station',src:base+'DV03-L8-GAS-STATION-BACKGROUND-DRAFT.png'}
  });
  const numeric=(value,fallback)=>value==null||value===''||!Number.isFinite(Number(value))?fallback:Number(value);
  const lexical=(a,b)=>String(a||'')<String(b||'')?-1:String(a||'')>String(b||'')?1:0;
  // Existing canonical evaluator: ORDER BY display_order, quest_key (ascending).
  function compareFeatured(a,b){
    return numeric(a.quest?.display_order??a.display_order,Infinity)-numeric(b.quest?.display_order??b.display_order,Infinity)||
      numeric(b.xp_awarded??b.xp,0)-numeric(a.xp_awarded??a.xp,0)||lexical(a.quest_key,b.quest_key);
  }
  function persistentAward(awards,driverId){
    return awards.filter(a=>a.driver_id===driverId&&SCENERY[a.quest_key]&&Number.isFinite(Date.parse(a.awarded_at)))
      .sort((a,b)=>Date.parse(b.awarded_at)-Date.parse(a.awarded_at)||compareFeatured(a,b)||lexical(a.id,b.id))[0]||null;
  }
  function resolve({awards=[],driverId,newAwards=[]}){
    const persistent=persistentAward(awards,driverId);
    const featured=newAwards.filter(a=>a.driver_id===driverId).slice().sort(compareFeatured)[0]||null;
    const scenery=SCENERY[featured?.quest_key]||SCENERY[persistent?.quest_key]||null;
    return {persistent,featured,scenery,showBillboard:featured?!SCENERY[featured.quest_key]:!persistent};
  }
  // Visual day/night only: 06:00–18:00 in the driver's configured time zone.
  // Does not use or modify the separate legal night/XP classification rules.
  function skyAt(now=new Date(),timezone){
    let hour;
    try{hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:timezone||undefined,hour:'numeric',hourCycle:'h23'}).format(now))}
    catch(_){hour=now.getHours()}
    return hour>=6&&hour<18?'day':'night';
  }
  const api=Object.freeze({SCENERY,FEATURED_MS:12000,compareFeatured,persistentAward,resolve,skyAt});
  root.DV03_PRESENTATION=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);

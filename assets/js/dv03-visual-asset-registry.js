(() => {
  const THEMES = Object.freeze([
    {id:'normal',label:'BASE',level:'fallback'},
    {id:'halloween',label:'Halloween',level:'holiday'},
    {id:'autumn',label:'Autumn',level:'season'},
    {id:'thanksgiving',label:'Thanksgiving',level:'holiday',future:true},
    {id:'winter',label:'Winter',level:'season',future:true},
    {id:'christmas',label:'Christmas',level:'holiday',future:true},
    {id:'valentines',label:"Valentine's Day",level:'holiday',future:true},
    {id:'st-patricks',label:"St. Patrick's Day",level:'holiday',future:true},
    {id:'spring',label:'Spring',level:'season',future:true},
    {id:'patriotic',label:'Patriotic',level:'season',future:true}
  ]);

  const LAYERS = Object.freeze([
    {id:'sky',label:'Sky / Atmosphere',order:10},
    {id:'background',label:'Background',order:20},
    {id:'road',label:'Road / Surface',order:30},
    {id:'precipitation',label:'Precipitation / Atmosphere',order:35},
    {id:'sign',label:'Sign',order:40},
    {id:'cockpit',label:'Cockpit',order:50},
    {id:'hud',label:'HUD',order:60},
    {id:'hero',label:'Hero',order:70}
  ]);

  const DESTINATIONS = Object.freeze([
    {slot:'L01',slug:'park',name:'Park',questKeys:['Q000035']},
    {slot:'L02',slug:'school',name:'School',questKeys:['Q000036']},
    {slot:'L03',slug:'home',name:'Home',questKeys:['Q000037']},
    {slot:'L04',slug:'grocery-store',name:'Grocery Store',questKeys:['Q000038']},
    {slot:'L05',slug:'library',name:'Library',questKeys:['Q000039']},
    {slot:'L06',slug:'snack-run',name:'Snack Run',questKeys:['Q000017']},
    {slot:'L07',slug:'drive-thru',name:'Drive-Thru',questKeys:['Q000043']},
    {slot:'L08',slug:'car-wash',name:'Car Wash',questKeys:['Q000044']},
    {slot:'L09',slug:'gas-station',name:'Gas Station',questKeys:['Q000046']},
    {slot:'L10',slug:'shopping-center',name:'Shopping Center',questKeys:['Q000086']},
    {slot:'L11',slug:'coffee-shop',name:'Coffee Shop',questKeys:['Q000087']},
    {slot:'L12',slug:'salon-barber',name:'Salon / Barber',questKeys:['Q000088','Q000089']},
    {slot:'L13',slug:'movie-theater',name:'Movie Theater',questKeys:['Q000090']},
    {slot:'L14',slug:'wrestling-training-center',name:'Wrestling Training Center',questKeys:['Q000091']},
    {slot:'L15',slug:'karate-dojo',name:'Karate Dojo',questKeys:['Q000092']},
    {slot:'L16',slug:'pizzeria',name:'Pizzeria',questKeys:['Q000093']},
    {slot:'L17',slug:'sushi-restaurant',name:'Sushi Restaurant',questKeys:['Q000094']},
    {slot:'L18',slug:'ice-cream-shop',name:'Ice Cream Shop',questKeys:['Q000095']},
    {slot:'L19',slug:'taco-shop',name:'Taco Shop',questKeys:['Q000096']},
    {slot:'L20',slug:'airport',name:'Airport',questKeys:['Q000097']}
  ]);

  const BACKGROUND_THEMES = Object.freeze([
    {id:'normal',fileTheme:'BASE',status:'Approved / Locked'},
    {id:'autumn',fileTheme:'AUTUMN',status:'Approved / Locked'},
    {id:'halloween',fileTheme:'HALLOWEEN',status:'UAT Canary'}
  ]);

  const upperSlug = slug => slug.toUpperCase();
  const idSlug = slug => slug.toUpperCase().replace(/[^A-Z0-9]+/g,'-');
  const statusFor = (theme, destination) => destination.questKeys.length ? theme.status : 'Deployed / Not connected';
  const fileFor = (theme, destination) => `DV03-BACKGROUND-${theme.fileTheme}-${destination.slot}-${upperSlug(destination.slug)}.png`;
  const srcFor = file => `/assets/images/dv03/layers/${file}`;
  const backgroundAsset = (theme, destination) => {
    const baseId = `DV-UX-DV03-BACKGROUND-${idSlug(destination.slug)}`;
    const assetId = theme.id === 'normal' ? baseId : `${baseId}-${theme.id.toUpperCase()}`;
    const file = fileFor(theme, destination);
    return {
      assetId,
      name:destination.name,
      layer:'background',
      theme:theme.id,
      status:statusFor(theme, destination),
      kind:'image',
      src:srcFor(file),
      file,
      dimensions:'1672x941',
      aspect:'1672:941 (~16:9)',
      background:'Transparent sky / opaque environment',
      locked:true,
      slot:destination.slot,
      destinationKey:destination.slug,
      questKeys:Object.freeze([...destination.questKeys]),
      ...(theme.id === 'normal' ? {} : {parentAssetId:baseId, baseAssetId:baseId}),
      notes:destination.questKeys.length ? 'Quest mapping stores keys only; current names resolve from live quest_definitions.' : 'Deployed background has no registered live quest mapping yet.',
      composer:{fit:'cover'}
    };
  };

  const backgroundAssets = BACKGROUND_THEMES.flatMap(theme => DESTINATIONS
    .map(destination => backgroundAsset(theme,destination)));

  const assets = [
    {assetId:'DV-UX-DV03-SKY-DAY-CODE',name:'Day / Neutral Sky',layer:'sky',theme:'normal',status:'Runtime / Code-native',kind:'code',notes:'Current default day sky treatment. No standalone canonical image yet.',composer:{type:'sky-day'}},
    {assetId:'DV-UX-DV03-SKY-NIGHT',name:'Night Sky / Full Moon',layer:'sky',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-SKY-BASE-NIGHT-MOON-FULL.png',file:'DV03-SKY-BASE-NIGHT-MOON-FULL.png',dimensions:'1672x941',aspect:'1672:941 (~16:9)',background:'Opaque sky',locked:true,parentAssetIds:['DV-UX-DV03-COCKPIT-SCENE'],notes:'Canonical night sky; distinctive moon/cloud content constrained to upper 40%.',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-SKY-NIGHT-CRESCENT',name:'Night Sky / Crescent Moon',layer:'sky',theme:'normal',status:'Deployed / Variant',kind:'image',src:'/assets/images/dv03/layers/DV03-SKY-BASE-NIGHT-MOON-CRESCENT.png',file:'DV03-SKY-BASE-NIGHT-MOON-CRESCENT.png',dimensions:'1672x941',aspect:'1672:941 (~16:9)',background:'Opaque sky',locked:true,baseAssetId:'DV-UX-DV03-SKY-NIGHT',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-SKY-NIGHT-NEW',name:'Night Sky / New Moon',layer:'sky',theme:'normal',status:'Deployed / Variant',kind:'image',src:'/assets/images/dv03/layers/DV03-SKY-BASE-NIGHT-MOON-NEW.png',file:'DV03-SKY-BASE-NIGHT-MOON-NEW.png',dimensions:'1672x941',aspect:'1672:941 (~16:9)',background:'Opaque sky',locked:true,baseAssetId:'DV-UX-DV03-SKY-NIGHT',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-SKY-NIGHT-QUARTER',name:'Night Sky / Quarter Moon',layer:'sky',theme:'normal',status:'Deployed / Variant',kind:'image',src:'/assets/images/dv03/layers/DV03-SKY-BASE-NIGHT-MOON-QUARTER.png',file:'DV03-SKY-BASE-NIGHT-MOON-QUARTER.png',dimensions:'1672x941',aspect:'1672:941 (~16:9)',background:'Opaque sky',locked:true,baseAssetId:'DV-UX-DV03-SKY-NIGHT',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-SKY-HALLOWEEN-WITCH',name:'Halloween Night Sky / Witch',layer:'sky',theme:'halloween',status:'Deployed / Variant',kind:'image',src:'/assets/images/dv03/layers/DV03-SKY-HALLOWEEN-NIGHT-WITCH.png',file:'DV03-SKY-HALLOWEEN-NIGHT-WITCH.png',dimensions:'1672x941',aspect:'1672:941 (~16:9)',background:'Opaque sky',locked:true,baseAssetId:'DV-UX-DV03-SKY-NIGHT',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-SKY-CHRISTMAS-SANTA',name:'Christmas Night Sky / Santa',layer:'sky',theme:'christmas',status:'Deployed / Variant',kind:'image',src:'/assets/images/dv03/layers/DV03-SKY-CHRISTMAS-NIGHT-SANTA.png',file:'DV03-SKY-CHRISTMAS-NIGHT-SANTA.png',dimensions:'1672x941',aspect:'1672:941 (~16:9)',background:'Opaque sky',locked:true,baseAssetId:'DV-UX-DV03-SKY-NIGHT',composer:{fit:'cover'}},
    ...backgroundAssets,
    {assetId:'DV-UX-DV03-MILESTONE-SIGN',name:'License Milestone Road Sign',layer:'sign',theme:'normal',status:'Approved / Code-native',kind:'code',background:'Transparent world element',locked:true,notes:'Code-native green milestone sign; rendered as a DOM reference in the composer.',composer:{type:'milestone-sign'}},
    {assetId:'DV-UX-DV03-COCKPIT-FRAME',name:'DV03 Cockpit Frame',layer:'cockpit',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/cockpit/cockpit-frame.png',file:'cockpit-frame.png',aspect:'3:2 master; responsive stretch within windshield',background:'Transparent',locked:true,composer:{fit:'fill'}},
    {assetId:'DV-UX-DV03-HUD',name:'DV03 HUD',layer:'hud',theme:'normal',status:'Runtime / Code-native',kind:'code',notes:'HUD is code/UI and is intentionally not baked into scenery.',composer:{type:'hud'}},
    {assetId:'DV-CHAR-PARKER-DV03-HERO',name:'Parker Seated Hero',layer:'hero',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/hero/parker-seated.png',file:'parker-seated.png',background:'Transparent',locked:true,seasonal:false,notes:'Hero identity is never seasonally modified. Custom driver Heroes follow the same rule.',composer:{type:'hero',fit:'contain'}}
  ];

  const byLayer = layer => assets.filter(asset => asset.layer === layer);
  const byTheme = theme => assets.filter(asset => asset.theme === theme);
  const find = assetId => assets.find(asset => asset.assetId === assetId) || null;
  const questKeys = () => [...new Set(assets.flatMap(asset => asset.questKeys || []))].sort();

  window.DV03_VISUAL_ASSET_REGISTRY = Object.freeze({
    precedence:Object.freeze(['holiday','season','fallback']),
    themes:THEMES,
    layers:LAYERS,
    destinations:DESTINATIONS,
    assets:Object.freeze(assets.map(asset=>Object.freeze(asset))),
    byLayer,
    byTheme,
    find,
    questKeys
  });
})();

(() => {
  const THEMES = Object.freeze([
    {id:'normal',label:'Normal',level:'fallback'},
    {id:'halloween',label:'Halloween',level:'holiday'},
    {id:'autumn',label:'Autumn',level:'season',future:true},
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

  const assets = [
    {assetId:'DV-UX-DV03-SKY-DAY-CODE',name:'Day / Neutral Sky',layer:'sky',theme:'normal',status:'Runtime / Code-native',kind:'code',notes:'Current default day sky treatment. No standalone canonical image yet.',composer:{type:'sky-day'}},
    {assetId:'DV-UX-DV03-SKY-NIGHT',name:'Night Sky',layer:'sky',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV-UX-DV03-SKY-NIGHT.png',file:'DV-UX-DV03-SKY-NIGHT.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Opaque sky',locked:true,parentAssetIds:['DV-UX-DV03-COCKPIT-SCENE'],notes:'Canonical night sky; distinctive moon/cloud content constrained to upper 40%.',composer:{fit:'cover'}},

    {assetId:'DV-UX-DV03-BACKGROUND-PARK',name:'Park',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L01-PARK.png',file:'DV03-BACKGROUND-BASE-L01-PARK.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L1',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-PARK-HALLOWEEN',name:'Park',layer:'background',theme:'halloween',status:'UAT Canary',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-HALLOWEEN-L01-PARK.png',file:'DV03-BACKGROUND-HALLOWEEN-L01-PARK.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L1',parentAssetId:'DV-UX-DV03-BACKGROUND-PARK',notes:'Standalone Halloween Park background. Canonical BASE Park remains unchanged.',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-SCHOOL',name:'School',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L02-SCHOOL.png',file:'DV03-BACKGROUND-BASE-L02-SCHOOL.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L2',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-GROCERY-STORE',name:'Grocery Store',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L04-GROCERY-STORE.png',file:'DV03-BACKGROUND-BASE-L04-GROCERY-STORE.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L4',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-LIBRARY',name:'Library',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L05-LIBRARY.png',file:'DV03-BACKGROUND-BASE-L05-LIBRARY.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L5',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-SNACK-RUN',name:'Snack Run',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L06-SNACK-RUN.png',file:'DV03-BACKGROUND-BASE-L06-SNACK-RUN.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L6',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-DRIVE-THRU',name:'Drive-Thru',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L07-DRIVE-THRU.png',file:'DV03-BACKGROUND-BASE-L07-DRIVE-THRU.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L7',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-CAR-WASH',name:'Car Wash',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L08-CAR-WASH.png',file:'DV03-BACKGROUND-BASE-L08-CAR-WASH.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L8',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-GAS-STATION',name:'Gas Station',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L09-GAS-STATION.png',file:'DV03-BACKGROUND-BASE-L09-GAS-STATION.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L9',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-SHOPPING-CENTER',name:'Shopping Center',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L10-SHOPPING-CENTER.png',file:'DV03-BACKGROUND-BASE-L10-SHOPPING-CENTER.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L10',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-COFFEE-SHOP',name:'Coffee Shop',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L11-COFFEE-SHOP.png',file:'DV03-BACKGROUND-BASE-L11-COFFEE-SHOP.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L11',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-SALON-BARBER',name:'Salon / Barber',layer:'background',theme:'normal',status:'Final / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L12-SALON-BARBER.png',file:'DV03-BACKGROUND-BASE-L12-SALON-BARBER.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L12',composer:{fit:'cover'}},
    {assetId:'DV-UX-DV03-BACKGROUND-MOVIE-THEATER',name:'Movie Theater',layer:'background',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/layers/DV03-BACKGROUND-BASE-L13-MOVIE-THEATER.png',file:'DV03-BACKGROUND-BASE-L13-MOVIE-THEATER.png',dimensions:'1672×941',aspect:'1672:941 (~16:9)',background:'Transparent sky / opaque environment',locked:true,slot:'L13',composer:{fit:'cover'}},



    {assetId:'DV-UX-DV03-MILESTONE-SIGN',name:'License Milestone Road Sign',layer:'sign',theme:'normal',status:'Approved / Code-native',kind:'code',background:'Transparent world element',locked:true,notes:'Code-native green milestone sign; rendered as a DOM reference in the composer.',composer:{type:'milestone-sign'}},

    {assetId:'DV-UX-DV03-COCKPIT-FRAME',name:'DV03 Cockpit Frame',layer:'cockpit',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/cockpit/cockpit-frame.png',file:'cockpit-frame.png',aspect:'3:2 master; responsive stretch within windshield',background:'Transparent',locked:true,composer:{fit:'fill'}},

    {assetId:'DV-UX-DV03-HUD',name:'DV03 HUD',layer:'hud',theme:'normal',status:'Runtime / Code-native',kind:'code',notes:'HUD is code/UI and is intentionally not baked into scenery.',composer:{type:'hud'}},

    {assetId:'DV-CHAR-PARKER-DV03-HERO',name:'Parker Seated Hero',layer:'hero',theme:'normal',status:'Approved / Locked',kind:'image',src:'/assets/images/dv03/hero/parker-seated.png',file:'parker-seated.png',background:'Transparent',locked:true,seasonal:false,notes:'Hero identity is never seasonally modified. Custom driver Heroes follow the same rule.',composer:{type:'hero',fit:'contain'}}
  ];

  const byLayer = layer => assets.filter(asset => asset.layer === layer);
  const byTheme = theme => assets.filter(asset => asset.theme === theme);
  const find = assetId => assets.find(asset => asset.assetId === assetId) || null;

  window.DV03_VISUAL_ASSET_REGISTRY = Object.freeze({
    precedence:Object.freeze(['holiday','season','fallback']),
    themes:THEMES,
    layers:LAYERS,
    assets:Object.freeze(assets.map(asset=>Object.freeze(asset))),
    byLayer,
    byTheme,
    find
  });
})();
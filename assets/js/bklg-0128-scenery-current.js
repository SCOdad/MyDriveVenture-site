(() => {
  const CURRENT = [
    {value:'school',sortKey:'03-BACKGROUND-SCHOOL',id:'L2-FINAL',name:'School Background',file:'DV03-L2-SCHOOL-BACKGROUND.png'},
    {value:'grocery-store',sortKey:'03-BACKGROUND-GROCERY-STORE',id:'L4-FINAL',name:'Grocery Store Background',file:'DV03-L4-GROCERY-STORE-BACKGROUND.png'},
    {value:'library',sortKey:'03-BACKGROUND-LIBRARY',id:'L5-FINAL',name:'Library Background',file:'DV03-L5-LIBRARY-BACKGROUND.png',version:'721c2d7-library'},
    {value:'snack-run',sortKey:'03-BACKGROUND-SNACK-RUN',id:'L6-FINAL',name:'Snack Run Background',file:'DV03-L6-SNACK-RUN-BACKGROUND.png',version:'56aafef-snack-run'},
    {value:'drive-thru',sortKey:'03-BACKGROUND-DRIVE-THRU',id:'L7-FINAL',name:'Drive Thru Background',file:'DV03-L7-DRIVE-THRU-BACKGROUND.png',version:'721c2d7-drive-thru'},
    {value:'car-wash',sortKey:'03-BACKGROUND-CAR-WASH',id:'L8-FINAL',name:'Car Wash Background',file:'DV03-L8-CAR-WASH-BACKGROUND.png',version:'e83616b-car-wash'},
    {value:'gas-station',sortKey:'03-BACKGROUND-GAS-STATION',id:'L9-FINAL',name:'Gas Station Background',file:'DV03-L9-GAS-STATION-BACKGROUND.png'},
    {value:'shopping-center',sortKey:'03-BACKGROUND-SHOPPING-CENTER',id:'L10-FINAL',name:'Shopping Center Background',file:'DV03-L10-SHOPPING-CENTER-BACKGROUND.png'},
    {value:'coffee-shop',sortKey:'03-BACKGROUND-COFFEE-SHOP',id:'L11-FINAL',name:'Coffee Shop Background',file:'DV03-L11-COFFEE-SHOP-BACKGROUND.png'},
    {value:'salon-barber',sortKey:'03-BACKGROUND-SALON-BARBER',id:'L12-FINAL',name:'Salon / Barber Background',file:'DV03-L12-SALON-BARBER.png'},
    {value:'movie-theater',sortKey:'03-BACKGROUND-MOVIE-THEATER',id:'L13-FINAL',name:'Movie Theater Background',file:'DV03-L13-MOVIE-THEATER-BACKGROUND.png'}
  ];
  const srcFor=item=>`/assets/images/dv03/layers/${item.file}${item.version?`?v=${item.version}`:''}`;

  if(document.documentElement.dataset.dvRoute==='bklg0128uat'){
    const apply=()=>{
      const api=window.DV_BKLG_0128_UAT;
      const background=api?.LAYERS?.find(layer=>layer.id==='background');
      if(!background)return false;
      CURRENT.forEach(item=>{
        let option=background.options.find(candidate=>candidate.value===item.value);
        if(!option){option={value:item.value,label:item.name.replace(' Background',''),sortKey:item.sortKey,src:srcFor(item)};background.options.push(option);}
        option.label=item.name.replace(' Background','');option.sortKey=item.sortKey;option.src=srcFor(item);delete option.draft;
      });
      background.options.sort((a,b)=>(a.sortKey||a.value).localeCompare(b.sortKey||b.value));
      api.applyLayers?.();
      return true;
    };
    if(!apply())setTimeout(apply,0);
  }

  if(document.documentElement.dataset.dvRoute==='bklg0128gallery'){
    const api=window.DV_BKLG_0128_GALLERY;
    if(api?.ASSETS){
      CURRENT.forEach(item=>{
        let asset=api.ASSETS.find(candidate=>candidate.sortKey===item.sortKey);
        if(!asset){asset={sortKey:item.sortKey};api.ASSETS.push(asset);}
        asset.id=item.id;asset.name=item.name;asset.file=item.file;asset.src=srcFor(item);asset.status='Final / Locked';
      });
      api.ASSETS.sort((a,b)=>a.sortKey.localeCompare(b.sortKey));
    }
  }
})();
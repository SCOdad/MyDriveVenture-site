(() => {
  const CURRENT = [
    {value:'school',sortKey:'03-BACKGROUND-SCHOOL',id:'L2-FINAL',name:'School Background',file:'DV03-L2-SCHOOL-BACKGROUND.png'},
    {value:'grocery-store',sortKey:'03-BACKGROUND-GROCERY-STORE',id:'L4-FINAL',name:'Grocery Store Background',file:'DV03-L4-GROCERY-STORE-BACKGROUND.png'},
    {value:'library',sortKey:'03-BACKGROUND-LIBRARY',id:'L5-FINAL',name:'Library Background',file:'DV03-L5-LIBRARY-BACKGROUND.png',version:'721c2d7-library'},
    {value:'snack-run',sortKey:'03-BACKGROUND-SNACK-RUN',id:'L6-FINAL',name:'Snack Run Background',file:'DV03-L6-SNACK-RUN-BACKGROUND.png',version:'56aafef-snack-run'},
    {value:'drive-thru',sortKey:'03-BACKGROUND-DRIVE-THRU',id:'L7-FINAL',name:'Drive Thru Background',file:'DV03-L7-DRIVE-THRU-BACKGROUND.png',version:'721c2d7-drive-thru'},
    {value:'car-wash',sortKey:'03-BACKGROUND-CAR-WASH',id:'L8-FINAL',name:'Car Wash Background',file:'DV03-L8-CAR-WASH-BACKGROUND.png',version:'e83616b-car-wash'},
    {value:'gas-station',sortKey:'03-BACKGROUND-GAS-STATION',id:'L9-FINAL',name:'Gas Station Background',file:'DV03-L9-GAS-STATION-BACKGROUND.png'}
  ];
  const srcFor=item=>`/assets/images/dv03/layers/${item.file}${item.version?`?v=${item.version}`:''}`;

  if(document.documentElement.dataset.dvRoute==='bklg0128uat'){
    const apply=()=>{
      const api=window.DV_BKLG_0128_UAT;
      const background=api?.LAYERS?.find(layer=>layer.id==='background');
      if(!background)return false;
      CURRENT.forEach(item=>{
        const option=background.options.find(candidate=>candidate.value===item.value);
        if(option){option.label=item.name.replace(' Background','');option.sortKey=item.sortKey;option.src=srcFor(item);delete option.draft;}
      });
      api.applyLayers?.();
      return true;
    };
    if(!apply())setTimeout(apply,0);
  }

  if(document.documentElement.dataset.dvRoute==='bklg0128gallery'){
    const api=window.DV_BKLG_0128_GALLERY;
    if(api?.ASSETS){
      CURRENT.forEach(item=>{
        const asset=api.ASSETS.find(candidate=>candidate.sortKey===item.sortKey);
        if(asset){asset.id=item.id;asset.name=item.name;asset.file=item.file;asset.src=srcFor(item);asset.status='Final / Locked';}
      });
    }
  }
})();

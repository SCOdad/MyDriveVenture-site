(() => {
  const CURRENT = [
    {value:'school',sortKey:'03-BACKGROUND-SCHOOL',id:'L2-DRAFT',name:'School Background',file:'DV03-L2-SCHOOL-BACKGROUND-DRAFT.png'},
    {value:'grocery-store',sortKey:'03-BACKGROUND-GROCERY-STORE',id:'L4-DRAFT',name:'Grocery Store Background',file:'DV03-L4-GROCERY-STORE-BACKGROUND-DRAFT.png'},
    {value:'library',sortKey:'03-BACKGROUND-LIBRARY',id:'L5-DRAFT',name:'Library Background',file:'DV03-L5-LIBRARY-BACKGROUND-DRAFT.png',version:'721c2d7-library'},
    {value:'snack-run',sortKey:'03-BACKGROUND-SNACK-RUN',id:'L6-DRAFT',name:'Snack Run Background',file:'DV03-L6-SNACK-RUN-BACKGROUND-DRAFT.png'},
    {value:'drive-thru',sortKey:'03-BACKGROUND-DRIVE-THRU',id:'L6B-DRAFT',name:'Drive Thru Background',file:'DV03-L7-DRIVE-THRU-BACKGROUND-DRAFT.png',version:'721c2d7-drive-thru'},
    {value:'car-wash',sortKey:'03-BACKGROUND-CAR-WASH',id:'L7-DRAFT',name:'Car Wash Background',file:'DV03-L7-CAR-WASH-BACKGROUND-DRAFT.png',version:'e83616b-car-wash'},
    {value:'gas-station',sortKey:'03-BACKGROUND-GAS-STATION',id:'L8-DRAFT',name:'Gas Station Background',file:'DV03-L8-GAS-STATION-BACKGROUND-DRAFT.png'}
  ];
  const srcFor=item=>`/assets/images/dv03/layers/${item.file}${item.version?`?v=${item.version}`:''}`;

  if(document.documentElement.dataset.dvRoute==='bklg0128uat'){
    const apply=()=>{
      const api=window.DV_BKLG_0128_UAT;
      const background=api?.LAYERS?.find(layer=>layer.id==='background');
      if(!background)return false;
      CURRENT.forEach(item=>{
        const option=background.options.find(candidate=>candidate.value===item.value);
        if(option){option.label=item.name.replace(' Background','');option.sortKey=item.sortKey;option.src=srcFor(item);option.draft=true;}
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
        if(asset){asset.id=item.id;asset.name=item.name;asset.file=item.file;asset.src=srcFor(item);asset.status='Draft / UAT';}
      });
    }
  }
})();

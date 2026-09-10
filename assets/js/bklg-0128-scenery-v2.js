(() => {
  const V2 = [
    {value:'snack-run',label:'Snack Run v2',sortKey:'03-BACKGROUND-SNACK-RUN-v2',id:'L6-DRAFT-v2',name:'Snack Run Background v2',file:'DV03-L6-SNACK-RUN-BACKGROUND-DRAFT-v2.png'},
    {value:'car-wash',label:'Car Wash v2',sortKey:'03-BACKGROUND-CAR-WASH-v2',id:'L7-DRAFT-v2',name:'Car Wash Background v2',file:'DV03-L7-CAR-WASH-BACKGROUND-DRAFT-v2.png'}
  ];
  const srcFor = item => `/assets/images/dv03/layers/${item.file}`;

  if(document.documentElement.dataset.dvRoute==='bklg0128uat'){
    const apply=()=>{
      const api=window.DV_BKLG_0128_UAT;
      const background=api?.LAYERS?.find(layer=>layer.id==='background');
      if(!background)return false;
      V2.forEach(item=>{
        const option=background.options.find(candidate=>candidate.value===item.value);
        if(option){option.label=item.label;option.sortKey=item.sortKey;option.src=srcFor(item);option.draft=true;}
      });
      api.applyLayers?.();
      document.querySelectorAll('[data-layer-row="background"] .uat-option').forEach(button=>{
        const item=V2.find(candidate=>candidate.value===button.dataset.value);
        if(item)button.textContent=`${item.label} · DRAFT`;
      });
      return true;
    };
    if(!apply())setTimeout(apply,0);
  }

  if(document.documentElement.dataset.dvRoute==='bklg0128gallery'){
    const addCards=()=>{
      const grid=document.getElementById('gallery-grid');
      if(!grid||grid.querySelector('[data-v2-scenery]'))return;
      V2.forEach(item=>{
        const card=document.createElement('article');
        card.className='asset-card';card.dataset.v2Scenery='true';
        card.innerHTML=`<div class="asset-frame"><img src="${srcFor(item)}" alt="${item.name} scene asset"></div><h2>${item.sortKey} · ${item.name}</h2><div class="asset-meta"><span>Status: <code>Draft / UAT v2</code></span><span>Registry ID: <code>${item.id}</code></span><span>Source: <code>${item.file}</code></span></div>`;
        const legacy=[...grid.children].find(node=>node.querySelector('h2')?.textContent.includes(item.value==='snack-run'?'SNACK-RUN':'CAR-WASH'));
        if(legacy)legacy.after(card);else grid.prepend(card);
      });
    };
    new MutationObserver(addCards).observe(document.body,{childList:true,subtree:true});
    addCards();
  }
})();

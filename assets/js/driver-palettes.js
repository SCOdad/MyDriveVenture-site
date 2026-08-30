(() => {
  const palettes = Object.freeze([
    {id:'RED',label:'Red',shadow:'#5f1b1b',base:'#a43a3a',bright:'#e45b5b',highlight:'#ff9a8b'},
    {id:'ORANGE',label:'Orange',shadow:'#6a3216',base:'#b65b22',bright:'#ef8a34',highlight:'#ffc16a'},
    {id:'YELLOW',label:'Yellow',shadow:'#6b5516',base:'#b88e1d',bright:'#f8ba20',highlight:'#ffe37a'},
    {id:'GREEN',label:'Green',shadow:'#274c27',base:'#4f8640',bright:'#84c95f',highlight:'#c0ef8d'},
    {id:'TEAL',label:'Teal',shadow:'#174b4c',base:'#257b76',bright:'#48b9a9',highlight:'#8be4d2'},
    {id:'BLUE',label:'Blue',shadow:'#173a62',base:'#2864a1',bright:'#4a9ce6',highlight:'#9bd2ff'},
    {id:'PURPLE',label:'Purple',shadow:'#3f285f',base:'#6a4597',bright:'#9b68cf',highlight:'#d1a1f0'},
    {id:'PINK',label:'Pink',shadow:'#632844',base:'#a54169',bright:'#e76593',highlight:'#ffb0ca'},
    {id:'BROWN',label:'Brown',shadow:'#4d3524',base:'#795235',bright:'#a8784e',highlight:'#d4ab79'},
    {id:'GRAY',label:'Gray',shadow:'#353d40',base:'#586468',bright:'#859195',highlight:'#c8d0d0'},
    {id:'BLACK',label:'Black',shadow:'#0b0d0f',base:'#20272a',bright:'#414b4f',highlight:'#889397'},
    {id:'WHITE',label:'White',shadow:'#5b6160',base:'#8f9895',bright:'#d1d7d2',highlight:'#fffdf4'}
  ]);
  const byId = new Map(palettes.map(p => [p.id,p]));
  const aliases = Object.freeze({
    'SCARLET':'RED','CRIMSON':'RED','MAROON':'RED','BURGUNDY':'RED',
    'CORAL':'ORANGE','PEACH':'ORANGE','TANGERINE':'ORANGE',
    'GOLD':'YELLOW','GOLDEN':'YELLOW','MUSTARD':'YELLOW',
    'LIME':'GREEN','EMERALD':'GREEN','FOREST GREEN':'GREEN','FOREST':'GREEN','OLIVE':'GREEN',
    'SEAFOAM':'TEAL','SEA FOAM':'TEAL','AQUA':'TEAL','CYAN':'TEAL','TURQUOISE':'TEAL','MINT':'TEAL',
    'NAVY':'BLUE','NAVY BLUE':'BLUE','ROYAL BLUE':'BLUE','SKY BLUE':'BLUE','BABY BLUE':'BLUE','COBALT':'BLUE',
    'VIOLET':'PURPLE','LAVENDER':'PURPLE','PLUM':'PURPLE','INDIGO':'PURPLE',
    'ROSE':'PINK','HOT PINK':'PINK','MAGENTA':'PINK','FUCHSIA':'PINK',
    'TAN':'BROWN','BEIGE':'BROWN','CHOCOLATE':'BROWN',
    'GREY':'GRAY','SILVER':'GRAY','SLATE':'GRAY',
    'CHARCOAL':'BLACK','JET BLACK':'BLACK',
    'CREAM':'WHITE','IVORY':'WHITE','OFF WHITE':'WHITE'
  });

  const clean = value => String(value ?? '').trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ').toUpperCase();

  function normalize(value) {
    const key = clean(value);
    if (!key) return null;
    if (byId.has(key)) return key;
    if (aliases[key]) return aliases[key];
    for (const [alias,id] of Object.entries(aliases)) if (key.includes(alias)) return id;
    for (const p of palettes) if (key.includes(p.id)) return p.id;
    return null;
  }

  function resolve(value, fallbackId='YELLOW') {
    const normalized = normalize(value);
    const id = normalized || (byId.has(fallbackId) ? fallbackId : 'YELLOW');
    return {...byId.get(id), normalized, fallback: !normalized};
  }

  function apply(root, value, fallbackId='YELLOW') {
    if (!root) return resolve(value,fallbackId);
    const p = resolve(value,fallbackId);
    root.style.setProperty('--dv-driver-shadow',p.shadow);
    root.style.setProperty('--dv-driver-base',p.base);
    root.style.setProperty('--dv-driver-bright',p.bright);
    root.style.setProperty('--dv-driver-highlight',p.highlight);
    root.dataset.dvDriverColor = p.id.toLowerCase();
    return p;
  }

  function swatchMarkup(p, compact=false) {
    return `<button type="button" class="dv-palette-swatch${compact?' compact':''}" data-dv-palette-id="${p.id}" aria-pressed="false" title="${compact?'Preview ':''}${p.label}">
      <span class="dv-palette-chips" aria-hidden="true" style="--swatch-shadow:${p.shadow};--swatch-base:${p.base};--swatch-bright:${p.bright};--swatch-highlight:${p.highlight}"><i></i><i></i><i></i><i></i></span>
      ${compact?'':`<span class="dv-palette-label">${p.label}</span>`}
    </button>`;
  }

  function mountPicker(root, options={}) {
    if (!root) return null;
    const input = root.querySelector('[data-dv-palette-value]');
    const host = root.querySelector('[data-dv-palette-swatches]');
    const clear = root.querySelector('[data-dv-palette-clear]');
    if (!input || !host) return null;
    const api = {
      setValue(value) { input.value = value ?? ''; render(); },
      getValue() { return input.value || ''; },
      getNormalized() { return normalize(input.value); },
      render
    };
    function choose(id) {
      const previous = input.value || '';
      input.value = id;
      render();
      root.dispatchEvent(new CustomEvent('dv:palette-change',{bubbles:true,detail:{value:id,previous,normalized:id}}));
    }
    function render() {
      const selected = normalize(input.value);
      host.innerHTML = palettes.map(p => swatchMarkup(p,false)).join('');
      host.querySelectorAll('[data-dv-palette-id]').forEach(button => {
        const active = button.dataset.dvPaletteId === selected;
        button.classList.toggle('selected',active);
        button.setAttribute('aria-pressed',String(active));
        button.addEventListener('click',() => choose(button.dataset.dvPaletteId));
      });
      if (clear) {
        clear.hidden = options.allowEmpty === false;
        clear.textContent = selected ? 'Clear color' : (clear.dataset.emptyLabel || 'Skip for now');
      }
    }
    clear?.addEventListener('click',() => {
      const previous = input.value || '';
      input.value = '';
      render();
      root.dispatchEvent(new CustomEvent('dv:palette-change',{bubbles:true,detail:{value:'',previous,normalized:null}}));
    });
    root._dvPalettePicker = api;
    render();
    return api;
  }

  function mountAll() {
    document.querySelectorAll('[data-dv-palette-picker]').forEach(root => {
      if (!root._dvPalettePicker) mountPicker(root,{allowEmpty:root.dataset.allowEmpty!=='false'});
    });
  }

  window.DV_DRIVER_PALETTES = Object.freeze({palettes,normalize,resolve,apply,mountPicker,mountAll,swatchMarkup});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mountAll,{once:true});
  else mountAll();
})();
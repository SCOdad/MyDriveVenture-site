(() => {
  const VERSION=1;
  const STORAGE_KEY='dv:web-drive:pending-mutation:v1';
  const DEFAULT_TIMEOUT_MS=35000;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const timeoutMs=()=>{const n=Number(globalThis.__DV_DRIVE_SAVE_TIMEOUT_MS);return Number.isFinite(n)&&n>=100?n:DEFAULT_TIMEOUT_MS};
  function makePending({operation,driverId,driveId=null,sourceEventId=null,expectedRevision=null,requested,body}){
    const op=String(operation||'').toUpperCase();
    if(!['CREATE','EDIT'].includes(op))throw new Error('Unsupported pending drive operation');
    if(!driverId||!requested||!body)throw new Error('Pending drive mutation is incomplete');
    return Object.freeze({
      version:VERSION,
      operation:op,
      driver_id:String(driverId),
      drive_id:driveId?String(driveId):null,
      source_event_id:sourceEventId?String(sourceEventId):null,
      expected_revision:expectedRevision==null?null:Number(expectedRevision),
      requested:clone(requested),
      body:clone(body),
      created_at:new Date().toISOString()
    });
  }
  function validPending(value){
    if(!value||Number(value.version)!==VERSION)return false;
    if(!['CREATE','EDIT'].includes(String(value.operation||'').toUpperCase()))return false;
    if(!value.driver_id||!value.requested||!value.body)return false;
    if(value.operation==='CREATE'&&!value.source_event_id)return false;
    if(value.operation==='EDIT'&&!value.drive_id)return false;
    return true;
  }
  function load(storage=sessionStorage){
    try{const raw=storage.getItem(STORAGE_KEY);if(!raw)return null;const value=JSON.parse(raw);return validPending(value)?value:null}catch(_){return null}
  }
  function save(value,storage=sessionStorage){
    if(!validPending(value))throw new Error('Invalid pending drive mutation');
    storage.setItem(STORAGE_KEY,JSON.stringify(value));
    return value;
  }
  function clear(storage=sessionStorage){try{storage.removeItem(STORAGE_KEY)}catch(_){}}
  function editRecoveryAction({expectedRevision,currentRevision,payloadMatches}){
    if(payloadMatches)return 'ADOPT';
    const expected=Number(expectedRevision),current=Number(currentRevision);
    if(Number.isFinite(expected)&&Number.isFinite(current)&&current===expected)return 'RETRY';
    return 'CONFLICT';
  }
  function isAmbiguous(info){
    const code=String(info?.code||'').toUpperCase();
    return code==='DV_SAVE_TIMEOUT'||code==='NETWORK_UNCERTAIN'||!code;
  }
  const api=Object.freeze({VERSION,STORAGE_KEY,DEFAULT_TIMEOUT_MS,timeoutMs,makePending,validPending,load,save,clear,editRecoveryAction,isAmbiguous});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.DV_DRIVE_SAVE_RECOVERY=api;
})();
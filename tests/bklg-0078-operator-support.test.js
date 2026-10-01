const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function source(path){return fs.readFileSync(path,'utf8')}

function syntaxChecks(){
  [
    'assets/js/log-dashboard-entry-v5.js',
    'assets/js/log-avatar.js',
    'assets/js/log-operator-support.js',
    'assets/js/log-drive-rpc.js',
    'assets/js/log-drive-detail-v4.js',
    'assets/js/log-prepilot-v2.js',
    'assets/js/log-shared-actions.js',
    'assets/js/log-game-polish.js',
    'assets/js/canonical-header.js'
  ].forEach(path=>assert.doesNotThrow(()=>new vm.Script(source(path),{filename:path}),path+' must parse'));
}

function architectureChecks(){
  const operator=source('assets/js/log-operator-support.js');
  const detail=source('assets/js/log-drive-detail-v4.js');
  const dashboard=source('assets/js/log-dashboard-entry-v5.js');
  const avatar=source('assets/js/log-avatar.js');
  const driveRpc=source('assets/js/log-drive-rpc.js');
  const shared=source('assets/js/log-shared-actions.js');
  const prepilot=source('assets/js/log-prepilot-v2.js');
  const header=source('assets/js/canonical-header.js');
  const game=source('log/index.html');
  const classic=source('log/DV00/index.html');
  const config=source('log/config.js');

  const operatorScript=/log-operator-support\.js/g;
  assert.strictEqual((game.match(operatorScript)||[]).length,1,'game console must load operator support exactly once');
  assert.strictEqual((classic.match(operatorScript)||[]).length,1,'classic console must load operator support exactly once');
  assert(game.includes('data-dv-operator-support="true"'),'game operator script must be explicitly marked');
  assert(classic.includes('data-dv-operator-support="true"'),'classic operator script must be explicitly marked');
  assert(!config.includes('log-operator-support.js'),'config must not dynamically inject operator support');
  assert(!header.includes('log-operator-support.js'),'canonical header must not dynamically inject operator support');
  assert(header.includes("addEventListener('dv:dashboard-rendered'"),'log header should consume dashboard render state');
  assert(header.includes('applyDashboardModel'),'log header must reuse the dashboard model instead of refetching it');
  assert(!header.includes("dv:dashboard-rendered',()=>hydrate"),'driver render must not trigger header dashboard hydration');

  assert(operator.includes('operator-support-host'),'operator support must use the stable operator host');
  assert(!operator.includes("name==='drive-ops'&&body.action==='edit_drive'"),'operator support must not monkey-patch drive edits');
  assert(driveRpc.includes('drive-admin-reason'),'admin drive edit must expose a visible reason field');
  assert(driveRpc.includes("wrap.style.display=active?'grid':'none'"),'admin reason field must be forcibly hidden for non-operator edits');
  assert(driveRpc.includes('Administrator edit reason is required.'),'admin drive edit must validate the reason locally');
  assert(driveRpc.includes("...(reason?{reason}:{})"),'admin drive edit must send the reason explicitly');
  assert(driveRpc.includes('Modify ${driver?.display_name'),'admin drive edit must still require confirmation');
  assert(operator.includes('Recompute progress'),'operator repair control must remain available');
  assert(operator.includes('app.selectDriver'),'operator search must select through the dashboard API');
  assert(!operator.includes('operatorBubble'),'operator support must not locate its host by page-wide text search');
  assert(!operator.includes('select.innerHTML=matches'),'operator search must not rebuild the driver selector');

  assert(!avatar.includes('sortDriverOptions'),'presentation code must not reorder the driver selector');
  assert(avatar.includes('const readOnly=isOperator'),'missing operator access metadata must fail closed to read-only');
  assert(avatar.includes("addEventListener('dv:drive-edit-mode'"),'read-only controls must react to bounded admin edit mode');
  assert(driveRpc.includes("addEventListener('dv:driver-changing'"),'drive edit state must clear when the driver changes');
  assert(driveRpc.includes("['drive-start','drive-end','drive-destination','drive-notes']"),'driver-specific draft values must clear on selection change');
  assert(driveRpc.includes("if(app.getDriverId()!==driverId)return;"),'saved edit must stop post-save UI work after switching drivers during refresh');
  assert(driveRpc.includes('resetAfterEdit()'),'verified edit must return to ordinary Log a Drive state');
  assert(detail.includes('detailToken'),'drive-detail responses must be tokenized against stale renders');
  assert(shared.includes("addEventListener('dv:driver-changing'"),'shared async work must invalidate on driver change');
  assert(!shared.includes("rpc('get_authenticated_driver_status_v1'"),'shared actions must reuse the dashboard status instead of duplicating it');
  assert(shared.includes('isReadOnly'),'late-created garage controls must enforce read-only access');
  assert(shared.includes("Garage changes are unavailable in read-only operator view."),'garage mutations need a read-only guard');
  assert(!shared.includes('cockpitStatus'),'shared actions must not duplicate license rendering');
  assert(!prepilot.includes('authNav('),'prepilot code must not own canonical account navigation');
  assert(!prepilot.includes('DRIVER_KEY'),'driver selection persistence must have one owner');
  assert(dashboard.includes('getRenderGeneration'),'dashboard must expose a render generation');
  assert(dashboard.includes('selectDriver'),'dashboard must expose the authoritative driver selection API');
  assert(dashboard.includes('Driver status timed out'),'driver status work must have a bounded timeout');
  assert(dashboard.includes('renderLicenseOnly'),'license status should update independently after an immediate driver render');
  assert(dashboard.includes('licenseStatusInFlight'),'selected-driver status calls must be deduplicated');
  assert(detail.includes('Administrator modification'));
  assert(detail.includes('Edit history'));
}

syntaxChecks();
architectureChecks();
console.log('BKLG-0078 operator support source-contract tests passed');

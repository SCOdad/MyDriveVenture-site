(() => {
  const app = window.DV_LOG_APP;
  if (!app?.client) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt','"':'&quot;',"'":'&#39;'}[c]));
  const hours = minutes => `${(Number(minutes || 0) / 60).toFixed(1)} h`;
  const optional = (label, value) => value == null || value === '' ? '' : `<div class="drive-detail-fact"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  const dialog = document.createElement('dialog');
  dialog.className = 'drive-detail-dialog';
  dialog.innerHTML = '<button class="drive-detail-close" type="button" aria-label="Close drive detail">×</button><div class="drive-detail-content" aria-live="polite"></div>';
  document.body.appendChild(dialog);
  const content = dialog.querySelector('.drive-detail-content');
  dialog.querySelector('.drive-detail-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  function render(detail) {
    const drive = detail.drive, vehicle = detail.vehicle, awards = detail.awards || [];
    app.detailDrives = app.detailDrives || {};
    app.detailDrives[drive.id] = drive;
    const weather = drive.weather?.conditions?.length ? drive.weather.conditions.join(', ') : null;
    const driver = (app.getModel?.().drivers || []).find(row => row.id === drive.driver_id);
    const zip = drive.classification_zip || driver?.home_zip;
    const home = driver?.home_city ? `Home: ${driver.home_city}${driver.home_state ? `, ${driver.home_state}` : ''}` : null;
    const locationBasis = [zip, home].filter(Boolean).join(' · ');
    content.innerHTML = `<p class="panel-label">TRIP DETAIL</p><h2>${esc(drive.drive_date)} · ${esc(String(drive.start_time || '').slice(0,5))}–${esc(String(drive.end_time || '').slice(0,5))}</h2><dl class="drive-detail-facts">${optional('Duration', `${Math.round(Number(drive.duration_minutes || 0))} min (${hours(drive.duration_minutes)})`)}${optional('Vehicle', vehicle?.name ? `${vehicle.name}${vehicle.vehicle_class ? ` · ${vehicle.vehicle_class}` : ''}` : null)}${optional('Logged via', drive.source)}${optional('Logged by', detail.logged_by?.display_name)}${optional('Destination', drive.destination)}${optional('Road notes', drive.notes || 'None')}${optional('Weather', weather)}${optional('Night credit', `${Math.round(Number(drive.night_minutes || 0))} min`)}${optional('Night rule', 'v1 · Jul 2, 2026')}${optional('Location basis', locationBasis)}</dl><section class="drive-detail-awards" aria-labelledby="drive-detail-awards-heading"><h3 id="drive-detail-awards-heading">Achievements earned on this drive</h3>${awards.length ? `<ul>${awards.map(award => `<li><div><strong>${esc(award.quest?.name || award.quest_key)}</strong>${award.quest?.description ? `<small>${esc(award.quest.description)}</small>` : ''}</div><span class="pill">+${Number(award.xp_awarded || 0)} XP</span></li>`).join('')}</ul>` : ''}</section><div class="drive-detail-actions"><button class="button subtle-button button-small drive-detail-edit" type="button" data-edit-drive="${esc(drive.id)}">Edit this drive</button></div>`;
  }
  document.addEventListener('click', async event => {
    if (event.target.closest('[data-edit-drive]') && dialog.open) dialog.close();
    const trigger = event.target.closest('[data-drive-detail-id]');
    if (!trigger) return;
    event.preventDefault();
    const driverId = app.getDriverId();
    if (!driverId) return;
    content.innerHTML = '<p class="drive-detail-loading">Loading drive details…</p>';
    dialog.showModal();
    const {data, error} = await app.client.functions.invoke('drive-detail-api', {body:{driver_id:driverId, drive_id:trigger.dataset.driveDetailId}});
    if (error || !data?.ok) { content.innerHTML = '<p class="drive-detail-error">Drive details are not available right now. Please try again.</p>'; return; }
    render(data);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const trigger = event.target.closest('[data-drive-detail-id]');
    if (!trigger) return;
    event.preventDefault();
    trigger.click();
  });
})();

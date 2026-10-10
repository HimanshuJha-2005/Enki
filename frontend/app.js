(() => {
  const API_URL = (window.ENKI_CONFIG && window.ENKI_CONFIG.API_URL) || '';
  const status = (m) => { document.getElementById('status').textContent = m; };

  const map = L.map('map').setView([22.5, 79.5], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18,
  }).addTo(map);

  let marker = null;
  map.on('click', (e) => {
    document.getElementById('r-lat').value = e.latlng.lat.toFixed(5);
    document.getElementById('r-lng').value = e.latlng.lng.toFixed(5);
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);
  });

  const layer = L.layerGroup().addTo(map);

  async function load() {
    const pincode = document.getElementById('f-pincode').value.trim();
    const type = document.getElementById('f-type').value;
    const q = new URLSearchParams();
    if (/^\d{6}$/.test(pincode)) q.set('pincode', pincode);
    if (type) q.set('type', type);
    q.set('limit', '100');
    try {
      const res = await fetch(`${API_URL}/reports?${q.toString()}`);
      const data = await res.json();
      layer.clearLayers();
      const colors = { flood: '#f43f5e', waterlogging: '#f59e0b', leak: '#22d3ee', 'dry-tap': '#a78bfa' };
      (data.reports || []).forEach((r) => {
        L.circleMarker([r.lat, r.lng], { radius: 4 + (r.severity || 3), color: colors[r.type] || '#fff', fillColor: colors[r.type] || '#fff', fillOpacity: 0.8, weight: 2 })
          .bindPopup(`<b>${r.type}</b> — sev ${r.severity}/5<br/>${r.pincode} · ${String(r.createdAt || '').slice(0, 10)}${r.photoKey ? '<br/>photo attached' : ''}`)
          .addTo(layer);
      });
      const total = (data.reports || []).length;
      const el = document.getElementById('s-total');
      if (el) el.textContent = `${total} reports live`;
      const t = document.getElementById('s-today');
      if (t) t.textContent = total ? 'updated just now' : 'be the first reporter';
      status(`Loaded ${total} reports — click a dot for details`);
    } catch (e) {
      status('API not reachable yet. Start SAM local.');
    }
  }

  document.getElementById('f-apply').addEventListener('click', load);
  document.getElementById('r-submit').addEventListener('click', async () => {
    const btn = document.getElementById('r-submit');
    btn.disabled = true;
    status('Submitting...');
    try {
      const lat = parseFloat(document.getElementById('r-lat').value);
      const lng = parseFloat(document.getElementById('r-lng').value);
      const pincode = document.getElementById('r-pincode').value.trim();
      const type = document.getElementById('r-type').value;
      const severity = parseInt(document.getElementById('r-severity').value, 10);
      const photoFile = document.getElementById('r-photo').files[0];
      let photoKey = null;
      if (photoFile) {
        status('Uploading photo...');
        const u = await fetch(`${API_URL}/reports/upload-url?contentType=${encodeURIComponent(photoFile.type)}`);
        const udata = await u.json();
        if (!u.ok) throw new Error(udata.error || 'Upload URL failed');
        const put = await fetch(udata.uploadUrl, { method: 'PUT', headers: { 'Content-Type': photoFile.type }, body: photoFile });
        if (!put.ok) throw new Error('Photo upload failed');
        photoKey = udata.photoKey;
      }
      const res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, pincode, type, severity, photoKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      status(`Reported ${data.reportId}`);
      load();
    } catch (e) {
      status(e.message);
    } finally {
      btn.disabled = false;
    }
  });

  load();
})();

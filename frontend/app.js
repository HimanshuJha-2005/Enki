(() => {
  const API_URL = (window.ENKI_CONFIG && window.ENKI_CONFIG.API_URL) || '';
  const status = (m) => { document.getElementById('status').textContent = m; };

  const map = L.map('map', { zoomControl: true }).setView([22.5, 79.5], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors, HOT',
    maxZoom: 19,
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
        let html = `<b>${r.type}</b> — sev ${r.severity}/5<br/>${r.pincode} · ${String(r.createdAt || '').slice(0, 10)}`;
        if (r.photoUrl) html += `<img class="pop-img" src="${r.photoUrl}" alt="report photo" loading="lazy">`;
        else if (r.photoKey) html += `<img class="pop-img" data-key="${r.photoKey}" alt="report photo">`;
        const m = L.circleMarker([r.lat, r.lng], { radius: 4 + (r.severity || 3), color: colors[r.type] || '#fff', fillColor: colors[r.type] || '#fff', fillOpacity: 0.8, weight: 2 });
        m.bindPopup(html);
        m.on('popupopen', (ev) => {
          const img = ev.popup.getElement().querySelector('img[data-key]');
          if (img && !img.src) {
            fetch(`${API_URL}/reports/photo?key=${encodeURIComponent(img.dataset.key)}`)
              .then((x) => x.json())
              .then((d) => { if (d.url) img.src = d.url; })
              .catch(() => {});
          }
        });
        m.addTo(layer);
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

  const DEMO_PICS = [
    { p: 'photos/flood-1.jpg', city: 'Mumbai', type: 'flood', cap: 'Car swept off road', lat: 19.076, lng: 72.8777 },
    { p: 'photos/flood-2.jpg', city: 'Mumbai', type: 'flood', cap: 'Bus in floodwater', lat: 19.076, lng: 72.8777 },
    { p: 'photos/flood-3.jpg', city: 'Mumbai', type: 'waterlogging', cap: 'Tree down, road flooded', lat: 19.076, lng: 72.8777 },
    { p: 'photos/flood-4.jpg', city: 'Assam', type: 'flood', cap: 'Village under water', lat: 26.1445, lng: 91.7362 },
    { p: 'photos/flood-5.jpg', city: 'Assam', type: 'flood', cap: 'Fields submerged', lat: 26.1445, lng: 91.7362 },
    { p: 'photos/flood-6.jpg', city: 'Godavari', type: 'flood', cap: 'River in spate', lat: 17.0, lng: 81.78 },
    { p: 'photos/waterlogging-1.jpg', city: 'Chennai', type: 'waterlogging', cap: 'Office road waterlogged', lat: 13.0827, lng: 80.2707 },
    { p: 'photos/waterlogging-2.jpg', city: 'Chennai', type: 'waterlogging', cap: 'City from the air', lat: 13.0827, lng: 80.2707 },
    { p: 'photos/waterlogging-3.jpg', city: 'Chennai', type: 'waterlogging', cap: 'Relief on flooded street', lat: 13.0827, lng: 80.2707 },
    { p: 'photos/leak-1.jpg', city: 'Pipeline', type: 'leak', cap: 'Broken water main', lat: 23.0225, lng: 72.5714 },
    { p: 'photos/leak-2.jpg', city: 'Home', type: 'leak', cap: 'Tap leaking', lat: 12.9716, lng: 77.5946 },
    { p: 'photos/leak-3.jpg', city: 'Tap', type: 'leak', cap: 'Dripping tap', lat: 17.385, lng: 78.4867 },
    { p: 'photos/drytap-1.jpg', city: 'Kerala', type: 'dry-tap', cap: 'Drought water queue', lat: 10.0, lng: 76.5 },
    { p: 'photos/drytap-2.jpg', city: 'Village', type: 'dry-tap', cap: 'Hand pump running dry', lat: 26.9124, lng: 75.7873 },
    { p: 'photos/drytap-3.jpg', city: 'Raichur', type: 'dry-tap', cap: 'Overhead tank empty', lat: 16.2, lng: 77.35 },
  ];
  let selectedDemo = null;
  const modal = document.getElementById('pic-modal');
  const grid = document.getElementById('pic-grid');
  const picname = document.getElementById('r-picname');
  const verdictEl = document.getElementById('r-verdict');
  const SEV_WORD = { 2: 'ankle', 3: 'knee', 4: 'waist', 5: 'dangerous' };

  async function analyzeB64(b64) {
    verdictEl.textContent = 'Rekognition analyzing photo...';
    try {
      const res = await fetch(`${API_URL}/reports/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64 }),
      });
      const v = await res.json();
      if (!res.ok) throw new Error(v.error || 'analyze failed');
      document.getElementById('r-type').value = v.type;
      document.getElementById('r-severity').value = String(v.severity);
      verdictEl.textContent = `AI guess: ${v.type} · ${SEV_WORD[v.severity] || 'knee'}-deep · ${(v.confidence * 100).toFixed(0)}% — ${v.reason}`;
    } catch (e) {
      verdictEl.textContent = 'AI unavailable: ' + e.message;
    }
  }

  async function analyzeBlob(blob) {
    const b64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    if (b64 && b64.length <= 4_500_000) analyzeB64(b64);
    else verdictEl.textContent = 'photo too large for AI analyze (max ~3MB)';
  }

  const distKm = (a, b) => {
    const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  function renderGrid(pics) {
    grid.innerHTML = '';
    pics.forEach((d) => {
      const el = document.createElement('div');
      el.className = 'pic-item';
      el.innerHTML = `<img src="${d.p}" alt="${d.city} ${d.type}" loading="lazy"><div class="cap"><b>${d.city}</b>${d.type} · ${d.cap}</div>`;
      el.addEventListener('click', async () => {
        selectedDemo = d;
        document.getElementById('r-photo').value = '';
        picname.textContent = `using demo pic: ${d.city} · ${d.type}`;
        modal.classList.remove('open');
        analyzeBlob(await (await fetch(d.p)).blob());
      });
      grid.appendChild(el);
    });
  }

  function openPicker() {
    const lat = parseFloat(document.getElementById('r-lat').value);
    const lng = parseFloat(document.getElementById('r-lng').value);
    let pics = [...DEMO_PICS];
    if (!isNaN(lat) && !isNaN(lng)) {
      const here = { lat, lng };
      pics.sort((a, b) => distKm(here, a) - distKm(here, b));
    }
    renderGrid(pics);
    modal.classList.add('open');
  }

  document.getElementById('r-demopics').addEventListener('click', openPicker);
  document.getElementById('pic-close').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.getElementById('r-photo').addEventListener('change', () => {
    const f = document.getElementById('r-photo').files[0];
    if (f) {
      selectedDemo = null;
      picname.textContent = `using file: ${f.name}`;
      analyzeBlob(f);
    }
  });

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
      let photoFile = document.getElementById('r-photo').files[0];
      if (!photoFile && selectedDemo) {
        const blob = await (await fetch(selectedDemo.p)).blob();
        photoFile = new File([blob], `${selectedDemo.city}-${selectedDemo.type}.jpg`, { type: blob.type || 'image/jpeg' });
      }
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
      selectedDemo = null;
      document.getElementById('r-photo').value = '';
      picname.textContent = 'no photo selected (optional)';
      verdictEl.textContent = '';
      load();
    } catch (e) {
      status(e.message);
    } finally {
      btn.disabled = false;
    }
  });

  load();
})();

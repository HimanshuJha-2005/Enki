// Local preview server - no AWS needed. Mocks Lambda + DynamoDB in memory.
// Run: node backend/local-server.js  (then open frontend/index.html)
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
let reports = [];
try {
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'infra', 'seed.json'), 'utf8'));
  reports = seed.map((s) => ({ reportId: crypto.randomUUID(), status: 'open', createdAt: new Date().toISOString(), photoKey: null, ...s }));
} catch { reports = []; }

const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const send = (res, code, obj) => { res.writeHead(code, cors); res.end(JSON.stringify(obj)); };

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'GET' && u.pathname === '/reports') {
    let out = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const pincode = u.searchParams.get('pincode'), type = u.searchParams.get('type'), limit = Math.min(100, Number(u.searchParams.get('limit')) || 50);
    if (pincode) out = out.filter((r) => r.pincode === pincode);
    if (type) out = out.filter((r) => r.type === type);
    return send(res, 200, { reports: out.slice(0, limit) });
  }
  if (req.method === 'GET' && u.pathname === '/reports/upload-url') {
    const key = `reports/local/${crypto.randomUUID()}.jpg`;
    return send(res, 200, { uploadUrl: `http://localhost:${PORT}/mock-upload?key=${encodeURIComponent(key)}`, photoKey: key });
  }
  if (req.method === 'PUT' && u.pathname === '/mock-upload') {
    req.resume();
    req.on('end', () => send(res, 200, { ok: true }));
    return;
  }
  if (req.method === 'POST' && u.pathname === '/reports') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const b = JSON.parse(body || '{}');
        if (typeof b.lat !== 'number' || typeof b.lng !== 'number') return send(res, 400, { error: 'lat/lng must be numbers' });
        if (!/^\d{6}$/.test(String(b.pincode || ''))) return send(res, 400, { error: 'pincode must be 6 digits' });
        const report = { reportId: crypto.randomUUID(), lat: b.lat, lng: b.lng, pincode: String(b.pincode), type: b.type || 'flood', severity: b.severity || 3, photoKey: b.photoKey || null, status: 'open', createdAt: new Date().toISOString() };
        reports.unshift(report);
        return send(res, 201, report);
      } catch { return send(res, 400, { error: 'Invalid JSON' }); }
    });
    return;
  }
  return send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log(`Enki local mock on http://127.0.0.1:${PORT} with ${reports.length} seed reports`));

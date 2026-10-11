'use strict';

const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');

const rek = new RekognitionClient({});

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function classify(labels) {
  const c = Object.fromEntries(labels.map((l) => [l.Name, l.Confidence]));
  const max = (names) => Math.max(0, ...names.map((n) => c[n] || 0));
  const water = max(['Water', 'Flood', 'Puddle', 'River', 'Rain', 'Lake', 'Stream', 'Flooding', 'Wetland']);
  const floodish = max(['Flood', 'Flooding', 'River']);
  const leak = max(['Tap', 'Faucet', 'Sink', 'Sink Faucet', 'Pipe', 'Water Pipe', 'Hose', 'Drain', 'Plumbing', 'Shower', 'Bathtub']);
  const dry = max(['Drought', 'Desert', 'Sand', 'Soil']);
  const veh = max(['Car', 'Vehicle', 'Bus', 'Truck', 'Motorcycle', 'Bicycle', 'Taxi']);
  const pers = max(['Person', 'Man', 'Woman', 'Child', 'Adult']);
  const top = labels.slice(0, 4).map((l) => `${l.Name} ${l.Confidence.toFixed(0)}%`).join(', ');

  if (leak >= 80 && water < 75) {
    return { type: 'leak', severity: 2, confidence: +(leak / 100).toFixed(2), reason: `Tap/pipe scene (${top})` };
  }
  if (water >= 45) {
    const isFlood = (floodish >= 45 && (veh >= 50 || pers >= 50)) || (floodish >= 45 && water >= 75);
    let severity;
    if (isFlood) severity = water >= 90 && pers >= 70 ? 5 : (veh >= 60 && water >= 80 ? 4 : 3);
    else severity = water >= 85 && veh >= 60 ? 3 : 2;
    return {
      type: isFlood ? 'flood' : 'waterlogging',
      severity,
      confidence: +(water / 100).toFixed(2),
      reason: `Water ${water.toFixed(0)}%${floodish ? `, Flood ${floodish.toFixed(0)}%` : ''}${veh >= 50 ? ', vehicles in water' : ''}${pers >= 50 ? ', people present' : ''}`,
    };
  }
  if (dry >= 50) {
    return { type: 'dry-tap', severity: 2, confidence: +(dry / 100).toFixed(2), reason: `Dry terrain (${top})` };
  }
  return { type: 'dry-tap', severity: 2, confidence: +Math.max(0.4, 1 - water / 100).toFixed(2), reason: `Little/no water detected (${top})` };
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const imageBase64 = String(body.imageBase64 || '');
    if (!imageBase64 || imageBase64.length > 4_500_000) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'imageBase64 required (max ~3MB)' }) };
    }

    const res = await rek.send(new DetectLabelsCommand({
      Image: { Bytes: Buffer.from(imageBase64, 'base64') },
      MaxLabels: 15,
      MinConfidence: 50,
    }));

    const verdict = classify(res.Labels || []);
    verdict.engine = 'Amazon Rekognition';
    return { statusCode: 200, headers: cors, body: JSON.stringify(verdict) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'analysis failed: ' + e.message }) };
  }
};

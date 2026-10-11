'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;
const ALLOWED_TYPES = ['flood', 'waterlogging', 'leak', 'dry-tap'];

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { lat, lng, pincode, type, severity, photoKey, photoUrl } = body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'lat/lng must be numbers' }) };
  }
  if (lat < 6 || lat > 38 || lng < 68 || lng > 98) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Coordinates outside India bounds' }) };
  }
  if (!/^\d{6}$/.test(String(pincode || ''))) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'pincode must be 6 digits' }) };
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `type must be one of ${ALLOWED_TYPES.join(',')}` }) };
  }

  const report = {
    reportId: crypto.randomUUID(),
    lat,
    lng,
    pincode: String(pincode),
    type,
    severity: Math.min(5, Math.max(1, Number(severity) || 3)),
    photoKey: typeof photoKey === 'string' ? photoKey.slice(0, 256) : null,
    photoUrl: typeof photoUrl === 'string' && (photoUrl.startsWith('photos/') || photoUrl.startsWith('http')) ? photoUrl.slice(0, 512) : null,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: report }));

  return { statusCode: 201, headers: cors, body: JSON.stringify(report) };
};

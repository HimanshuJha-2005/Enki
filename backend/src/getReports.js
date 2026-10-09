'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const { pincode, type, limit } = qs;

  const scanParams = { TableName: TABLE_NAME, Limit: Math.min(100, Number(limit) || 50) };
  const filters = [];
  const names = {};
  const values = {};

  if (pincode && /^\d{6}$/.test(String(pincode))) {
    filters.push('#p = :p');
    names['#p'] = 'pincode';
    values[':p'] = String(pincode);
  }
  if (type) {
    filters.push('#t = :t');
    names['#t'] = 'type';
    values[':t'] = String(type);
  }
  if (filters.length) {
    scanParams.FilterExpression = filters.join(' AND ');
    scanParams.ExpressionAttributeNames = names;
    scanParams.ExpressionAttributeValues = values;
  }

  const res = await ddb.send(new ScanCommand(scanParams));
  const items = (res.Items || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return { statusCode: 200, headers: cors, body: JSON.stringify({ reports: items }) };
};

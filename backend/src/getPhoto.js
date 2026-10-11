'use strict';

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const key = String(qs.key || '');

  if (!key.startsWith('reports/')) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'invalid key' }) };
  }

  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }), { expiresIn: 300 });

  return { statusCode: 200, headers: cors, body: JSON.stringify({ url }) };
};

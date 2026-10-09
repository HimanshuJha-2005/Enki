'use strict';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const contentType = String(qs.contentType || 'image/jpeg');

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'contentType must be image/jpeg, image/png or image/webp' }) };
  }

  const ext = contentType.split('/')[1];
  const key = `reports/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType }), { expiresIn: 300 });

  return { statusCode: 200, headers: cors, body: JSON.stringify({ uploadUrl: url, photoKey: key }) };
};

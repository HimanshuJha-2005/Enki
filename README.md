# Enki — Citizen Flood Map for India

Live hyperlocal flood / waterlogging / leak / dry-tap map. Citizens report with photo + GPS + pincode, everyone sees it live on an India map.

Track: **Heat and Water** — Environmental Hacks, Bharat Builds Tour (Oct 8–11, 2026)

## Live
- API: `https://4arvfdutg3.execute-api.ap-south-1.amazonaws.com`
- Frontend: connect repo on Amplify Hosting, root `frontend/`
- Demo data: 15 seeded reports + photo upload verified live Oct 10

## Problem
Monsoon floods the gali, not the district. IMD gives district alerts, municipal helplines are city-specific. No open, citizen-level view of which street is waterlogged right now.

## What it does
1. Click map to set location, add pincode + type + severity + photo
2. Photo uploads to S3 via presigned URL, report stored in DynamoDB
3. Live Leaflet map shows pins sized by severity, filterable by pincode / type
4. Strands agent stub scores spam vs real water reports

## Stack
- **Frontend:** Static Leaflet (OpenStreetMap) + vanilla JS, hosted on Amplify Hosting
- **Backend:** Node.js 20 Lambda + HTTP API, AWS SAM, `ap-south-1`
- **Data:** DynamoDB `enki-reports` (PAY_PER_REQUEST), S3 `enki-photos-*`
- **AI:** Strands Agents SDK verification stub (`backend/src/verifyAgent.py`)

## API
- `POST /reports` — `{lat, lng, pincode, type, severity, photoKey?}` → 201 report
- `GET /reports?pincode=&type=&limit=` — newest first
- `GET /reports/upload-url?contentType=` — presigned S3 PUT URL

Validation: India bounds (6–38N, 68–98E), 6-digit pincode, type in `flood, waterlogging, leak, dry-tap`.

## Run locally
```bash
cd backend && npm install && sam local start-api --region ap-south-1
# open frontend/index.html with API_URL in frontend/config.js -> http://127.0.0.1:3000
```

## Deploy (Free Tier)
- `sam build && sam deploy --guided --region ap-south-1`
- Amplify Hosting → connect repo → root `frontend/`

## AWS proof
- Deployed on AWS (Lambda + API Gateway + DynamoDB + S3 + Amplify)
- Uses AWS open-source: Strands Agents SDK, SAM CLI

## Seed
15 reports across Delhi, Mumbai, Patna, Guwahati, Kolkata, Chennai, Bengaluru, Hyderabad, Ahmedabad, Jaipur, Chandigarh, Agra, Pune — `infra/seed.json`.

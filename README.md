# Enki — Citizen Flood Map for India

**Street-level flood intelligence, built by citizens, powered by AWS.**

IMD alerts districts. Waterlogging happens on *streets*. Enki is a live, hyperlocal map where citizens report flood / waterlogging / pipe-leak / dry-tap conditions in ~20 seconds — with a photo that AWS Rekognition auto-classifies — and everyone else sees it instantly, filtered to their pincode.

Track: **Heat & Water** — Environmental Hacks · Bharat Builds Tour · Oct 8–11, 2026

---

## Live

| | |
|---|---|
| **Web app** | https://master.d3l7ycbklg93jo.amplifyapp.com |
| **API** | https://4arvfdutg3.execute-api.ap-south-1.amazonaws.com |
| Region | `ap-south-1` (Mumbai) |
| Seeded demo | 15 reports across 13 Indian cities, each with a photo |

## The problem

When it rains in Mumbai, the district is "flooded" — but you don't know if *your* road to the station is knee-deep or passable. Municipal helplines are city-specific, social media is noise, and IMD resolution is district-level. There is no open, street-level, citizen-powered view of water on the ground — in real time, for any pincode in India.

## How it works

1. **Click the map** — location locked (lat/lng)
2. **Add pincode, pick type & severity** — or let AI decide
3. **Attach a photo** — your own file, or a bundled demo photo (nearest city shown first)
4. **Amazon Rekognition looks at the photo** and guesses `type` (flood / waterlogging / leak / dry-tap) and `severity` (ankle / knee / waist / dangerous), with confidence and reasoning — auto-filling the form; you can override
5. **Submit** — photo uploads to S3 via presigned URL, report lands in DynamoDB, a new pin appears on the map, and everyone in that pincode sees it

Citizen photo evidence → AI triage → hyperlocal public warning. That's the loop.

## Architecture

```
Browser (Leaflet map, Amplify Hosting)
   │
   ├── GET/POST /reports ──────────────► API Gateway HTTP API ──► Lambda (Node.js 20)
   │                                          │
   │                                          ├──► DynamoDB  enki-reports
   │                                          │
   ├── GET /reports/upload-url ─► Lambda ───► S3 presigned PUT  ──► enki-photos-*
   │
   ├── GET /reports/photo?key= ─► Lambda ───► S3 presigned GET
   │
   └── POST /reports/analyze ───► Lambda ───► Amazon Rekognition DetectLabels
                                                (photo → type + severity verdict)
```

All serverless. Pay-per-request. Runs on free tier / a few dollars a month.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla JS + Leaflet + HOT tiles, zero build step, Amplify Hosting |
| API | API Gateway HTTP API → Lambda (Node.js 20) |
| Compute | AWS Lambda, deployed with **AWS SAM** |
| Data | DynamoDB (`enki-reports`, PAY_PER_REQUEST) |
| Photos | S3 (`enki-photos-*`) — presigned upload/download, CORS-enabled |
| AI | **Amazon Rekognition** `DetectLabels` → score-based classifier (type + severity + confidence) |
| IaC | `backend/template.yaml` (SAM), one-command redeploy |

## API

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| `POST` | `/reports` | `{lat, lng, pincode, type, severity, photoKey?, photoUrl?}` | `201 {reportId}` |
| `GET` | `/reports` | `?pincode=&type=&limit=` | newest-first report list |
| `GET` | `/reports/upload-url` | `?contentType=` | `{uploadUrl, photoKey}` |
| `GET` | `/reports/photo` | `?key=reports/...` | `{url}` (signed, 5 min) |
| `POST` | `/reports/analyze` | `{imageBase64}` | `{type, severity, confidence, reason, engine}` |

Server-side validation: India bounds (6–38°N, 68–98°E), 6-digit pincode, type whitelist. Photo keys are prefixed `reports/` and only signed keys can be read back.

## Demo mode

Demo photo picker ships **15 CC-licensed Wikimedia photos** (Mumbai, Chennai, Assam, Godavari, Kerala, Raichur, …) bundled client-side in `frontend/photos/`. Opening the picker sorts them by straight-line distance from your clicked map point, so the nearest city's photos come first. Picking one runs it through the *real* pipeline — Rekognition analyze → S3 upload → DynamoDB → live pin.

## Run locally

```bash
cd backend && npm install
sam local start-api --region ap-south-1
# point frontend/config.js API_URL at http://127.0.0.1:3000, open frontend/index.html
```

## Deploy

```bash
cd backend
sam build && sam deploy --region ap-south-1 --capabilities CAPABILITY_IAM --resolve-s3
# frontend: Amplify Hosting watches the repo, root "frontend/"
```

## Photo credits

Demo photos from [Wikimedia Commons](https://commons.wikimedia.org/) (CC-licensed): real flood, waterlogging, pipe-leak and drought photography from India. Citizen-uploaded photos live in S3 and are served via short-lived signed URLs only.

---

Built on AWS · Heat & Water track · Environmental Hacks 2026

# Enki — Citizen Flood Map for India

Track: Heat and Water

Problem: Every monsoon, streets in India flood / waterlog, but there's no hyperlocal, citizen-level map. Municipal helplines are city-specific, IMD gives district alerts, not gali-level reality.

What we're building: A national crowdsourced water-hazard reporter.
Citizen uploads photo + auto GPS + pincode + type (flood / waterlogging / leak / dry-tap) -> shows live on India map.

Why national: Same form works in Patna, Mumbai, Guwahati, Delhi. No city lock-in.

Stack plan:
- Frontend: Next.js + Leaflet (OSM) on Amplify Hosting
- Backend: Node.js Lambda + API Gateway (SAM), DynamoDB, S3
- AI: Strands Agents SDK for spam / water verification
- Alerts: SNS (stretch)

Status: Day 1 - problem + scaffold. Building in public, small commits.

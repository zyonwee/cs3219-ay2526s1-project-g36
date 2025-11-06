# QN Service

A NestJS microservice exposing question endpoints extracted from the API service.

## Endpoints

- GET `/questions?limit=N` — returns up to N questions from MongoDB (default 5). Requires Bearer JWT.

## Environment

See `.env.example` for required variables:
- `PORT`, `CORS_ORIGINS`
- `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_AUD`, `SUPABASE_ISS`
- `MONGODB_URI`, `MONGODB_NAME`, `MONGODB_COLLECTION`

## Run locally

```
npm install
npm run start:dev
```
Service runs at http://localhost:3000 by default.

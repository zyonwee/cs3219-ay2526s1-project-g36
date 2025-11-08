# Question Service — Query Guide

This service exposes a single authenticated endpoint to search and list questions stored in MongoDB.

Base URL: `http://localhost:${PORT}` (defaults to `3000`)

Auth: All routes require `Authorization: Bearer <JWT>` (guarded by `BearerAuthGuard`).

## Endpoint

GET `/questions`

- Returns a paginated list of questions with optional filtering, search, and sorting.
- Response shape: `{ items: QuestionWithPoints[], total: number, page: number, pageSize: number }`
- Each item includes a computed `points` field derived from `difficulty`.

Points mapping:
- `easy` → `1`
- `medium` → `3`
- `hard` → `5`

## Query Parameters

- `page` (number): Page number. Default `1`.
- `pageSize` (number): Items per page. Default `20`.
- `limit` (number): Legacy alias mapped to `pageSize` if provided.
- `topic` (string): Filter by a single topic. Matches either
  - comma-separated `related_topics` string, or
  - `related_topics` array.
  Case-insensitive exact token match (e.g., `Array` matches `Array, Two Pointers`).
- `difficulty` (string): One of `easy`, `medium`, `hard` (case-insensitive exact match).
- `q` (string): Search term applied as:
  - case-sensitive, partial match on `title`
  - partial, string-based match on numeric `id` (via `$toString`), e.g., `q=11` matches `11`, `110`, etc.
  Note: Does not search Mongo `_id`.
- `sortBy` (string): Sort field. Supported values (case-insensitive):
  - `title`, `topic`, `related_topics`, `difficulty`, `popularity`, `likes`,
    `discuss_count`, `solve_rate`, `solverate`, `acceptance_rate`, `frequency`, `rating`, `id`
- `sortDir` (string): `asc` (default) or `desc`.

Sorting details:
- Default sort is `title` ascending.
- Sorting by `difficulty` uses rank: Easy (1) < Medium (2) < Hard (3), then `title` asc as a tiebreaker.
- Other sorts use the chosen field then `title` asc as tiebreaker.

## Examples

Assume the service runs on `http://localhost:3000` and you have a valid JWT in `$TOKEN`.

List first page (20 items, default sort title asc):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions"
```

Top 5 (using `limit` alias):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?limit=5"
```

Search by title substring (case-sensitive):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?q=Container"
```

Search by numeric id substring (e.g., matches 11, 110, 211):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?q=11"
```

Filter by topic (matches token within comma list or array):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?topic=Two%20Pointers"
```

Filter by difficulty (case-insensitive):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?difficulty=Medium"
```

Sort by likes descending:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?sortBy=likes&sortDir=desc"
```

Paginate (page 3, 50 per page):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?page=3&pageSize=50"
```

Difficulty rank sort (Easy → Medium → Hard):

```bash
curl -H "Authorization: Bearer $TOKEN" \
"http://localhost:3000/questions?sortBy=difficulty&sortDir=asc"
```

GET `/questions/:id`

- Returns a single question by exact numeric `id`.
- Response shape: `QuestionWithPoints`

Example:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions/11"
```

## Behavior Notes

- Title search via `q` is case-sensitive and partial.
- Numeric `id` search via `q` is substring-based after stringifying the number.
- Exact-by-id is available at `/questions/:id` (numeric only); no Mongo `_id` lookup.
- Response always includes total count and the page/pageSize echoed back.

## Environment

The service reads Mongo settings from env vars (see `.env`):

- `MONGODB_URI` — connection string (required)
- `MONGODB_NAME` — database name (default: `QuestionService`)
- `MONGODB_COLLECTION` or `QUESTIONS_COLLECTION_NAME` — collection name (default: `Questions`)
- `PORT` — HTTP port (default: `3000`)
- `CORS_ORIGINS` — optional CSV of allowed origins

## Related Code

- Controller: `src/questions/questions.controller.ts`
- Service: `src/questions/questions.service.ts`
- Mongo provider: `src/mongodb/mongo.provider.ts`

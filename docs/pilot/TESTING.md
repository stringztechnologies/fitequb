# Pilot verification

Use Node 20+, pnpm 9.15.9, PostgreSQL 16+, psql and PostgREST 16.2. The test database name MUST end in `_test`; tests drop its public schema. Never pass production credentials.

```
PILOT_TEST_DATABASE_URL=postgresql://USER@127.0.0.1:55439/fitequb_pilot_test
PILOT_TEST_REST_URL=http://127.0.0.1:55440
```

Start PostgREST against that database with schema `public`, anon role `anon`, and the test-only JWT secret `pilot-test-secret-at-least-thirty-two-characters`. The API suite generates its own service-role JWT and rewrites only Supabase's `/rest/v1` URL prefix to PostgREST's root. Database operations and RPCs are real. Chapa and Supabase Auth are mocked at their HTTP boundaries; no external charge or OTP is sent.

`pnpm test:db` runs database and API scenarios serially. The fixture models preserved v1 DATE/integer columns, then executes actual S2, money, and pilot migrations. It is a local rehearsal of those contracts, not a replacement for staging against the full current production schema.

`pnpm test:pilot-browser` starts Vite with test-only API/auth URLs and runs Chromium in CI or installed Chrome locally. Browser tests cover offer display, Telegram enrollment/payment recovery, native email OTP return, direct Telegram invitation, renewal navigation, staff confirmation and native staff-session recovery after reload. Browser API responses are contract fixtures; the independent API suite tests actual database behavior.

Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm run test --run`, then the database and browser suites. CI provisions an isolated PostgreSQL service and PostgREST process. Do not pass a live API URL into these tests.

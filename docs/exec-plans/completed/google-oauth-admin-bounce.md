# Google OAuth admin bounce

Status: completed
Started: 2026-08-30
Completed: 2026-08-30

## Intent

Google login that lands on `/admin` or `/profile` with `neon_auth_session_verifier` must finish the client handshake. Those pages must not redirect unsigned visitors while that param is present.

## Progress

- [x] Exec plan
- [x] `hasNeonAuthHandshake`
- [x] `/admin` and `/profile` skip the bounce
- [x] Tests + FRONTEND.md
- [x] Verify

## Decisions

- Reuse `dict.auth.signingIn` for the pending state. No new copy.
- `hasNeonAuthHandshake` is a non-empty string check. Empty verifier still bounces.
- Google `callbackURL` stays `next`. The pages wait; the return path does not change.

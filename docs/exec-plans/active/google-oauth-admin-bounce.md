# Google OAuth admin bounce

Status: active
Started: 2026-08-30

## Intent

Google login that lands on `/admin` or `/profile` with `neon_auth_session_verifier` must finish the client handshake. Those pages must not redirect unsigned visitors while that param is present.

## Progress

- [ ] Exec plan
- [ ] `hasNeonAuthHandshake`
- [ ] `/admin` and `/profile` skip the bounce
- [ ] Tests + FRONTEND.md
- [ ] Verify

## Decisions

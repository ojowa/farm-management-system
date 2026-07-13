# ADR-002: httpOnly Cookies for Web Authentication

**Date:** 2026-07-13  
**Status:** Accepted  
**Deciders:** Development Team

## Context

The system has 4 frontend apps with different authentication needs:

- **Web, Admin, Console:** Browser-based apps (Next.js)
- **Mobile:** React Native app (Expo)

Browser-based apps face XSS risks when storing tokens in `localStorage`. The auth-service returns `accessToken` and `refreshToken` in the JSON response body.

## Decision

Use **httpOnly cookies** for browser-based apps (web, admin, console) and **Bearer tokens** for the mobile app.

### Implementation

**Auth-service controller** sets cookies on login/refresh:
```typescript
res.cookie('accessToken', result.accessToken, {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000,
  path: '/',
});
```

**Gateway proxy** reads from cookies:
```typescript
if (req.cookies?.accessToken) {
  token = req.cookies.accessToken;
} else {
  // fallback to Bearer header
}
```

**Frontend apps** use `withCredentials: true`:
```typescript
const client = axios.create({ withCredentials: true });
```

### Mobile App (Exception)

Mobile uses AsyncStorage + Bearer header because:
- React Native has no browser cookie jar
- No XSS risk in the same way as browsers
- Standard pattern for React Native apps

## Consequences

### Positive
- Tokens invisible to JavaScript — immune to XSS theft
- `SameSite=Lax` mitigates CSRF for same-site requests
- Browser manages token lifecycle automatically
- Consistent pattern across all browser-based apps

### Negative
- More complex setup (CORS `credentials: true`, `exposedHeaders: ['Set-Cookie']`)
- Cannot be used from different origins without proper CORS config
- Cookie size limits (4KB per cookie)

### Neutral
- Mobile app unaffected — continues using Bearer tokens
- Refresh flow requires sending empty body (cookies provide refreshToken)

# Mobile App — Backend Integration

## Quick Start

### 1. Configure Your API URL
```bash
cd farm-client/mobile
cp .env.example .env.local
# Edit .env.local and set your API URL
```

### 2. Verify Backend is Working
```bash
node verify-api.js
# Expected: "All 5 endpoint tests passed!"
```

### 3. Start the App
```bash
npm install
npm start
# Scan QR code with phone camera, or press 'i' for iOS / 'a' for Android
```

## Environment Configuration

### Variables
```env
# Development
EXPO_PUBLIC_API_URL=http://localhost:4000/api

# Staging
EXPO_PUBLIC_API_URL=https://staging-api.example.com/api

# Production
EXPO_PUBLIC_API_URL=https://api.example.com/api
```

### Setup
- Copy `.env.example` → `.env.local`
- `.env.local` is in `.gitignore` (do not commit)
- Code accesses via: `process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api'`

## API Reference

### Authentication

#### POST `/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "farm_manager"
  }
}
```

#### POST `/auth/refresh`
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
```

#### POST `/auth/verify-mfa`
```json
{
  "mfaSessionToken": "token_from_login",
  "code": "123456"
}
```

### Data Endpoints

All data endpoints support two response formats (both handled automatically):

```json
// Wrapped:  { "data": [...] }
// Direct:   [...]
```

Pattern used: `response.data.data || response.data`

#### GET `/farms`
```json
{
  "data": [{
    "id": "farm-1",
    "name": "Green Valley Farm",
    "location": "District A",
    "size": 250,
    "crops": 5,
    "animals": 20,
    "status": "active"
  }]
}
```

#### GET `/crops`
```json
{
  "data": [{
    "id": "crop-1",
    "name": "Maize",
    "farm": "Green Valley Farm",
    "type": "Maize",
    "area": 50,
    "plantedDate": "2024-04-15",
    "health": 85,
    "status": "growing"
  }]
}
```

#### GET `/livestocks`
```json
{
  "data": [{
    "id": "livestock-1",
    "name": "Dairy Herd A",
    "breed": "Holstein",
    "quantity": 12,
    "health": "healthy",
    "farm": "Green Valley Farm",
    "lastCheckup": "2024-06-20"
  }]
}
```

#### GET `/poultry`
```json
{
  "data": [{
    "id": "poultry-1",
    "name": "Layer Flock",
    "breed": "Leghorn",
    "quantity": 200,
    "health": "healthy",
    "farm": "Green Valley Farm",
    "lastCheckup": "2024-06-18"
  }]
}
```

#### GET `/finance`
```json
{
  "data": [{
    "id": "transaction-1",
    "title": "Maize Sale",
    "description": "Harvest sale",
    "amount": 2500,
    "type": "income",
    "category": "Sales",
    "date": "2024-06-20"
  }]
}
```

### Endpoints Summary

```
POST   /auth/login              → Get access token
POST   /auth/refresh            → Refresh token (automatic)
POST   /auth/verify-mfa         → Verify 2FA code
GET    /farms                   → List all farms
GET    /crops                   → List all crops
GET    /livestocks              → List all livestock
GET    /poultry                 → List all poultry
GET    /finance                 → List all transactions
```

### Testing with Postman

1. **Get token**: POST to `/auth/login` with email/password
2. **Test endpoints**: GET `/farms` with header `Authorization: Bearer <token>`
3. **Test refresh**: Wait 15 min, verify auto-refresh on 401

## Architecture & Features

### Screens (6 App + 4 Auth)

**Authentication Stack:**
```
Login → Dashboard
Register → Login
Forgot Password → Reset → Login
MFA Verification → Dashboard
```

**App Stack (Tabs):**
| Tab | Features |
|-----|----------|
| Dashboard | Dynamic stats from all 5 APIs, quick actions, recent activity |
| Farms | List/filter farms, view/edit/delete, pull-to-refresh |
| Crops | Health bars, status badges, filter by farm |
| Livestock | Combined livestock + poultry, health indicators, filter by type |
| Finance | Income/expense tracking, summary cards, filter by type |
| Settings | Profile, preferences, logout |

### What's Implemented

- All 5 screens fetch real data from backend APIs (no mock data)
- Automatic token refresh on authentication errors
- Parallel API calls on Dashboard (loads faster)
- Comprehensive error handling with user-friendly messages
- Flexible response format handling (wrapped or direct)
- JWT token-based auth with AsyncStorage persistence
- Redux state management (auth + UI)
- File-based routing with Expo Router
- Pull-to-refresh on all screens

### Dependencies

| Package | Purpose |
|---------|---------|
| `react-native` 0.81.5 | Core framework |
| `expo` ~54.0.35 | Platform SDK |
| `expo-router` ~6.0.24 | Navigation |
| `@reduxjs/toolkit` ^2.0.1 | State management |
| `react-redux` ^9.0.4 | React bindings |
| `axios` ^1.7.9 | HTTP client |
| `@react-native-async-storage/async-storage` ^2.0.0 | Token storage |
| `socket.io-client` ^4.8.3 | Real-time (optional) |

## Debugging & Common Issues

### Enable Network Logging
Add to `src/services/api.ts`:
```typescript
this.client.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.data);
    return response;
  },
  (error) => {
    console.log('API Error:', error.config.url, error.response?.data);
    return Promise.reject(error);
  }
);
```

### Check Stored Tokens
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
const token = await AsyncStorage.getItem('accessToken');
console.log('Token:', token);
```

### Test API Directly
```bash
# Get auth token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@farm.com","password":"password123"}'

# Use token to test protected endpoint
curl -X GET http://localhost:4000/farms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "EXPO_PUBLIC_API_URL is not set" | Create `.env.local` with your API URL |
| "401 Unauthorized" | Token expired — auto-refresh should trigger; check `/auth/refresh` endpoint |
| Empty Lists | API returned data but app not parsing — verify response format |
| Network Error | Check API is running, verify CORS headers, confirm URL in `.env.local` |
| CORS Errors | Add `Access-Control-Allow-Origin: *` headers on backend |
| Slow Loading | Check network connection, consider pagination for large datasets |
| Token Not Refreshing | Verify `/auth/refresh` endpoint is working |

## Development

### Project Structure

```
farm-client/mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Auth screens
│   └── (tabs)/             # Main app tabs
├── src/
│   ├── components/         # Reusable components
│   ├── services/           # API services
│   ├── store/              # Redux store
│   └── types/              # TypeScript types
└── package.json
```

### Building

```bash
# Development build
npm start

# Android (EAS)
npm run build:android

# iOS (EAS)
npm run build:ios
```

## Next Steps

1. **Test CRUD Operations** — Implement add/edit/delete screens
2. **Add Pagination** — For large farm/crop lists
3. **Implement Offline Mode** — Install `redux-persist`, cache responses, queue requests
4. **Add Real-time Updates** — Use `socket.io-client` for live data
5. **Deploy to Production** — Configure EAS build, deploy to TestFlight / Google Play

---

**Last Updated**: September 2026 | **Version**: 1.0.0

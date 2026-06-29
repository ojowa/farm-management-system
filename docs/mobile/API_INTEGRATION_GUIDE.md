# Backend API Integration Guide

This document provides detailed instructions for testing and validating the mobile app's backend API integration.

## 1. Environment Setup

### Create `.env.local` file
```bash
# Copy the .env.example file
cp .env.example .env.local

# Edit .env.local with your API URL
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## 2. API Endpoints & Expected Responses

### Authentication Endpoints

#### POST `/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
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
**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/auth/verify-mfa`
**Request:**
```json
{
  "mfaSessionToken": "token_from_login",
  "code": "123456"
}
```

### Farms Endpoint

#### GET `/farms`
**Response:**
```json
{
  "data": [
    {
      "id": "farm-1",
      "name": "Green Valley Farm",
      "location": "District A, Region 1",
      "size": 250,
      "crops": 5,
      "animals": 20,
      "status": "active"
    },
    {
      "id": "farm-2",
      "name": "Harvest Home",
      "location": "District B, Region 1",
      "size": 180,
      "crops": 4,
      "animals": 15,
      "status": "active"
    }
  ]
}
```

**OR (Alternative format):**
```json
[
  {
    "id": "farm-1",
    "name": "Green Valley Farm",
    "location": "District A, Region 1",
    "size": 250,
    "crops": 5,
    "animals": 20,
    "status": "active"
  }
]
```

### Crops Endpoint

#### GET `/crops`
**Response:**
```json
{
  "data": [
    {
      "id": "crop-1",
      "name": "Maize Field A",
      "farm": "Green Valley Farm",
      "type": "Maize",
      "area": 50,
      "plantedDate": "2024-04-15",
      "health": 85,
      "status": "growing"
    }
  ]
}
```

### Livestock Endpoint

#### GET `/livestocks`
**Response:**
```json
{
  "data": [
    {
      "id": "livestock-1",
      "name": "Dairy Herd A",
      "breed": "Holstein",
      "quantity": 12,
      "health": "healthy",
      "farm": "Green Valley Farm",
      "lastCheckup": "2024-06-20"
    }
  ]
}
```

### Poultry Endpoint

#### GET `/poultry`
**Response:**
```json
{
  "data": [
    {
      "id": "poultry-1",
      "name": "Layer Flock",
      "breed": "Leghorn",
      "quantity": 200,
      "health": "healthy",
      "farm": "Green Valley Farm",
      "lastCheckup": "2024-06-18"
    }
  ]
}
```

### Finance Endpoint

#### GET `/finance`
**Response:**
```json
{
  "data": [
    {
      "id": "transaction-1",
      "title": "Maize Sale",
      "description": "Harvest sale - Farm A",
      "amount": 2500,
      "type": "income",
      "category": "Sales",
      "date": "2024-06-20"
    },
    {
      "id": "transaction-2",
      "title": "Fertilizer Purchase",
      "description": "NPK 20:20:0",
      "amount": -450,
      "type": "expense",
      "category": "Input Costs",
      "date": "2024-06-19"
    }
  ]
}
```

## 3. Testing with Postman/Insomnia

### Step 1: Get Authentication Token
1. Create a POST request to `http://localhost:3000/api/auth/login`
2. Set header: `Content-Type: application/json`
3. Send body:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```
4. Copy the `accessToken` from the response

### Step 2: Test Protected Endpoints
1. Create a GET request to `http://localhost:3000/api/farms`
2. Set header: `Authorization: Bearer <your-access-token>`
3. Send the request and verify you get farm data

### Step 3: Test Token Refresh
1. Wait for the token to expire (15 minutes by default)
2. When you get a 401 error, the app should automatically refresh
3. Verify the request is retried with the new token

## 4. Response Format Notes

The mobile app is designed to handle two response formats:

### Format 1: Wrapped Response
```json
{
  "data": [...]
}
```

### Format 2: Direct Array
```json
[...]
```

The app checks for `response.data.data` first, then falls back to `response.data`.

## 5. Error Handling

### Expected Error Response
```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "status": 400
}
```

The app will log errors to the console:
```
Failed to fetch farms: Error message
```

## 6. Running the App

```bash
# Install dependencies
pnpm install

# Start the app
pnpm start

# For iOS
pnpm ios

# For Android
pnpm android

# For Web
pnpm web
```

## 7. Testing Checklist

- [ ] Login with valid credentials
- [ ] MFA verification with 6-digit code
- [ ] View farms list (should show real data)
- [ ] View crops list (should show real data)
- [ ] View livestock list (should combine livestock + poultry)
- [ ] View finance transactions (should show income/expense)
- [ ] Filter farms by status
- [ ] Filter crops by farm
- [ ] Filter livestock by type (livestock/poultry)
- [ ] Filter transactions by type (income/expense)
- [ ] Pull-to-refresh on all screens
- [ ] Add/Edit/Delete operations
- [ ] Token refresh on 401 response
- [ ] Proper error messages on network failure

## 8. Debugging

### Enable Network Logging
Add this to `src/services/api.ts`:
```typescript
// After creating axios instance, add interceptor:
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

### Check AsyncStorage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// In any screen:
const token = await AsyncStorage.getItem('accessToken');
console.log('Stored token:', token);
```

## 9. Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:** 
- Token has expired
- API is automatically refreshing (check console)
- If refresh fails, user is redirected to login

### Issue: Empty Lists
**Solution:**
- Check API is returning data
- Verify response format matches expectations
- Check console for error messages

### Issue: CORS Errors
**Solution:**
- Ensure API has proper CORS headers
- Add headers: `Access-Control-Allow-Origin: *`
- For local development, this is usually not an issue

### Issue: Slow Loading
**Solution:**
- Check network connection
- Verify API response time
- Consider adding pagination for large datasets

## 10. Next Steps

1. **Implement Create/Update/Delete Operations**
   - Add screens for creating/editing farms, crops, etc.
   - Use `farmsAPI.create()`, `farmsAPI.update()`, `farmsAPI.delete()`

2. **Add Real-time Updates**
   - Integrate Socket.io for live data updates
   - Implement `/socket.io-client` (already in dependencies)

3. **Add Offline Support**
   - Install `redux-persist`
   - Cache API responses in Redux
   - Queue requests while offline

4. **Improve Error Handling**
   - Add toast notifications for errors
   - Implement retry logic with exponential backoff
   - Add user-friendly error messages

5. **Add Analytics**
   - Track which screens users visit
   - Monitor API performance
   - Debug issues in production

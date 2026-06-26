# Getting Started - Troubleshooting Guide

## Issue 1: app.json EmptyJsonFileError ✅ FIXED

**Problem**: `EmptyJsonFileError: Cannot parse an empty JSON string`

**Cause**: The `app.json` file was empty, preventing Expo from starting.

**Solution**: ✅ Restored `app.json` with valid Expo configuration.

**Next Step**: Try running `pnpm start` again.

---

## Issue 2: API Verification - Login Failed

**Problem**: `Login failed:` when running `verify-api.js`

**Cause**: This is EXPECTED if your backend is not running.

### Check if Backend is Running

```bash
# Option 1: Check if API server is listening
curl http://localhost:3000/api/auth/login

# You should get a response (not a connection error)
```

### If Backend is NOT Running

**For API Gateway/Backend:**

```bash
cd ../../api-gateway
# or
cd ../../services/auth-service
# or wherever your backend API is

# Start the backend
npm start
# or
pnpm start
```

### If Backend IS Running but Auth Failed

Check these things:

1. **Verify API URL in .env.local**
   ```bash
   cat .env.local
   # Should show: EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

2. **Check Backend Auth Endpoint**
   ```bash
   # Test with curl
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   
   # Should return: accessToken, refreshToken, user data
   # Or: error message with status code
   ```

3. **Common Backend Issues**
   - Database not connected
   - Missing test user in database
   - CORS not configured
   - Port already in use

---

## Next Steps

### Step 1: Fix Backend Issues (if needed)

```bash
# Start in one terminal
cd services/auth-service
pnpm start

# Or if using api-gateway
cd api-gateway
pnpm start
```

### Step 2: Verify Backend is Working

```bash
# In another terminal
cd apps/mobile
node verify-api.js

# Expected output (if backend working):
# ✓ Login successful
# ✓ /farms: X items returned
# ✓ /crops: X items returned
# ✓ /livestocks: X items returned
# ✓ /poultry: X items returned
# ✓ /finance: X items returned
```

### Step 3: Start Mobile App

```bash
# In another terminal
cd apps/mobile
pnpm start

# Follow on-screen instructions:
# - Press 'i' for iOS simulator
# - Press 'a' for Android simulator  
# - Press 'w' for web browser
# - Scan QR code with Expo Go app on phone
```

---

## Troubleshooting by Error Message

### "Cannot connect to http://localhost:3000/api"
- Backend service is not running
- **Fix**: Start backend service first

### "Login failed: 401 Unauthorized"
- Authentication credentials wrong
- User doesn't exist in backend database
- **Fix**: Check backend database has test user

### "EmptyJsonFileError on app.json"
- JSON file is malformed
- **Fix**: ✅ Already fixed in this session

### "Cannot find module 'expo-router'"
- Dependencies not installed
- **Fix**: Run `pnpm install` in `apps/mobile`

### "Port 8081 already in use"
- Expo Metro bundler port is busy
- **Fix**: Kill other processes or use different port

### "Android Studio/Simulator not found"
- Android environment not set up
- **Fix**: Use iOS simulator or web (`pnpm web`)

---

## Development Setup Checklist

- [ ] `.env.local` exists in `apps/mobile/`
- [ ] Backend API is running (on configured port)
- [ ] Test credentials exist in backend database
- [ ] `pnpm install` completed without errors
- [ ] `app.json` is valid JSON (not empty) ✅
- [ ] Can reach backend: `curl http://localhost:3000/api/auth/login`
- [ ] `node verify-api.js` shows all tests passing

---

## Full Setup Workflow

```bash
# Terminal 1: Start Backend
cd services/auth-service  # or api-gateway
pnpm install
pnpm start
# Wait for: "Server listening on port 3000"

# Terminal 2: Verify Backend (in 30 seconds)
cd apps/mobile
node verify-api.js
# Wait for: "All 5 endpoint tests passed!"

# Terminal 3: Start Mobile App
cd apps/mobile
pnpm install  # if not already done
pnpm start
# Scan QR code or press 'a'/'i'/'w'
```

---

## Testing the App

After app starts:

1. **Login Screen**
   - Email: `test@example.com`
   - Password: `password123`
   - Should redirect to Dashboard

2. **Dashboard Screen**
   - Should show real stats from backend
   - Active Farms, Total Crops, Livestock, Revenue
   - Quick action cards

3. **Farms Screen**
   - Should list real farms from `/farms` endpoint
   - Pull down to refresh
   - Can filter by status

4. **Other Screens**
   - Crops, Livestock, Finance, Settings
   - All should load data from backend

---

## Still Having Issues?

1. Check the detailed guides:
   - [`QUICK_START.md`](QUICK_START.md) - 3-step setup
   - [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md) - API debugging
   - [`TESTING_CHECKLIST.md`](TESTING_CHECKLIST.md) - Full validation
   - [`BACKEND_INTEGRATION_README.md`](BACKEND_INTEGRATION_README.md) - Complete guide

2. Check console output:
   - When running `pnpm start`, check output for errors
   - Look for network/API related messages
   - Check if auth token is being stored

3. Verify backend:
   - Is backend process running?
   - Are database migrations run?
   - Are test users created?
   - Are CORS headers configured?

---

## Files Fixed

- ✅ `app.json` - Restored with valid Expo configuration
- ✅ `.env.local` - Already created with API_URL

**Ready to start!** 🚀

```bash
cd apps/mobile
pnpm start
```

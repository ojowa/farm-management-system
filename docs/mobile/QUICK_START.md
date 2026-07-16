# Backend Integration - Quick Start Guide

**Status**: ✅ COMPLETE - All screens connected to real APIs

## What's Done

✅ All 5 screens now fetch real data from backend APIs (no more mock data)
✅ Automatic token refresh on authentication errors
✅ Comprehensive error handling
✅ Environment configuration via `.env.local`
✅ Complete documentation and testing guides

## Get Started in 3 Steps

### Step 1: Configure Your API URL
```bash
cd apps/mobile

# Create .env.local file
cp .env.example .env.local

# Edit .env.local and set your API URL
# EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

### Step 2: Verify Backend is Working
```bash
# Test all API endpoints
node verify-api.js

# Expected output: "All 5 endpoint tests passed!"
```

### Step 3: Start the App
```bash
pnpm install
pnpm start

# Scan QR code with your phone camera
# Or press 'i' for iOS simulator / 'a' for Android simulator
```

## Files Modified (5 screens)

| Screen | Changes |
|--------|---------|
| **FarmsScreen** | Now calls `farmsAPI.list()` |
| **CropsScreen** | Now calls `cropsAPI.list()` |
| **LivestockScreen** | Now calls both `livestockAPI.list()` and `poultryAPI.list()` |
| **FinanceScreen** | Now calls `financeAPI.list()` |
| **DashboardScreen** | Now fetches data from all 5 APIs for dynamic stats |

## Files Created (6 documentation files)

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment configuration |
| `.env.local` | Local development environment (DO NOT COMMIT) |
| `.gitignore` | Excludes env files from git |
| `API_INTEGRATION_GUIDE.md` | Complete API documentation |
| `INTEGRATION_SUMMARY.md` | Technical implementation details |
| `TESTING_CHECKLIST.md` | Full testing validation checklist |
| `BACKEND_INTEGRATION_README.md` | Complete integration guide |
| `verify-api.js` | Script to verify backend APIs work |

## API Response Format Support

The implementation handles **both** common response formats:

```json
// Format 1: Wrapped
{ "data": [...] }

// Format 2: Direct
[...]
```

Both formats work automatically - no configuration needed!

## Error Handling

All screens include proper error handling:
- Network errors → "Failed to load data" message
- 401 Unauthorized → Automatic token refresh
- Empty lists → "No items to display" message
- API errors → Logged to console

## Testing Checklist

Quick validation before considering integration complete:

- [ ] Login works with valid credentials
- [ ] Dashboard shows real farm/crop/livestock/revenue stats
- [ ] Farms screen shows real farm list
- [ ] Crops screen shows real crop list
- [ ] Livestock screen shows livestock + poultry combined
- [ ] Finance screen shows real transactions with correct totals
- [ ] Pull-to-refresh updates data
- [ ] Filters work correctly
- [ ] No console errors
- [ ] Token refresh works (wait 15+ min or force expiry)

## Expected Data Structure

### Farms Response
```json
{
  "id": "farm-1",
  "name": "Green Valley Farm",
  "location": "District A",
  "size": 250,
  "crops": 5,
  "animals": 20,
  "status": "active"
}
```

### Crops Response
```json
{
  "id": "crop-1",
  "name": "Maize",
  "farm": "Green Valley Farm",
  "type": "Maize",
  "area": 50,
  "plantedDate": "2024-04-15",
  "health": 85,
  "status": "growing"
}
```

### Livestock Response
```json
{
  "id": "livestock-1",
  "name": "Dairy Herd A",
  "breed": "Holstein",
  "quantity": 12,
  "health": "healthy",
  "farm": "Green Valley Farm",
  "lastCheckup": "2024-06-20"
}
```

### Poultry Response
```json
{
  "id": "poultry-1",
  "name": "Layer Flock",
  "breed": "Leghorn",
  "quantity": 200,
  "health": "healthy",
  "farm": "Green Valley Farm",
  "lastCheckup": "2024-06-18"
}
```

### Finance Response
```json
{
  "id": "transaction-1",
  "title": "Maize Sale",
  "description": "Harvest sale",
  "amount": 2500,
  "type": "income",
  "category": "Sales",
  "date": "2024-06-20"
}
```

## Common Issues & Solutions

### "EXPO_PUBLIC_API_URL is not set"
**Solution**: Create `.env.local` with your API URL

### "401 Unauthorized"
**Solution**: Backend is returning 401 - check your auth endpoint

### Empty Lists
**Solution**: API returned data but app not parsing it - check response format

### Network Error
**Solution**: 
- Verify API is running
- Check CORS headers on backend
- Verify URL in `.env.local` is correct

### Token Not Refreshing
**Solution**: Check that `/auth/refresh` endpoint is working

## Environment Variables

```env
# Development
EXPO_PUBLIC_API_URL=http://localhost:4000/api

# Staging
EXPO_PUBLIC_API_URL=https://staging-api.example.com/api

# Production
EXPO_PUBLIC_API_URL=https://api.example.com/api
```

## API Endpoints Summary

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

## Debugging Commands

```bash
# Check if env file is set correctly
echo $EXPO_PUBLIC_API_URL

# Test API endpoint directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/farms

# View app logs
pnpm start  # Shows console output
```

## Next Steps

After successful integration:

1. **Test CRUD Operations**
   - Implement add/edit/delete screens
   - Test create/update/delete endpoints

2. **Add Pagination**
   - For large farm/crop lists
   - Implement page parameter in API calls

3. **Implement Offline Mode**
   - Install: `pnpm add redux-persist`
   - Cache API responses in Redux
   - Queue requests when offline

4. **Add Real-time Updates**
   - Use `socket.io-client` (already installed)
   - Subscribe to farm/crop changes
   - Auto-refresh screens on updates

5. **Deploy to Production**
   - Configure EAS build
   - Deploy to TestFlight (iOS) / Google Play (Android)

## Performance Tips

- ✅ Parallel API calls on Dashboard (loads faster)
- ✅ Automatic token refresh (no user interruption)
- ✅ Proper error handling (app doesn't crash)
- ✅ Response format flexibility (less backend constraints)

## Support Documentation

- 📖 **Full Guide**: See `BACKEND_INTEGRATION_README.md`
- 📋 **Testing**: See `TESTING_CHECKLIST.md`
- 🔧 **Technical**: See `INTEGRATION_SUMMARY.md`
- 📚 **API Docs**: See `API_INTEGRATION_GUIDE.md`
- 🔍 **Verification**: Run `node verify-api.js`

---

**You're all set!** 🚀

The mobile app is now connected to your backend APIs and ready for testing.

Start with: `pnpm start`
Then test with: `node verify-api.js`

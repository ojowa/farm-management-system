# Mobile App — Testing & Validation

## Testing Checklist

### Prerequisites
- [ ] Backend APIs are running on configured URL
- [ ] CORS headers are properly configured on backend
- [ ] `.env.local` file is created with correct `EXPO_PUBLIC_API_URL`
- [ ] Mobile app dependencies are installed: `npm install`

### Authentication Tests
- [ ] User can login with valid credentials
- [ ] Access token is stored in AsyncStorage
- [ ] Refresh token is stored in AsyncStorage
- [ ] MFA verification works (if enabled)
- [ ] Invalid credentials show error message
- [ ] User can logout and tokens are cleared

### API Response Format Tests
- [ ] Farms list returns data (try both wrapped and direct array format)
- [ ] Crops list returns data
- [ ] Livestock list returns data
- [ ] Poultry list returns data
- [ ] Finance list returns data

### Screen Functionality Tests

#### Farms Screen
- [ ] Real farms data displays after load
- [ ] Farm count matches API response
- [ ] Filter by status works (all/active/inactive)
- [ ] Pull-to-refresh updates list
- [ ] Loading spinner shows while fetching
- [ ] Empty state displays if no farms
- [ ] View/Edit/Delete buttons are functional
- [ ] Add farm button navigates correctly

#### Crops Screen
- [ ] Real crops data displays after load
- [ ] Crop health bars render correctly
- [ ] Status badges show proper colors
- [ ] Pull-to-refresh updates list
- [ ] Empty state displays if no crops
- [ ] View/Edit/Delete buttons work

#### Livestock Screen
- [ ] Livestock items display from livestock API
- [ ] Poultry items display from poultry API
- [ ] Filter by type works (all/livestock/poultry)
- [ ] Health indicators show correct colors
- [ ] Pull-to-refresh updates list
- [ ] Combined data from both APIs

#### Finance Screen
- [ ] Real transactions display
- [ ] Income transactions shown in green
- [ ] Expense transactions shown in red
- [ ] Filter by type works (all/income/expense)
- [ ] Summary cards calculate correctly:
  - [ ] Total Income = sum of income amounts
  - [ ] Total Expense = absolute value of expense sum
  - [ ] Net Profit = income - expense
- [ ] Pull-to-refresh updates list

#### Dashboard Screen
- [ ] Stats load from real API data
- [ ] Active farms count correct
- [ ] Total crops count correct
- [ ] Total livestock count correct
- [ ] Total revenue displays correct
- [ ] Quick action cards navigate to correct screens
- [ ] User greeting shows correct name

### Error Handling Tests
- [ ] Network error shows appropriate message
- [ ] Invalid token triggers automatic refresh
- [ ] Refresh token expiry redirects to login
- [ ] Console logs show API calls and responses
- [ ] Errors don't crash the app

### Performance Tests
- [ ] Initial load time acceptable (< 3 seconds)
- [ ] Pull-to-refresh completes quickly
- [ ] Switching between tabs is smooth
- [ ] Large lists scroll smoothly (pagination if needed)

### Integration Tests
- [ ] Token automatically refreshes on 401
- [ ] Axios interceptors add Bearer token correctly
- [ ] Multiple API calls happen in parallel
- [ ] Data persists across app navigation
- [ ] Session restores on app restart

### Configuration Tests
- [ ] `.env.example` file is documented
- [ ] `.env.local` is in `.gitignore`
- [ ] API URL can be changed via `.env` file
- [ ] Different environments (dev/staging/prod) can be configured

### Passing All Tests?
- [ ] Yes! Backend integration is working correctly
- [ ] No — Document which tests failed below

### Documentation
- [ ] All expected API responses documented
- [ ] Error codes and messages documented
- [ ] Testing instructions clear
- [ ] Troubleshooting guide available

---

## Implementation Notes

### Files Created
| File | Purpose |
|------|---------|
| `.env.example` | Template showing required environment variables |
| `.env.local` | Local development configuration (DO NOT commit) |
| `.gitignore` | Excludes environment files and build artifacts |
| `verify-api.js` | Script to verify all backend APIs work |

### Files Modified

#### `src/screens/app/FarmsScreen.tsx`
- Added import: `farmsAPI` from services
- Replaced mock data with `await farmsAPI.list()`
- Handles both response formats: `response.data.data || response.data`

**Before:**
```typescript
const mockFarms: Farm[] = [
  { id: '1', name: 'Green Valley Farm', ... },
];
setFarms(mockFarms);
```

**After:**
```typescript
const response = await farmsAPI.list();
const farmsData = response.data.data || response.data;
setFarms(Array.isArray(farmsData) ? farmsData : []);
```

#### `src/screens/app/CropsScreen.tsx`
- Added import: `cropsAPI` from services
- Replaced mock crops with `await cropsAPI.list()`

#### `src/screens/app/LivestockScreen.tsx`
- Added imports: `livestockAPI`, `poultryAPI` from services
- Parallel API calls:
```typescript
const [livestockResponse, poultryResponse] = await Promise.all([
  livestockAPI.list(),
  poultryAPI.list(),
]);
```
- Combined livestock and poultry data with `type: 'livestock'` or `type: 'poultry'`

#### `src/screens/app/FinanceScreen.tsx`
- Added import: `financeAPI` from services
- Replaced mock transactions with `await financeAPI.list()`

#### `src/screens/app/DashboardScreen.tsx`
- Added imports for all 5 APIs
- Added `stats` state for dynamic data
- `loadDashboardData()` fetches from all 5 APIs in parallel
- Calculates: active farms, total crops, total livestock (sum of quantities), revenue (sum of income)

### Error Handling Pattern
All screens use consistent error handling:
```typescript
try {
  setLoading(true);
  const response = await API.list();
  const data = response.data.data || response.data;
  setData(Array.isArray(data) ? data : []);
} catch (error: any) {
  console.error('Failed to fetch data:', error);
  const errorMessage = error.response?.data?.message 
    || 'Failed to load data. Please try again.';
} finally {
  setLoading(false);
}
```

### Token Management
Existing Axios interceptor handles:
- Automatic Bearer token injection on all requests
- Automatic token refresh on 401 responses
- Token storage in AsyncStorage
- Redirect to login on refresh failure

No changes needed to `src/services/api.ts`.

### Key Improvements
- All screens now fetch from actual APIs instead of mock data
- Comprehensive error handling with user-friendly messages
- Supports multiple response formats
- Parallel API calls for performance
- Consistent patterns across all screens

---

## Next Steps / Roadmap

### Immediate (Optional)
- [ ] Test with real backend APIs
- [ ] Add toast notifications for errors
- [ ] Implement CRUD operations (Create/Edit/Delete)

### Short-term
- [ ] Add pagination for large datasets
- [ ] Implement Redux Persist for offline mode
- [ ] Add Socket.io for real-time updates

### Long-term
- [ ] Add push notifications
- [ ] Implement analytics tracking
- [ ] Deploy to TestFlight / Google Play

---

**Last Updated**: June 2026 | **Version**: 1.0.0

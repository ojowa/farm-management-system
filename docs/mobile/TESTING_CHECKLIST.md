# Backend Integration Testing Checklist

## Prerequisites
- [ ] Backend APIs are running on configured URL
- [ ] CORS headers are properly configured on backend
- [ ] `.env.local` file is created with correct `EXPO_PUBLIC_API_URL`
- [ ] Mobile app dependencies are installed: `pnpm install`

## Authentication Tests
- [ ] User can login with valid credentials
- [ ] Access token is stored in AsyncStorage
- [ ] Refresh token is stored in AsyncStorage
- [ ] MFA verification works (if enabled)
- [ ] Invalid credentials show error message
- [ ] User can logout and tokens are cleared

## API Response Format Tests
- [ ] Farms list returns data (try both wrapped and direct array format)
- [ ] Crops list returns data
- [ ] Livestock list returns data
- [ ] Poultry list returns data
- [ ] Finance list returns data

## Screen Functionality Tests

### Farms Screen
- [ ] Real farms data displays after load
- [ ] Farm count matches API response
- [ ] Filter by status works (all/active/inactive)
- [ ] Pull-to-refresh updates list
- [ ] Loading spinner shows while fetching
- [ ] Empty state displays if no farms
- [ ] View/Edit/Delete buttons are functional
- [ ] Add farm button navigates correctly

### Crops Screen
- [ ] Real crops data displays after load
- [ ] Crop health bars render correctly
- [ ] Status badges show proper colors
- [ ] Pull-to-refresh updates list
- [ ] Empty state displays if no crops
- [ ] View/Edit/Delete buttons work

### Livestock Screen
- [ ] Livestock items display from livestock API
- [ ] Poultry items display from poultry API
- [ ] Filter by type works (all/livestock/poultry)
- [ ] Health indicators show correct colors
- [ ] Pull-to-refresh updates list
- [ ] Combined data from both APIs

### Finance Screen
- [ ] Real transactions display
- [ ] Income transactions shown in green
- [ ] Expense transactions shown in red
- [ ] Filter by type works (all/income/expense)
- [ ] Summary cards calculate correctly:
  - [ ] Total Income = sum of income amounts
  - [ ] Total Expense = absolute value of expense sum
  - [ ] Net Profit = income - expense
- [ ] Pull-to-refresh updates list

### Dashboard Screen
- [ ] Stats load from real API data
- [ ] Active farms count correct
- [ ] Total crops count correct
- [ ] Total livestock count correct
- [ ] Total revenue displays correct
- [ ] Quick action cards navigate to correct screens
- [ ] User greeting shows correct name

## Error Handling Tests
- [ ] Network error shows appropriate message
- [ ] Invalid token triggers automatic refresh
- [ ] Refresh token expiry redirects to login
- [ ] Console logs show API calls and responses
- [ ] Errors don't crash the app

## Performance Tests
- [ ] Initial load time acceptable (< 3 seconds)
- [ ] Pull-to-refresh completes quickly
- [ ] Switching between tabs is smooth
- [ ] Large lists scroll smoothly (pagination if needed)

## Integration Tests
- [ ] Token automatically refreshes on 401
- [ ] Axios interceptors add Bearer token correctly
- [ ] Multiple API calls happen in parallel
- [ ] Data persists across app navigation
- [ ] Session restores on app restart

## Configuration Tests
- [ ] `.env.example` file is documented
- [ ] `.env.local` is in `.gitignore`
- [ ] API URL can be changed via `.env` file
- [ ] Different environments (dev/staging/prod) can be configured

## Passing All Tests?
- [ ] Yes! Backend integration is working correctly ✅
- [ ] No - Document which tests failed in the README

## Documentation
- [ ] API_INTEGRATION_GUIDE.md is complete
- [ ] All expected API responses documented
- [ ] Error codes and messages documented
- [ ] Testing instructions clear
- [ ] Troubleshooting guide available

## Next Phase
After all tests pass, proceed with:
1. Implement CRUD operations (Create/Edit/Delete)
2. Add pagination for large datasets
3. Implement Redux Persist for offline mode
4. Add Socket.io for real-time updates
5. Add push notifications
6. Enhance error messages with toast notifications

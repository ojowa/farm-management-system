# Mobile App - Backend API Integration Guide

This folder contains a fully functional mobile app for the Farm Management System with complete backend API integration.

## 📁 Quick Start

### 1. Install Dependencies
```bash
cd apps/mobile
pnpm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and update with your API URL:
```bash
cp .env.example .env.local
# Edit .env.local:
# EXPO_PUBLIC_API_URL=http://your-api-server.com/api
```

### 3. Verify Backend APIs
Before running the app, verify your backend is working:
```bash
# Set environment variables
export API_URL=http://localhost:4000/api
export TEST_EMAIL=test@example.com
export TEST_PASSWORD=password123

# Run verification script
node verify-api.js
```

Expected output:
```
✓ Login successful - Token received: eyJhbGciOiJIUzI1NiIs...
✓ /farms: 3 items returned
✓ /crops: 5 items returned
✓ /livestocks: 2 items returned
✓ /poultry: 1 items returned
✓ /finance: 12 items returned
✓ All 5 endpoint tests passed!
```

### 4. Run the App
```bash
# Start Expo development server
pnpm start

# For iOS (Mac only)
pnpm ios

# For Android
pnpm android

# For Web
pnpm web
```

## 📚 Documentation Files

### [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)
Complete API documentation including:
- All endpoint specifications
- Expected request/response formats
- Authentication flow
- Error handling
- Testing with Postman/Insomnia
- Debugging guide

### [`INTEGRATION_SUMMARY.md`](INTEGRATION_SUMMARY.md)
Technical summary of all changes made:
- Files created
- Files modified
- API response handling patterns
- Error handling implementation
- Environment configuration

### [`TESTING_CHECKLIST.md`](TESTING_CHECKLIST.md)
Comprehensive testing checklist to validate:
- Authentication flows
- API response formats
- Screen functionality
- Error handling
- Performance metrics

### [`SCREENS_README.md`](SCREENS_README.md)
Architecture documentation for all screens:
- Feature overview
- Screen descriptions
- Redux state structure
- Component library
- Navigation patterns

## 🔄 What's Been Implemented

✅ **All 4 Authentication Screens**
- Login with email/password
- Registration with terms acceptance
- Password reset flow
- MFA/2FA with 6-digit OTP

✅ **All 6 App Screens with Real Data**
- Dashboard with dynamic statistics
- Farms management with filtering
- Crops tracking with health visualization
- Livestock & Poultry combined management
- Finance tracking with income/expense
- Settings with profile and preferences

✅ **Backend API Integration**
- Real API calls (no mock data)
- Automatic token refresh on 401
- Parallel API requests for performance
- Flexible response format handling
- Comprehensive error handling
- Network error recovery

✅ **Redux State Management**
- Authentication state (login, register, logout, MFA)
- UI state (toasts, loading, selections)
- AsyncStorage persistence
- Session restoration on app launch

✅ **Complete Navigation**
- File-based routing with Expo Router
- Tab-based app navigation (6 tabs)
- Conditional auth/app stack
- MFA flow integration

## 🚀 Environment Variables

### Development (`.env.local`)
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

### Staging
```env
EXPO_PUBLIC_API_URL=https://staging-api.yourdomain.com/api
```

### Production
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
```

**Note**: Do NOT commit `.env.local` to git (added to `.gitignore`)

## 🧪 Testing Workflow

1. **Verify Backend APIs**
   ```bash
   node verify-api.js
   ```

2. **Run App**
   ```bash
   pnpm start
   ```

3. **Manual Testing**
   - Follow [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
   - Test each screen's functionality
   - Verify error handling
   - Check loading states

4. **Debug Issues**
   - Check console logs for API errors
   - Use Postman to test endpoints directly
   - Verify response format matches expectations
   - Check AsyncStorage for tokens

## 📱 Screens Overview

### Authentication Stack
```
Login → Dashboard (on success)
  ↓
Register → Login
  ↓
Forgot Password → Reset → Login
  ↓
MFA Verification → Dashboard
```

### App Stack (Tabs)
```
Dashboard (🏠)
├─ Dynamic farm/crop/livestock/finance stats
├─ Quick action cards
└─ Recent activity feed

Farms (🌾)
├─ List all farms with filtering
├─ View/Edit/Delete operations
└─ Pull-to-refresh

Crops (🌱)
├─ Track crop health with progress bars
├─ View by farm
└─ Harvest status tracking

Livestock (🐄)
├─ Combined livestock & poultry
├─ Health status indicators
└─ Filter by type

Finance (💰)
├─ Income/expense tracking
├─ Summary cards with calculations
└─ Transaction filtering

Settings (⚙️)
├─ User profile
├─ Account settings
└─ Logout
```

## 🔑 Key Features

### Authentication
- Email/password login
- User registration
- Forgot password reset
- Two-factor authentication (MFA/2FA)
- Automatic token refresh
- Session persistence

### Data Management
- Real-time data from backend APIs
- Pull-to-refresh functionality
- Filtering and search
- Empty state handling
- Loading states and skeletons

### User Experience
- Responsive design
- Error messages
- Loading indicators
- Form validation
- Session restoration

## 🛠️ API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | User authentication |
| `/auth/register` | POST | New user registration |
| `/auth/refresh` | POST | Token refresh |
| `/auth/verify-mfa` | POST | MFA verification |
| `/farms` | GET | List farms |
| `/crops` | GET | List crops |
| `/livestocks` | GET | List livestock |
| `/poultry` | GET | List poultry |
| `/finance` | GET | List transactions |

## 🔐 Security Features

- JWT token-based authentication
- Automatic token refresh before expiry
- Tokens stored securely in AsyncStorage
- Bearer token injection on all requests
- 401 handling with automatic refresh
- Session validation on app launch

## 📊 State Management

### Redux Store Structure
```typescript
{
  auth: {
    user,           // Current user
    accessToken,    // JWT token
    refreshToken,   // Refresh token
    isAuthenticated,
    loading,
    error,
    mfaRequired,    // If MFA is needed
    mfaSessionToken
  },
  ui: {
    toasts: [],     // Notifications
    globalLoading,  // App-wide loading
    selectedFarmId, // Selected filters
    selectedCropId
  }
}
```

## 🐛 Debugging

### Enable Network Logging
Add to `src/services/api.ts`:
```typescript
this.client.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.data);
    return response;
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
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use token to test protected endpoint
curl -X GET http://localhost:4000/api/farms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📦 Dependencies

### Core
- `react-native` 0.81.5
- `expo` ~54.0.35
- `expo-router` ~6.0.24

### State Management
- `@reduxjs/toolkit` ^2.0.1
- `react-redux` ^9.0.4

### HTTP Client
- `axios` ^1.7.9

### Storage
- `@react-native-async-storage/async-storage` ^2.0.0

### Real-time (Optional)
- `socket.io-client` ^4.8.1

## 🚀 Next Steps

After successful API integration:

### Phase 2: Enhanced Features
- [ ] Implement CRUD operations (Create/Edit/Delete)
- [ ] Add image uploads
- [ ] Implement pagination for large datasets
- [ ] Add search functionality
- [ ] Add sorting options

### Phase 3: Offline Support
- [ ] Install `redux-persist`
- [ ] Cache API responses
- [ ] Queue requests while offline
- [ ] Sync when back online

### Phase 4: Real-time Updates
- [ ] Integrate Socket.io
- [ ] Subscribe to data changes
- [ ] Auto-refresh on updates
- [ ] Push notifications

### Phase 5: Polish & Deployment
- [ ] Add app icons and splash screens
- [ ] Implement error reporting (Sentry)
- [ ] Add analytics tracking
- [ ] Configure EAS build
- [ ] Deploy to TestFlight/Google Play

## 📞 Support Resources

- **Backend API Issues**: Check [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)
- **Testing Issues**: Follow [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
- **Architecture Questions**: See [SCREENS_README.md](SCREENS_README.md)
- **Implementation Details**: Read [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)

## ✅ Validation Checklist

Before considering integration complete:

- [ ] All 5 API endpoints responding with data
- [ ] Login/logout flow working
- [ ] MFA verification working
- [ ] All 6 screens showing real data
- [ ] Pull-to-refresh updating data
- [ ] Filters working correctly
- [ ] Error messages displaying
- [ ] Token refresh working automatically
- [ ] Session persists across restarts
- [ ] No console errors
- [ ] All screens responsive

## 📄 License

Part of the Farm Management System project.

---

**Last Updated**: June 2026
**Version**: 1.0.0
**Status**: Ready for Backend Integration Testing ✅

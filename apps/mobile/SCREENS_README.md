# Farm Management Mobile App

A comprehensive React Native mobile application for managing farm operations, built with Expo, Redux Toolkit, and TypeScript.

## 🎯 Features

### Authentication Screens
- **Login Screen**: Email/password authentication with validation
- **Register Screen**: New user registration with terms acceptance
- **Forgot Password Screen**: Multi-step password reset flow
- **MFA Screen**: 6-digit OTP verification for two-factor authentication

### App Screens
- **Dashboard**: Overview of farms, crops, livestock, and financial summary
- **Farms**: Browse and manage all farm properties with filtering
- **Crops**: Track crop planting, growth, health monitoring, and harvest tracking
- **Livestock & Poultry**: Manage animal inventory with health status tracking
- **Finance**: Income/expense tracking with financial reports and analytics
- **Settings**: User profile, preferences, security settings, and support

## 📁 Project Structure

```
apps/mobile/
├── app/                          # Expo Router entry points
│   ├── _layout.tsx              # Root navigation layout
│   ├── mfa.tsx                  # MFA screen
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   └── (app)/
│       ├── _layout.tsx          # Tab navigation layout
│       ├── index.tsx            # Dashboard
│       ├── farms.tsx
│       ├── crops.tsx
│       ├── livestock.tsx
│       ├── finance.tsx
│       └── settings.tsx
├── src/
│   ├── store/
│   │   ├── store.ts             # Redux store configuration
│   │   └── slices/
│   │       ├── authSlice.ts      # Auth state management
│   │       └── uiSlice.ts        # UI state management
│   ├── services/
│   │   └── api.ts               # API client & endpoints
│   ├── hooks/
│   │   └── useAuth.ts           # Custom auth hook
│   ├── components/
│   │   └── common/
│   │       └── UIComponents.tsx  # Reusable UI components
│   └── screens/
│       ├── auth/
│       │   ├── LoginScreen.tsx
│       │   ├── RegisterScreen.tsx
│       │   ├── ForgotPasswordScreen.tsx
│       │   └── MFAVerificationScreen.tsx
│       └── app/
│           ├── DashboardScreen.tsx
│           ├── FarmsScreen.tsx
│           ├── CropsScreen.tsx
│           ├── LivestockScreen.tsx
│           ├── FinanceScreen.tsx
│           └── SettingsScreen.tsx
├── package.json
└── tsconfig.json
```

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit
- **Navigation**: Expo Router (file-based routing)
- **HTTP Client**: Axios with token refresh interceptors
- **Storage**: AsyncStorage for persistent data
- **TypeScript**: Full type safety
- **Styling**: React Native StyleSheet

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ and npm/pnpm
- Expo CLI: `npm install -g expo-cli`

### Install Dependencies
```bash
cd apps/mobile
pnpm install
# or
npm install
```

### Environment Configuration
Create a `.env` file in the mobile app directory:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_API_GATEWAY=http://localhost:3000
```

### Run the App

#### Development
```bash
pnpm start
# or
npm start
```

Then choose:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web
- `j` for Expo Go

#### Build for Production
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Web
pnpm web
```

## 📱 Screens Details

### Auth Screens

#### Login Screen
- Email validation (format check)
- Password validation (minimum 8 characters)
- "Forgot Password" link for password reset
- "Sign Up" link for new users
- Error display with helpful messages
- Loading state during authentication

#### Register Screen
- Full name, email, password fields
- Password confirmation matching
- Terms of Service acceptance checkbox
- Form validation with error messages
- Age and security requirements display

#### Forgot Password Screen
- 2-step process: Request reset code → Reset password
- Email validation
- Reset code input
- New password creation and confirmation
- Success notification with auto-redirect

#### MFA Verification Screen
- 6-digit code input with individual fields
- Auto-focus and auto-advance to next field
- Copy-paste support for codes
- Resend code with countdown timer (30s)
- Clear error messages

### App Screens

#### Dashboard
- Greeting with user's first name
- Quick statistics (farms, crops, livestock, revenue)
- Quick action cards for main features
- Recent activity feed
- Pull-to-refresh support

#### Farms
- List view with farm details
- Filter by status (Active/Inactive)
- Farm statistics (size, crops, animals)
- View, Edit, Delete actions
- Add new farm button
- Pull-to-refresh

#### Crops
- Crop tracking with health indicators
- Visual health bar (0-100%)
- Crop type, area, farm assignment
- Status badges (Growing/Harvesting/Completed)
- Edit and view options
- Pull-to-refresh

#### Livestock & Poultry
- Combined livestock and poultry management
- Filter by type (Livestock/Poultry)
- Health status indicators (Healthy/Sick/Treatment)
- Quantity and breed information
- Last checkup date
- Health management access
- Pull-to-refresh

#### Finance
- Income/Expense summary at top
- Net profit calculation
- Transaction filtering
- Category-based transactions
- Amount, type, and date display
- Pull-to-refresh
- Visual indicators (+ for income, - for expense)

#### Settings
- User profile with avatar initials
- Account management (password, security)
- Preferences (notifications, dark mode, offline mode)
- Support section (help, contact, about)
- Logout with confirmation dialog

## 🔐 Authentication Flow

1. **Login/Register**
   - User submits credentials
   - App sends request to `/auth/login` or `/auth/register`
   - Server returns `accessToken`, `refreshToken`, and `user` data
   - Tokens stored in AsyncStorage

2. **Token Refresh**
   - Access token expires after 15 minutes
   - API interceptor detects 401 response
   - Uses refresh token to get new access token
   - Automatically retries failed request

3. **MFA**
   - If user has MFA enabled, login returns `mfaRequired: true`
   - App navigates to MFA verification screen
   - User enters 6-digit code
   - Server verifies code and returns tokens

4. **Logout**
   - Clears tokens from AsyncStorage
   - Resets Redux auth state
   - Navigates back to login screen

## 📡 API Integration

### Auth Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/verify-mfa` - Verify MFA code
- `GET /auth/profile` - Get current user

### Other Endpoints
- `/farms/*` - Farm management
- `/crops/*` - Crop management
- `/livestocks/*` - Livestock management
- `/poultry/*` - Poultry management
- `/finance/*` - Finance tracking
- `/workers/*` - Worker management

## 🎨 Styling

The app uses React Native's `StyleSheet` API with a consistent color scheme:
- **Primary**: `#2E7D32` (Green)
- **Secondary**: `#1976D2` (Blue)
- **Success**: `#4CAF50` (Green)
- **Error**: `#F44336` (Red)
- **Warning**: `#FF9800` (Orange)

All screens follow Material Design 3 principles with proper spacing, typography, and visual hierarchy.

## 🧪 Testing

To test the authentication flow:
1. Use test credentials: `test@example.com` / `password123`
2. MFA code (if enabled): `123456`
3. Check console logs for API requests/responses

## 📋 Redux State Structure

```typescript
{
  auth: {
    user: User | null
    accessToken: string | null
    refreshToken: string | null
    isAuthenticated: boolean
    loading: boolean
    error: string | null
    mfaRequired: boolean
    mfaSessionToken: string | null
    lastLoginAt: string | null
  },
  ui: {
    toasts: Toast[]
    globalLoading: boolean
    selectedFarmId: string | null
    selectedCropId: string | null
  }
}
```

## 🤝 Contributing

1. Create feature branches for new screens
2. Follow the established component structure
3. Use TypeScript for type safety
4. Test on both iOS and Android
5. Update documentation for new features

## 📝 Notes

- All screens use async/mock data for demonstration
- Replace mock data with actual API calls
- Implement proper error handling and retry logic
- Add loading skeletons for better UX
- Consider implementing offline support with Redux Persist

## 🐛 Known Issues & TODO

- [ ] Offline mode implementation
- [ ] Data caching and persistence
- [ ] Real-time data syncing
- [ ] Push notifications
- [ ] Image upload for user avatar
- [ ] Dark mode theme
- [ ] Accessibility improvements
- [ ] Biometric authentication

## 📞 Support

For issues or questions, contact the development team or check the help center in the Settings screen.

---

**Version**: 1.0.0  
**Last Updated**: June 2024

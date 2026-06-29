# Mobile App Deployment Task List

## Overview
Tasks required to make the Farm Management Mobile app production-ready for iOS App Store and Google Play Store deployment.

---

## ✅ CRITICAL - Must Fix Before Deploy

### 1. Fix Failing Unit Test ✅ **COMPLETED**
- **Issue**: `authSlice.test.ts` had TypeScript errors - mockUser missing required fields (`firstName`, `lastName`, `roleId`)
- **Fix**: Updated test mock to match `User` type from authSlice
- **Status**: **DONE** - All 67 tests passing
- **File**: `apps/mobile/src/__tests__/authSlice.test.ts`

---

## 📱 App Store Assets & Configuration

### 2. Add iOS/Android App Icons and Splash Screens
- **iOS**: 1024x1024 App Store icon, all required sizes (20x20 to 1024x1024)
- **Android**: Adaptive icon (foreground + background), all densities (mdpi to xxxhdpi)
- **Splash**: 2732x2732 for iOS, multiple densities for Android
- **Tools**: `expo-assets`, `eas build --profile production`
- **Priority**: Required for store submission

### 3. Configure EAS Build for Production
- **iOS**: Production profile with auto-increment build number, correct bundle identifier
- **Android**: Production profile with auto-increment versionCode, app-bundle format
- **Credentials**: Apple ID, ASC App ID (iOS); Google Service Account key (Android)
- **File**: `apps/mobile/eas.json`, `apps/mobile/app.json`
- **Priority**: Required for store builds

### 4. Add Privacy Manifests and Required iOS Permissions
- **PrivacyInfo.xcprivacy**: Required for iOS 17+ App Store submission
- **Info.plist entries**:
  - `NSCameraUsageDescription` (photo picker)
  - `NSPhotoLibraryUsageDescription` (image picker)
  - `NSUserTrackingUsageDescription` (if analytics)
  - `NSAppTransportSecurity` (dev HTTP)
- **Priority**: Required for iOS App Store approval

### 5. Configure Android Keystore and Play Console
- **Keystore**: Generate upload keystore for App Bundle signing
- **Play Console**: App listing, content rating, target audience, data safety form
- **google-services.json**: For FCM push notifications
- **Priority**: Required for Google Play submission

---

## 🔗 Deep Linking & Notifications

### 6. Implement Deep Linking and Universal Links
- **Scheme**: `farmapp://` (configured in app.json)
- **iOS**: Associated Domains + `apple-app-site-association`
- **Android**: `assetlinks.json` + Digital Asset Links
- **Test paths**: Password reset, email verification, notification navigation
- **Priority**: Required for production UX

### 7. Add Push Notification Backend Integration
- **Expo Push**: Token registration with backend `/notifications/register`
- **iOS**: APNs configuration (p8 key in Expo)
- **Android**: FCM via `google-services.json`
- **States**: Foreground, background, terminated handling
- **Actions**: Notification categories with actions
- **Priority**: Premium feature for user engagement

---

## 🔐 Premium Features

### 8. Implement Biometric Authentication
- **Library**: `expo-local-authentication`
- **Features**: FaceID/TouchID (iOS), Fingerprint/Face (Android)
- **Storage**: Encrypted credentials in Keychain/Keystore
- **Flow**: Biometric unlock after session timeout, fallback to PIN
- **Priority**: Premium security feature

### 9. Add Offline-First Sync with Conflict Resolution
- **Current**: Basic queue in `offlineApi.ts`
- **Enhance**:
  - Last-write-wins or server-wins conflict resolution
  - Per-item sync status indicators
  - Background sync on connectivity restore
  - Timestamped mutation queue
- **Priority**: Premium offline experience

### 10. Add Image Upload (Camera/Gallery)
- **Library**: `expo-image-picker`
- **Backend**: Presigned URLs (S3/Cloudinary)
- **Features**: Progress, compression, offline queuing
- **Use cases**: Farm photos, crop progress, livestock images
- **Priority**: Premium media feature

### 11. Implement Map Integration for Farm Locations
- **Library**: `react-native-maps`
- **iOS**: Native MapKit
- **Android**: Google Maps SDK
- **Features**: Farm boundaries, field polygons, GPS navigation
- **Priority**: Premium location feature

---

## 🧪 Testing & Quality

### 12. Add Comprehensive E2E Tests
- **Tool**: Maestro (recommended) or Detox
- **Critical paths**:
  - Login + MFA flow
  - CRUD: Farms, Crops, Livestock, Finance
  - Offline mode
  - Push notifications
  - Deep links
- **CI**: Run on simulators/devices in pipeline
- **Priority**: Required for release confidence

### 13. Implement App Analytics and Crash Reporting
- **Crash**: Sentry (source maps, breadcrumbs)
- **Analytics**: PostHog or Amplitude
- **Events**: Login, CRUD, errors, feature usage
- **Privacy**: Opt-out, GDPR/CCPA compliant
- **Priority**: Production monitoring

### 14. Add Accessibility Support
- **Audit**: All screens for labels, hints, roles
- **Testing**: VoiceOver (iOS), TalkBack (Android)
- **Dynamic Type**: Support system font scaling
- **Standard**: WCAG 2.1 AA
- **Priority**: Store requirement + inclusivity

---

## 📋 Store Submission

### 15. Implement App Store Metadata and Screenshots
- **App Store Connect**: Name, subtitle, description, keywords, category
- **Screenshots**: All sizes (6.7", 6.5", 5.5", iPad Pro)
- **Play Store**: Feature graphic, phone/tablet screenshots
- **Privacy Policy**: Hosted URL required
- **Priority**: Required for submission

---

## 🚀 CI/CD & Maintenance

### 16. Set Up CI/CD Pipeline for EAS Build
- **GitHub Actions / EAS Workflow**:
  - PR checks: typecheck, lint, test
  - Preview builds on merge to main
  - Production builds on git tag
  - Auto-submit to TestFlight / Play Console Internal
- **Priority**: Automated releases

### 17. Add App Update Mechanism (OTA Updates)
- **Library**: `expo-updates`
- **Config**: Check frequency, mandatory vs optional
- **UI**: Update notification, progress, restart
- **Rollback**: Previous version capability
- **Priority**: Hotfix without store review

### 18. Optimize Bundle Size and Startup Performance
- **Analysis**: `expo-bundle-analyzer`
- **Hermes**: Already enabled
- **Optimizations**:
  - Lazy-load heavy screens (charts, maps)
  - Image optimization
  - Remove unused deps
- **Targets**: <50MB download, <3s cold start
- **Priority**: User retention

---

## 📦 Current Mobile App Status

### What's Complete ✅
- Core infrastructure (navigation, auth, API, storage, socket)
- All 13 reusable UI components
- 5 feedback components (ErrorBoundary, StateView, Skeleton, Loading, Toast)
- 1 layout component (ConnectionBanner)
- 4 hooks/utilities (useFetch, useDebounce, useLocalStorage, formatters)
- 6 main screens (Dashboard, Farms, Crops, Livestock, Finance, Settings)
- Full CRUD for all entities (with offline queue)
- Redux state management with persistence
- Push notification service (needs backend integration)
- Unit tests (4/5 passing - 1 type error)

### Test Coverage (Updated After Fix)
- **Overall**: 48.93% statements (was 27.77%)
- **Store slices**: 74.78% (syncSlice 100%, uiSlice 100%, authSlice 67.95%)
- **Utils**: 42.16% (apiError 100%, storage 83.33%)
- **Services**: 14.19% (api.ts needs integration tests)

---

## 🎯 Recommended Deployment Order

| Phase | Tasks | Est. Effort |
|-------|-------|-------------|
| **1 - Store Ready** | Icons/splash (#2), EAS config (#3), iOS privacy (#4), Android keystore (#5) | 2-3 days |
| **2 - Deep Links/Notif** | Deep linking (#6), Push notifications (#7) | 2-3 days |
| **3 - Premium Features** | Biometric (#8), Offline sync (#9), Image upload (#10), Maps (#11) | 1-2 weeks |
| **4 - Quality** | E2E tests (#12), Analytics (#13), Accessibility (#14) | 1 week |
| **5 - Launch** | Store metadata (#15), CI/CD (#16), OTA (#17), Performance (#18) | 3-5 days |

---

## Environment Variables Required

Create `.env.production`:
```env
EXPO_PUBLIC_API_URL=https://api.farmhub.com/api
EXPO_PUBLIC_APP_SCHEME=farmapp
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
EXPO_PUBLIC_ANALYTICS_KEY=your_analytics_key
```

---

## Useful Commands

```bash
# Development
cd apps/mobile && npx expo start

# Type checking
npx tsc --noEmit

# Tests
npm test -- --coverage

# EAS Build (Preview)
eas build --profile preview --platform all

# EAS Build (Production)
eas build --profile production --platform all

# Submit to stores
eas submit --profile production --platform ios
eas submit --profile production --platform android

# OTA Update
eas update --branch production --message "Bug fixes"
```

---

*Generated: 2026-06-29*
*App Version: 1.0.0*
*Target: iOS App Store + Google Play Store*
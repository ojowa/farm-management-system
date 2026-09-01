# Mobile App

Expo SDK 54 + React Native 0.81.5 mobile app for iOS and Android.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 |
| React Native | 0.81.5 |
| Navigation | expo-router 6.x |
| State | Redux Toolkit + redux-persist |
| Storage | @react-native-async-storage/async-storage |
| HTTP | Axios with interceptors |
| Real-time | Socket.IO |
| Notifications | expo-notifications (Firebase) |

## Running with Expo Go

### 1. Install Expo Go

- **iOS:** App Store → "Expo Go"
- **Android:** Play Store → "Expo Go"

Ensure you have SDK 54 compatible Expo Go (project uses SDK 54).

### 2. Configure API URL

Edit `apps/mobile/.env.local`:

```env
# For physical phone: use your PC's LAN IP
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000

# For emulator: use localhost
EXPO_PUBLIC_API_URL=http://localhost:4000
```

Find your PC's IP:

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS/Linux
ifconfig | grep "inet "
```

### 3. Start the Dev Server

```bash
cd apps/mobile
npm start
```

This starts the Expo dev server on port 8082.

### 4. Connect Your Phone

1. Ensure phone and PC are on the **same WiFi network**
2. Open Expo Go on your phone
3. Scan the **QR code** shown in the terminal
4. The app will load

### 5. Firewall (Windows)

If the phone can't connect, allow the ports through Windows Firewall:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Farm Gateway" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Farm Expo" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
```

## Running on Emulator

### Android Emulator

1. Install [Android Studio](https://developer.android.com/studio)
2. Set `ANDROID_HOME` environment variable
3. Create an AVD (Android Virtual Device)
4. Start the emulator
5. Run:

```bash
cd apps/mobile
npm run android
```

### iOS Simulator (macOS only)

1. Install Xcode
2. Run:

```bash
cd apps/mobile
npm run ios
```

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/             # Login, register screens
│   ├── (app)/              # Main app screens
│   │   ├── _layout.tsx     # Tab navigator
│   │   ├── farms/          # Farm screens
│   │   ├── crops/          # Crop screens
│   │   ├── livestock/      # Livestock screens
│   │   ├── poultry/        # Poultry screens
│   │   ├── finance/        # Finance screens
│   │   └── workers/        # Worker screens
│   └── _layout.tsx         # Root layout
├── src/
│   ├── components/         # Reusable UI components
│   ├── services/           # API services
│   │   ├── api.ts          # Axios client with interceptors
│   │   └── notifications.ts # Push notification handling
│   ├── store/              # Redux store
│   │   ├── index.ts        # Store configuration
│   │   └── slices/         # Redux slices
│   │       ├── authSlice.ts
│   │       ├── farmSlice.ts
│   │       └── ...
│   ├── sync/               # Offline sync
│   │   └── socketService.ts
│   └── utils/              # Utility functions
├── app.json                # Expo configuration
├── babel.config.js         # Babel config
├── metro.config.js         # Metro bundler config
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies
```

## Authentication

The mobile app uses **Bearer token** authentication (not httpOnly cookies):

1. Login returns `accessToken` + `refreshToken` in JSON body
2. Tokens stored in AsyncStorage via Redux
3. Axios interceptor attaches `Authorization: Bearer <token>` to requests
4. On 401, interceptor calls `POST /auth/refresh` with stored refreshToken
5. New tokens stored, original request retried

## Offline Support

The app includes a `SyncQueue` model for offline data synchronization:

- Changes made offline are queued in AsyncStorage
- When connectivity returns, queued changes sync to the server
- Socket.IO provides real-time updates when online

## Known Limitations

- Push notifications require an EAS build (not available in Expo Go)
- Some features may require a development build for native modules
- iOS builds require macOS with Xcode

## Test Credentials

| Email | Role | Password |
|-------|------|----------|
| `demo@farm.com` | Org Owner | `password123` |
| `farmmanager.demo@farm.com` | Farm Manager | `password123` |
| `worker.demo@farm.com` | Farm Worker | `password123` |

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import authReducer, { setStoreDispatch, refreshAccessToken } from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import syncReducer from './slices/syncSlice';
import { clearAllStorage } from '../utils/storage';

const uiPersistConfig = {
  key: 'ui',
  version: 2,
  storage: AsyncStorage,
  whitelist: [
    'selectedFarmId',
    'selectedCropId',
    'selectedLivestockId',
    'filters',
  ],
};

const authPersistConfig = {
  key: 'auth',
  version: 1,
  storage: AsyncStorage,
  blacklist: ['loading', 'error'],
};

const syncPersistConfig = {
  key: 'sync',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['offlineQueue'],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  ui: persistReducer(uiPersistConfig, uiReducer),
  sync: persistReducer(syncPersistConfig, syncReducer),
});

// Middleware: clear AsyncStorage when refreshAccessToken is rejected or logout
// completes, since the reducer itself is synchronous and can't await.
const refreshCleanupMiddleware = (_storeApi: any) => (next: any) => (action: any) => {
  const result = next(action);
  if (
    action.type === 'auth/refreshToken/rejected' ||
    action.type === 'auth/logout/fulfilled'
  ) {
    clearAllStorage().catch(() => {});
  }
  return result;
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(refreshCleanupMiddleware),
});

// Wire the store dispatch to authSlice so the API interceptor can trigger
// a global force-logout when a refresh token fails.
setStoreDispatch(store.dispatch);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

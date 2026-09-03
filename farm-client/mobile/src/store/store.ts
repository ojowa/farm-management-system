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
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import syncReducer from './slices/syncSlice';
import { farmsApi } from './api/farmsApi';
import { cropsApi } from './api/cropsApi';
import { livestockApi } from './api/livestockApi';
import { financeApi } from './api/financeApi';
import { tasksApi } from './api/tasksApi';
import { secureStorageAdapter } from '../utils/reduxSecureStorage';


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

// Auth state uses secure storage (encrypted) to protect user data, tokens, permissions
const authPersistConfig = {
  key: 'auth',
  version: 2,
  storage: secureStorageAdapter,
  blacklist: [
    'loading',
    'error',
    'bootstrapped',
    'socketAccessToken',
    'mfaSessionToken',
    'mfaRequired',
  ],
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
  [farmsApi.reducerPath]: farmsApi.reducer,
  [cropsApi.reducerPath]: cropsApi.reducer,
  [livestockApi.reducerPath]: livestockApi.reducer,
  [financeApi.reducerPath]: financeApi.reducer,
  [tasksApi.reducerPath]: tasksApi.reducer,
});



export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      farmsApi.middleware,
      cropsApi.middleware,
      livestockApi.middleware,
      financeApi.middleware,
      tasksApi.middleware,
    ),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

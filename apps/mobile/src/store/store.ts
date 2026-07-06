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
  blacklist: ['loading', 'error', 'bootstrapped'],
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



export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

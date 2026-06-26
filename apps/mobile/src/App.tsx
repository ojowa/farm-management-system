import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import * as SplashScreen from 'expo-splash-screen';
import { useAppSelector } from './hooks/useAuth';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, mfaRequired } = useAppSelector(
    (state) => state.auth
  );

  return (
    <>
      {/* Navigation will be handled by the root layout */}
    </>
  );
}

function App() {
  useEffect(() => {
    async function hideSplash() {
      await SplashScreen.hideAsync();
    }
    hideSplash();
  }, []);

  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}

export default App;

import React from 'react';
// Standalone App entry. The expo-router layout at app/_layout.tsx is the
// source of truth for navigation, the persist gate, and the toast host.
// This component is kept around so imports from earlier bootstrap paths
// (e.g. tests, storybooks) still resolve to a working tree.
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './store/store';
import { colors } from './components/common/UIComponents';

const PlaceholderNav: React.FC = () => (
  <View style={styles.placeholder}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

function App() {
  return (
    <Provider store={store}>
      <PersistGate
        persistor={persistor}
        loading={
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        }
      >
        <SafeAreaProvider>
          <PlaceholderNav />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});

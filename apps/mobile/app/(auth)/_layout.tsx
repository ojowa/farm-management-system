import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen
        name="register"
        options={{
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          animationEnabled: true,
        }}
      />
    </Stack>
  );
}

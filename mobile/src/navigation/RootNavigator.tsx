import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, loading, setNavigationRef } = useAuth();
  const navigationRef = useRef<any>(null);

  // Set the navigation ref in auth context for login/logout navigation
  useEffect(() => {
    setNavigationRef(navigationRef);
  }, [setNavigationRef]);

  if (loading) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Splash"
            component={() => null}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
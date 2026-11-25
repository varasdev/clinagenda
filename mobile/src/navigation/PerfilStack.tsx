import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PerfilScreen } from '@/screens/perfil/PerfilScreen';
import { EditarPerfilScreen } from '@/screens/perfil/EditarPerfilScreen';
import { PerfilStackParamList } from './types';

const Stack = createNativeStackNavigator<PerfilStackParamList>();

export const PerfilStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
    </Stack.Navigator>
  );
};
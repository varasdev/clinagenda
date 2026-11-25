import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { TriagemScreen } from '@/screens/triagem/TriagemScreen';
import { TriagemResultadoScreen } from '@/screens/triagem/TriagemResultadoScreen';
import { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="Triagem" component={TriagemScreen} />
      <Stack.Screen name="TriagemResultado" component={TriagemResultadoScreen} />
    </Stack.Navigator>
  );
};
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgendamentosScreen } from '@/screens/agenda/AgendamentosScreen';
import { AgendarScreen } from '@/screens/agenda/AgendarScreen';
import { DetalheAgendamentoScreen } from '@/screens/agenda/DetalheAgendamentoScreen';
import { AgendaStackParamList } from './types';

const Stack = createNativeStackNavigator<AgendaStackParamList>();

export const AgendaStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Agendamentos" component={AgendamentosScreen} />
      <Stack.Screen name="Agendar" component={AgendarScreen} />
      <Stack.Screen name="DetalheAgendamento" component={DetalheAgendamentoScreen} />
    </Stack.Navigator>
  );
};
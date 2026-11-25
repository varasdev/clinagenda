import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeStack } from './HomeStack';
import { AgendaStack } from './AgendaStack';
import { PerfilStack } from './PerfilStack';
import { MainTabParamList } from './types';
import { colors, minTouchTarget, typography } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          fontFamily: undefined,
        },
        tabBarStyle: {
          height: 70,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          minWidth: minTouchTarget,
        },
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: 'Início',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={26}
              color={color}
              accessibilityRole="button"
              accessibilityLabel="Início"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaStack}
        options={{
          title: 'Consultas',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={26}
              color={color}
              accessibilityRole="button"
              accessibilityLabel="Consultas"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilStack}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={26}
              color={color}
              accessibilityRole="button"
              accessibilityLabel="Perfil"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
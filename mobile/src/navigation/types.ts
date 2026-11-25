import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Auth Stack (não autenticado)
export type AuthStackParamList = {
  Login: undefined;
};

// Main Tabs (autenticado - paciente) - includes nested stack params for cross-tab navigation
export type MainTabParamList = {
  Home: undefined;
  Agenda: undefined | { screen: keyof AgendaStackParamList; params: AgendaStackParamList[keyof AgendaStackParamList] };
  Perfil: undefined;
};

// Home Stack (dentro da tab Home)
export type HomeStackParamList = {
  HomeScreen: undefined;
  Triagem: { sessionId?: string } | undefined;
  TriagemResultado: {
    specialties: Array<{ especialidadeId: string; nome: string; reason: string; confidence: 'alta' | 'media' | 'baixa' }>;
    disclaimer: string;
    triagemId?: string;
  } | undefined;
};

// Agenda Stack (dentro da tab Agenda)
export type AgendaStackParamList = {
  Agendamentos: undefined;
  Agendar: { especialidadeId: string; triagemId?: string } | undefined;
  DetalheAgendamento: { agendamentoId: string } | undefined;
};

// Perfil Stack (dentro da tab Perfil)
export type PerfilStackParamList = {
  Perfil: undefined;
  EditarPerfil: undefined;
};

// Combined navigation types
export type RootStackParamList = AuthStackParamList & {
  Main: undefined; // Main tabs navigator
  Splash: undefined;
};

// Screen props types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
export type HomeStackScreenProps<T extends keyof HomeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, T>,
  MainTabScreenProps<'Home'>
>;
export type AgendaStackScreenProps<T extends keyof AgendaStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AgendaStackParamList, T>,
  MainTabScreenProps<'Agenda'>
>;
export type PerfilStackScreenProps<T extends keyof PerfilStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<PerfilStackParamList, T>,
  MainTabScreenProps<'Perfil'>
>;

// Navigation prop types for hooks
export type AppNavigation = NativeStackScreenProps<RootStackParamList, 'Main'>['navigation'];
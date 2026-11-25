import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { agendamentoApi } from '@/services/api';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackScreenProps } from '@/navigation/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AgendamentoProximo = {
  _id: string;
  data: string;
  hora: string;
  status: string;
  profissional: { nome: string; especialidade?: { nome: string }; clinica?: { nome: string; endereco: string } };
};

export const HomeScreen = ({ navigation }: HomeStackScreenProps<'HomeScreen'>) => {
  const { user } = useAuth();
  const [proximaConsulta, setProximaConsulta] = useState<AgendamentoProximo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarProximaConsulta = async () => {
    try {
      const agendamentos = await agendamentoApi.list('agendado');
      if (agendamentos.length > 0) {
        // Ordenar por data/hora e pegar o primeiro
        const ordenados = [...agendamentos].sort((a, b) => {
          const dataA = new Date(`${a.data}T${a.hora}`);
          const dataB = new Date(`${b.data}T${b.hora}`);
          return dataA.getTime() - dataB.getTime();
        });
        setProximaConsulta(ordenados[0]);
      } else {
        setProximaConsulta(null);
      }
    } catch (error) {
      console.error('Erro ao carregar próxima consulta:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarProximaConsulta();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    carregarProximaConsulta();
  };

  const formatarData = (data: string) => {
    try {
      return format(new Date(`${data}T00:00:00`), "eeee, d 'de' MMMM", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const irParaTriagem = () => {
    navigation.navigate('Triagem');
  };

  const irParaAgendamentos = () => {
    navigation.navigate('Agenda' as any); // Switch to Agenda tab
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          accessibilityLabel="Atualizar"
        />
      }
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        gap: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Header */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.h2, color: colors.text }}>
          Olá, {user?.nome?.split(' ')[0] || 'Paciente'}!
        </Text>
        <Text style={{ ...typography.body, color: colors.textLight }}>
          Gerencie suas consultas e cuide da sua saúde
        </Text>
      </View>

      {/* Próxima Consulta Card */}
      {proximaConsulta ? (
        <TouchableOpacity
          style={{
            ...globalStyles.card,
            padding: spacing.lg,
            gap: spacing.md,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
          }}
          onPress={() => navigation.navigate('Agenda', { screen: 'DetalheAgendamento', params: { agendamentoId: proximaConsulta._id } })}
          activeOpacity={0.8}
          {...a11y.listItem(
            `Próxima consulta com ${proximaConsulta.profissional?.nome} em ${formatarData(proximaConsulta.data)} às ${proximaConsulta.hora}`,
            'Toque para ver detalhes'
          )}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={{ ...typography.h3, color: colors.text }}>Próxima consulta</Text>
              </View>
              <Text style={{ ...typography.body, color: colors.text, fontWeight: '700', fontSize: 18 }}>
                {proximaConsulta.profissional?.nome || 'Profissional'}
              </Text>
              <Text style={{ ...typography.body, color: colors.textLight }}>
                {proximaConsulta.profissional?.especialidade?.nome || 'Especialidade'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Data</Text>
              <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>
                {formatarData(proximaConsulta.data)}
              </Text>
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Horário</Text>
              <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>
                {proximaConsulta.hora}
              </Text>
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Local</Text>
              <Text style={{ ...typography.bodySmall, color: colors.text }}>
                {proximaConsulta.profissional?.clinica?.nome || 'Clínica'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[globalStyles.card, globalStyles.cardContent, { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }]}>
          <Ionicons name="calendar-clear" size={48} color={colors.textLight} {...a11y.image('Nenhuma consulta agendada')} />
          <Text style={{ ...typography.h3, color: colors.text, textAlign: 'center' }}>Nenhuma consulta agendada</Text>
          <Text style={{ ...typography.body, color: colors.textLight, textAlign: 'center' }}>
            Inicie uma pré-triagem para encontrar o profissional ideal
          </Text>
        </View>
      )}

      {/* Ações Rápidas */}
      <View style={{ gap: spacing.md }}>
        <Text style={{ ...typography.h3, color: colors.text }}>Ações rápidas</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity
            style={{
              flex: 1,
              ...globalStyles.card,
              padding: spacing.lg,
              alignItems: 'center',
              gap: spacing.sm,
              borderWidth: 2,
              borderColor: colors.primary,
            }}
            onPress={irParaTriagem}
            activeOpacity={0.8}
            {...a11y.button('Iniciar pré-triagem', 'Conversar com a IA para encontrar a especialidade adequada')}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: borderRadius.full,
                backgroundColor: colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chatbox" size={28} color={colors.primary} />
            </View>
            <Text style={{ ...typography.body, color: colors.primary, fontWeight: '700', textAlign: 'center' }}>
              Pré-triagem
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              ...globalStyles.card,
              padding: spacing.lg,
              alignItems: 'center',
              gap: spacing.sm,
            }}
            onPress={irParaAgendamentos}
            activeOpacity={0.8}
            {...a11y.button('Ver consultas', 'Ver suas consultas agendadas e histórico')}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: borderRadius.full,
                backgroundColor: colors.surfaceSoft,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="list" size={28} color={colors.text} />
            </View>
            <Text style={{ ...typography.body, color: colors.text, fontWeight: '700', textAlign: 'center' }}>
              Minhas consultas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Card */}
      <View style={[globalStyles.card, globalStyles.cardContent, { backgroundColor: colors.primaryLight, gap: spacing.sm }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <Ionicons name="information-circle" size={22} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ ...typography.bodySmall, color: colors.primaryDark, fontWeight: '700' }}>
              Como funciona a pré-triagem
            </Text>
            <Text style={{ ...typography.bodySmall, color: colors.text }}>
              A IA fará perguntas sobre seus sintomas e recomendará a especialidade mais adequada.
              Isso não substitui avaliação médica — é apenas uma orientação inicial.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({});
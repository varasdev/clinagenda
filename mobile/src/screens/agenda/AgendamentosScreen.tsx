import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { agendamentoApi } from '@/services/api';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { AgendaStackScreenProps } from '@/navigation/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Agendamento = {
  _id: string;
  data: string;
  hora: string;
  status: 'agendado' | 'cancelado' | 'concluido' | 'remarcado';
  observacoes?: string;
  profissional: {
    nome: string;
    registro?: string;
    telefone?: string;
    especialidade?: { nome: string };
    clinica?: { nome: string; endereco: string; telefone: string };
  };
  paciente?: { nome: string };
  criadoEm?: string;
  canceladoEm?: string;
};

export const AgendamentosScreen = ({ navigation }: AgendaStackScreenProps<'Agendamentos'>) => {
  const [proximos, setProximos] = useState<Agendamento[]>([]);
  const [historico, setHistorico] = useState<Agendamento[]>([]);
  const [activeTab, setActiveTab] = useState<'proximos' | 'historico'>('proximos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const carregarAgendamentos = useCallback(async () => {
    try {
      const [agendados, cancelados] = await Promise.all([
        agendamentoApi.list('agendado'),
        agendamentoApi.list('cancelado'),
      ]);

      const agora = new Date();
      const futuros = agendados.filter(a => new Date(`${a.data}T${a.hora}`) >= agora);
      const passados = agendados.filter(a => new Date(`${a.data}T${a.hora}`) < agora);

      setProximos([...futuros, ...passados].sort((a, b) =>
        new Date(`${a.data}T${a.hora}`).getTime() - new Date(`${b.data}T${b.hora}`).getTime()
      ));
      setHistorico([...cancelados, ...passados].sort((a, b) =>
        new Date(`${b.data}T${b.hora}`).getTime() - new Date(`${a.data}T${a.hora}`).getTime()
      ));
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarAgendamentos();
  }, [carregarAgendamentos]);

  const onRefresh = () => {
    setRefreshing(true);
    carregarAgendamentos();
  };

  const handleCancelar = (agendamento: Agendamento) => {
    Alert.alert(
      'Cancelar consulta',
      `Deseja realmente cancelar a consulta com ${agendamento.profissional?.nome} em ${formatarData(agendamento.data)} às ${agendamento.hora}?`,
      [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim, cancelar', style: 'destructive', onPress: () => confirmarCancelamento(agendamento._id) },
      ]
    );
  };

  const confirmarCancelamento = async (agendamentoId: string) => {
    setCancelingId(agendamentoId);
    try {
      await agendamentoApi.cancel(agendamentoId);
      carregarAgendamentos();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível cancelar a consulta.');
    } finally {
      setCancelingId(null);
    }
  };

  const formatarData = (data: string) => {
    try {
      return format(new Date(`${data}T00:00:00`), "eeee, d 'de' MMMM", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const formatarDataCurta = (data: string) => {
    try {
      return format(new Date(`${data}T00:00:00`), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const renderAgendamentoCard = (agendamento: Agendamento, showCancel: boolean) => (
    <TouchableOpacity
      key={agendamento._id}
      style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}
      onPress={() => navigation.navigate('DetalheAgendamento', { agendamentoId: agendamento._id })}
      activeOpacity={0.8}
      {...a11y.listItem(
        `Consulta com ${agendamento.profissional?.nome} em ${formatarDataCurta(agendamento.data)} às ${agendamento.hora}, ${agendamento.status === 'agendado' ? 'agendada' : agendamento.status}`,
        'Toque para ver detalhes'
      )}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ ...typography.h3, color: colors.text }}>
            {agendamento.profissional?.nome || 'Profissional'}
          </Text>
          <Text style={{ ...typography.body, color: colors.textLight }}>
            {agendamento.profissional?.especialidade?.nome || 'Especialidade'}
          </Text>
          {agendamento.profissional?.clinica && (
            <Text style={{ ...typography.bodySmall, color: colors.textLight }}>
              {agendamento.profissional.clinica.nome}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: borderRadius.full,
              backgroundColor: agendamento.status === 'agendado' ? colors.primaryLight :
                              agendamento.status === 'cancelado' ? '#fff0ef' : colors.surfaceSoft,
            }}
          >
            <Text style={{
              ...typography.caption,
              fontWeight: '700',
              color: agendamento.status === 'agendado' ? colors.primary :
                     agendamento.status === 'cancelado' ? colors.danger : colors.textLight,
              }}>
              {agendamento.status === 'agendado' ? 'Agendado' :
               agendamento.status === 'cancelado' ? 'Cancelado' : 'Concluído'}
            </Text>
          </View>
          {showCancel && agendamento.status === 'agendado' && (
            <TouchableOpacity
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.sm,
                backgroundColor: '#fff0ef',
                borderWidth: 1,
                borderColor: colors.danger,
              }}
              onPress={() => handleCancelar(agendamento)}
              disabled={cancelingId === agendamento._id}
              activeOpacity={0.8}
              {...a11y.button('Cancelar consulta', 'Cancelar este agendamento')}
            >
              <Text style={{ ...typography.caption, color: colors.danger, fontWeight: '700' }}>
                {cancelingId === agendamento._id ? 'Cancelando...' : 'Cancelar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Data</Text>
          <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>
            {formatarData(agendamento.data)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Horário</Text>
          <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>
            {agendamento.hora}
          </Text>
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Local</Text>
          <Text style={{ ...typography.bodySmall, color: colors.text }}>
            {agendamento.profissional?.clinica?.nome || 'Clínica'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = (tab: 'proximos' | 'historico') => (
    <View style={[globalStyles.card, globalStyles.cardContent, { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }]}>
      <Ionicons name={tab === 'proximos' ? 'calendar-clear' : 'time'} size={48} color={colors.textLight} />
      <Text style={{ ...typography.h3, color: colors.text, textAlign: 'center' }}>
        {tab === 'proximos' ? 'Nenhuma consulta agendada' : 'Nenhuma consulta no histórico'}
      </Text>
      <Text style={{ ...typography.body, color: colors.textLight, textAlign: 'center' }}>
        {tab === 'proximos'
          ? 'Inicie uma pré-triagem para encontrar o profissional ideal'
          : 'Suas consultas canceladas ou concluídas aparecerão aqui'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, color: colors.textLight, marginTop: spacing.md }}>
          Carregando consultas...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Tab Bar */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: spacing.md,
            alignItems: 'center',
            borderBottomWidth: activeTab === 'proximos' ? 3 : 0,
            borderBottomColor: colors.primary,
          }}
          onPress={() => setActiveTab('proximos')}
          {...a11y.button('Próximas consultas', 'Ver consultas agendadas')}
        >
          <Text style={{
            ...typography.button,
            fontSize: 14,
            color: activeTab === 'proximos' ? colors.primary : colors.textLight,
          }}>
            Próximas ({proximos.filter(a => a.status === 'agendado').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: spacing.md,
            alignItems: 'center',
            borderBottomWidth: activeTab === 'historico' ? 3 : 0,
            borderBottomColor: colors.primary,
          }}
          onPress={() => setActiveTab('historico')}
          {...a11y.button('Histórico', 'Ver histórico de consultas')}
        >
          <Text style={{
            ...typography.button,
            fontSize: 14,
            color: activeTab === 'historico' ? colors.primary : colors.textLight,
          }}>
            Histórico ({historico.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.lg,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'proximos' ? (
          proximos.length > 0 ? (
            proximos.map(a => renderAgendamentoCard(a, true))
          ) : renderEmptyState('proximos')
        ) : (
          historico.length > 0 ? (
            historico.map(a => renderAgendamentoCard(a, false))
          ) : renderEmptyState('historico')
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({});
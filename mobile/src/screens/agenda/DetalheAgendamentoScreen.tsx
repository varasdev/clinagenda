import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { agendamentoApi } from '@/services/api';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { AgendaStackScreenProps } from '@/navigation/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Linking from 'expo-linking';

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

type DetalheRouteParams = { agendamentoId: string } | undefined;

export const DetalheAgendamentoScreen = ({ navigation }: AgendaStackScreenProps<'DetalheAgendamento'>) => {
  const route = useRoute<AgendaStackScreenProps<'DetalheAgendamento'>['route']>();
  const { agendamentoId } = route.params ?? { agendamentoId: '' };

  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  const carregarDetalhes = async () => {
    try {
      const data = await agendamentoApi.getById(agendamentoId);
      setAgendamento(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes da consulta.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDetalhes();
  }, []);

  const handleCancelar = () => {
    Alert.alert(
      'Cancelar consulta',
      `Tem certeza que deseja cancelar a consulta com ${agendamento?.profissional?.nome}?`,
      [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim, cancelar', style: 'destructive', onPress: confirmarCancelamento },
      ]
    );
  };

  const confirmarCancelamento = async () => {
    if (!agendamento) return;
    setCanceling(true);
    try {
      await agendamentoApi.cancel(agendamento._id);
      Alert.alert('Sucesso', 'Consulta cancelada.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível cancelar.');
    } finally {
      setCanceling(false);
    }
  };

  const handleReagendar = () => {
    Alert.alert(
      'Reagendar',
      'Para reagendar, cancele esta consulta e faça um novo agendamento.',
      [
        { text: 'Entendi' },
        { text: 'Cancelar e agendar novo', onPress: () => {
          navigation.navigate('Agendamentos');
        }},
      ]
    );
  };

  const formatarData = (data: string) => {
    try {
      return format(new Date(`${data}T00:00:00`), "eeee, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const formatarDataCriacao = (data?: string) => {
    if (!data) return '';
    try {
      return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return data;
    }
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, color: colors.textLight, marginTop: spacing.md }}>
          Carregando detalhes...
        </Text>
      </View>
    );
  }

  if (!agendamento) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <Text style={{ ...typography.body, color: colors.textLight }}>
          Consulta não encontrada
        </Text>
      </View>
    );
  }

  const statusColors = {
    agendado: { bg: colors.primaryLight, text: colors.primary, icon: 'calendar' as const },
    cancelado: { bg: '#fff0ef', text: colors.danger, icon: 'calendar-clear' as const },
    concluido: { bg: colors.surfaceSoft, text: colors.success, icon: 'checkmark-circle' as const },
    remarcado: { bg: '#fff8e1', text: colors.warning, icon: 'calendar' as const },
  };

  const statusConfig = statusColors[agendamento.status] || statusColors.agendado;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        gap: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header com Status */}
      <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: statusConfig.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={statusConfig.icon} size={24} color={statusConfig.text} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ ...typography.h3, color: colors.text }}>
              {agendamento.profissional?.nome || 'Consulta'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  borderRadius: borderRadius.full,
                  backgroundColor: statusConfig.bg,
                }}
              >
                <Text style={{ ...typography.caption, fontWeight: '700', color: statusConfig.text, textTransform: 'uppercase' }}>
                  {agendamento.status === 'agendado' ? 'Agendado' :
                   agendamento.status === 'cancelado' ? 'Cancelado' :
                   agendamento.status === 'concluido' ? 'Concluído' : 'Remarcado'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Data</Text>
            <Text style={{ ...typography.body, color: colors.text, fontWeight: '700', fontSize: 18 }}>
              {formatarData(agendamento.data)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Horário</Text>
            <Text style={{ ...typography.body, color: colors.text, fontWeight: '700', fontSize: 18 }}>
              {agendamento.hora}
            </Text>
          </View>
        </View>
      </View>

      {/* Profissional */}
      <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
        <Text style={{ ...typography.h3, color: colors.text }}>Profissional</Text>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>
                {agendamento.profissional?.nome || 'Profissional'}
              </Text>
              <Text style={{ ...typography.bodySmall, color: colors.textLight }}>
                {agendamento.profissional?.especialidade?.nome || 'Especialidade'}
              </Text>
              {agendamento.profissional?.registro && (
                <Text style={{ ...typography.caption, color: colors.textLight }}>
                  Registro: {agendamento.profissional.registro}
                </Text>
              )}
            </View>
          </View>

          {agendamento.profissional?.telefone && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}
              onPress={() => Platform.OS === 'ios'
                ? Linking.openURL(`tel:${agendamento.profissional?.telefone}`)
                : Linking.openURL(`tel:${agendamento.profissional?.telefone}`)}
              {...a11y.button(`Ligar para ${agendamento.profissional?.telefone}`, 'Ligar para o profissional')}
            >
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.primary }}>
                {agendamento.profissional.telefone}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Clínica */}
      {agendamento.profissional?.clinica && (
        <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
          <Text style={{ ...typography.h3, color: colors.text }}>Local da consulta</Text>
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
              <Ionicons name="location" size={24} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>
                  {agendamento.profissional.clinica.nome}
                </Text>
                <Text style={{ ...typography.bodySmall, color: colors.textLight }}>
                  {agendamento.profissional.clinica.endereco}
                </Text>
              </View>
            </View>

            {agendamento.profissional.clinica.telefone && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}
                onPress={() => Linking.openURL(`tel:${agendamento.profissional?.clinica?.telefone}`)}
                {...a11y.button(`Ligar para clínica ${agendamento.profissional?.clinica?.telefone}`, 'Ligar para a clínica')}
              >
                <Ionicons name="call" size={20} color={colors.primary} />
                <Text style={{ ...typography.body, color: colors.primary }}>
                  {agendamento.profissional.clinica.telefone}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}
              onPress={() => {
                const endereco = encodeURIComponent(agendamento.profissional?.clinica?.endereco || '');
                Linking.openURL(`https://maps.google.com/?q=${endereco}`);
              }}
              {...a11y.button('Ver no mapa', 'Abrir endereço no Google Maps')}
            >
              <Ionicons name="navigate" size={20} color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.primary }}>
                Abrir no mapa
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Observações */}
      {agendamento.observacoes && (
        <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.sm }]}>
          <Text style={{ ...typography.h3, color: colors.text }}>Observações</Text>
          <Text style={{ ...typography.body, color: colors.text }}>{agendamento.observacoes}</Text>
        </View>
      )}

      {/* Informações do agendamento */}
      <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.sm }]}>
        <Text style={{ ...typography.h3, color: colors.text }}>Informações</Text>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.bodySmall, color: colors.text }}>
            <Text style={{ fontWeight: '700' }}>Agendado em: </Text>{formatarDataCriacao(agendamento.criadoEm)}
          </Text>
          {agendamento.status === 'cancelado' && agendamento.canceladoEm && (
            <Text style={{ ...typography.bodySmall, color: colors.danger }}>
              <Text style={{ fontWeight: '700' }}>Cancelado em: </Text>{formatarDataCriacao(agendamento.canceladoEm)}
            </Text>
          )}
        </View>
      </View>

      {/* Ações */}
      {agendamento.status === 'agendado' && (
        <View style={{ gap: spacing.md }}>
          <TouchableOpacity
            style={{
              ...globalStyles.card,
              backgroundColor: canceling ? colors.textLight : colors.danger,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.sm,
              alignItems: 'center',
              minHeight: minTouchTarget,
              justifyContent: 'center',
            }}
            onPress={handleCancelar}
            disabled={canceling}
            activeOpacity={0.8}
            {...a11y.button('Cancelar consulta', 'Cancelar este agendamento')}
          >
            {canceling ? (
              <ActivityIndicator color={colors.textOnPrimary} size="large" />
            ) : (
              <Text style={{ ...typography.button, color: colors.textOnPrimary }}>
                Cancelar consulta
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              ...globalStyles.card,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.sm,
              alignItems: 'center',
              minHeight: minTouchTarget,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={handleReagendar}
            activeOpacity={0.8}
            {...a11y.button('Reagendar', 'Cancelar e fazer novo agendamento')}
          >
            <Text style={{ ...typography.button, color: colors.primary }}>
              Reagendar (cancelar e agendar novo)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({});
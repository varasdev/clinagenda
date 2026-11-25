import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { catalogoApi, disponibilidadeApi, agendamentoApi } from '@/services/api';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { AgendaStackScreenProps } from '@/navigation/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Profissional = {
  _id: string;
  nome: string;
  registro: string;
  telefone: string;
  clinica?: { _id: string; nome: string; endereco: string; telefone: string };
  especialidade?: { _id: string; nome: string };
  clinicaId?: string;
  especialidadeId?: string;
};

type Disponibilidade = {
  _id: string;
  profissionalId: string;
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
};

type AgendarRouteParams = { especialidadeId: string; triagemId?: string } | undefined;

export const AgendarScreen = ({ navigation }: AgendaStackScreenProps<'Agendar'>) => {
  const route = useRoute<AgendaStackScreenProps<'Agendar'>['route']>();
  const { especialidadeId, triagemId } = route.params ?? { especialidadeId: '', triagemId: undefined };

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [diasComHorarios, setDiasComHorarios] = useState<{ data: string; label: string; horarios: string[] }[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfissionais, setLoadingProfissionais] = useState(false);
  const [loadingAgendar, setLoadingAgendar] = useState(false);
  const [error, setError] = useState('');

  const carregarProfissionais = useCallback(async () => {
    setLoadingProfissionais(true);
    setError('');
    try {
      const profs = await catalogoApi.getProfissionais({ especialidadeId });
      setProfissionais(profs);
      if (profs.length > 0) {
        setProfissionalSelecionado(profs[0]);
        await carregarDisponibilidades(profs[0]._id);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar profissionais.');
    } finally {
      setLoadingProfissionais(false);
      setLoading(false);
    }
  }, [especialidadeId]);

  const carregarDisponibilidades = async (profissionalId: string) => {
    try {
      const disps = await disponibilidadeApi.getByProfissional(profissionalId);
      setDisponibilidades(disps);
      gerarDiasComHorarios(disps);
    } catch (error) {
      console.error('Erro ao carregar disponibilidades:', error);
    }
  };

  const gerarDiasComHorarios = (disps: Disponibilidade[]) => {
    const diasMap: Record<string, string[]> = {};
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Próximos 30 dias
    for (let i = 0; i < 30; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + i);
      const dataStr = format(data, 'yyyy-MM-dd');
      const diaSemana = format(data, 'EEEE', { locale: ptBR }).toLowerCase();

      const horariosDoDia = disps
        .filter(d => normalizarDia(d.diaSemana) === normalizarDia(diaSemana))
        .flatMap(d => gerarHorarios(d.horaInicio, d.horaFim));

      if (horariosDoDia.length > 0) {
        diasMap[dataStr] = horariosDoDia;
      }
    }

    const dias = Object.entries(diasMap).map(([data, horarios]) => ({
      data,
      label: format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR }),
      horarios: horarios.sort(),
    }));

    setDiasComHorarios(dias);
    if (dias.length > 0 && !dataSelecionada) {
      setDataSelecionada(dias[0].data);
    }
  };

  const normalizarDia = (dia: string) => {
    return dia
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/-feira$/, '');
  };

  const gerarHorarios = (inicio: string, fim: string, intervalo = 30) => {
    const horarios: string[] = [];
    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    let atual = hIni * 60 + mIni;
    const fimMin = hFim * 60 + mFim;

    while (atual + intervalo <= fimMin) {
      const h = Math.floor(atual / 60).toString().padStart(2, '0');
      const m = (atual % 60).toString().padStart(2, '0');
      horarios.push(`${h}:${m}`);
      atual += intervalo;
    }
    return horarios;
  };

  const handleSelecionarProfissional = async (prof: Profissional) => {
    setProfissionalSelecionado(prof);
    setDataSelecionada(null);
    setHoraSelecionada(null);
    await carregarDisponibilidades(prof._id);
  };

  const handleSelecionarData = (data: string) => {
    setDataSelecionada(data);
    setHoraSelecionada(null);
  };

  const handleSelecionarHora = (hora: string) => {
    setHoraSelecionada(hora);
  };

  const handleAgendar = async () => {
    if (!profissionalSelecionado || !dataSelecionada || !horaSelecionada) {
      setError('Selecione profissional, data e horário.');
      return;
    }

    setLoadingAgendar(true);
    setError('');

    try {
      await agendamentoApi.create({
        profissionalId: profissionalSelecionado._id,
        data: dataSelecionada,
        hora: horaSelecionada,
        triagemId,
      });

      Alert.alert(
        'Sucesso!',
        'Consulta agendada com sucesso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao agendar. Tente novamente.');
      if (err.code === 'CONFLICT') {
        Alert.alert('Horário indisponível', err.message, [{ text: 'OK' }]);
      }
    } finally {
      setLoadingAgendar(false);
    }
  };

  const diasDaSemanaPt = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  useEffect(() => {
    carregarProfissionais();
  }, [carregarProfissionais]);

  if (loading) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, color: colors.textLight, marginTop: spacing.md }}>
          Carregando profissionais...
        </Text>
      </View>
    );
  }

  const diaAtual = diasComHorarios.find(d => d.data === dataSelecionada);
  const horariosDisponiveis = diaAtual?.horarios || [];

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        gap: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ gap: spacing.sm }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ alignSelf: 'flex-start', padding: spacing.sm, minWidth: minTouchTarget, minHeight: minTouchTarget }}
          {...a11y.button('Voltar', 'Voltar para resultado da triagem')}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ ...typography.h2, color: colors.text }}>Agendar consulta</Text>
        <Text style={{ ...typography.body, color: colors.textLight }}>
          Escolha o profissional, data e horário
        </Text>
      </View>

      {error && (
        <View style={{
          padding: spacing.md,
          backgroundColor: '#fff0ef',
          borderRadius: borderRadius.sm,
          borderWidth: 1,
          borderColor: colors.danger,
        }}>
          <Text style={{ ...typography.body, color: colors.danger }}>{error}</Text>
        </View>
      )}

      {/* Passo 1: Profissional */}
      <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...typography.caption, color: colors.textOnPrimary, fontWeight: '700' }}>1</Text>
          </View>
          <Text style={{ ...typography.h3, color: colors.text }}>Profissional</Text>
        </View>

        {loadingProfissionais ? (
          <ActivityIndicator color={colors.primary} style={{ alignSelf: 'center', marginVertical: spacing.md }} />
        ) : profissionais.length === 0 ? (
          <Text style={{ ...typography.body, color: colors.textLight, textAlign: 'center', paddingVertical: spacing.md }}>
            Nenhum profissional encontrado para esta especialidade
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {profissionais.map(prof => (
              <TouchableOpacity
                key={prof._id}
                style={[globalStyles.card, {
                  padding: spacing.md,
                  borderWidth: profissionalSelecionado?._id === prof._id ? 2 : 1,
                  borderColor: profissionalSelecionado?._id === prof._id ? colors.primary : colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }]}
                onPress={() => handleSelecionarProfissional(prof)}
                activeOpacity={0.8}
                {...a11y.button(
                  `${prof.nome}, ${prof.especialidade?.nome}, ${prof.clinica?.nome}`,
                  'Selecionar este profissional'
                )}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>{prof.nome}</Text>
                  <Text style={{ ...typography.bodySmall, color: colors.textLight }}>
                    {prof.especialidade?.nome} • {prof.clinica?.nome}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textLight }}>
                    Registro: {prof.registro}
                  </Text>
                </View>
                {profissionalSelecionado?._id === prof._id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Passo 2: Data */}
      {profissionalSelecionado && (
        <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: dataSelecionada ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...typography.caption, color: dataSelecionada ? colors.textOnPrimary : colors.textLight, fontWeight: '700' }}>2</Text>
            </View>
            <Text style={{ ...typography.h3, color: colors.text }}>Data</Text>
          </View>

          {diasComHorarios.length === 0 ? (
            <Text style={{ ...typography.body, color: colors.textLight, textAlign: 'center', paddingVertical: spacing.md }}>
              Este profissional não possui horários disponíveis nos próximos 30 dias
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
                {diasComHorarios.map(dia => (
                  <TouchableOpacity
                    key={dia.data}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: borderRadius.md,
                      backgroundColor: dataSelecionada === dia.data ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: dataSelecionada === dia.data ? colors.primary : colors.border,
                      minWidth: 100,
                      alignItems: 'center',
                    }}
                    onPress={() => handleSelecionarData(dia.data)}
                    activeOpacity={0.8}
                    {...a11y.button(dia.label, `Selecionar ${dia.label} para agendamento`)}
                  >
                    <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>
                      {format(parseISO(dia.data), 'EEE', { locale: ptBR })}
                    </Text>
                    <Text style={{ ...typography.body, fontWeight: '700', color: dataSelecionada === dia.data ? colors.textOnPrimary : colors.text }}>
                      {format(parseISO(dia.data), 'dd/MM', { locale: ptBR })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Passo 3: Horário */}
      {dataSelecionada && horariosDisponiveis.length > 0 && (
        <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: horaSelecionada ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...typography.caption, color: horaSelecionada ? colors.textOnPrimary : colors.textLight, fontWeight: '700' }}>3</Text>
            </View>
            <Text style={{ ...typography.h3, color: colors.text }}>Horário</Text>
          </View>

          <View style={{ flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-start' }}>
            {horariosDisponiveis.map(hora => (
              <TouchableOpacity
                key={hora}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: horaSelecionada === hora ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: horaSelecionada === hora ? colors.primary : colors.border,
                  minWidth: 80,
                  alignItems: 'center',
                }}
                onPress={() => handleSelecionarHora(hora)}
                activeOpacity={0.8}
                {...a11y.button(`Horário ${hora}`, `Selecionar ${hora} para agendamento`)}
              >
                <Text style={{
                  ...typography.body,
                  fontWeight: '700',
                  color: horaSelecionada === hora ? colors.textOnPrimary : colors.text,
                }}>
                  {hora}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Resumo e Botão Agendar */}
      {profissionalSelecionado && dataSelecionada && horaSelecionada && (
        <View style={[globalStyles.card, { backgroundColor: colors.primaryLight, borderColor: colors.primary }, { gap: spacing.md }]}>
          <Text style={{ ...typography.h3, color: colors.primaryDark }}>Resumo do agendamento</Text>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.body, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>Profissional: </Text>{profissionalSelecionado.nome}
            </Text>
            <Text style={{ ...typography.body, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>Especialidade: </Text>{profissionalSelecionado.especialidade?.nome}
            </Text>
            <Text style={{ ...typography.body, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>Clínica: </Text>{profissionalSelecionado.clinica?.nome}
            </Text>
            <Text style={{ ...typography.body, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>Data: </Text>{format(parseISO(dataSelecionada!), "eeee, d 'de' MMMM", { locale: ptBR })}
            </Text>
            <Text style={{ ...typography.body, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>Horário: </Text>{horaSelecionada}
            </Text>
          </View>

          <TouchableOpacity
            style={{
              ...globalStyles.card,
              backgroundColor: loadingAgendar ? colors.textLight : colors.primary,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.sm,
              alignItems: 'center',
              minHeight: minTouchTarget,
              justifyContent: 'center',
            }}
            onPress={handleAgendar}
            disabled={loadingAgendar}
            activeOpacity={0.8}
            {...a11y.button('Confirmar agendamento', 'Finalizar o agendamento da consulta')}
          >
            {loadingAgendar ? (
              <ActivityIndicator color={colors.textOnPrimary} size="large" />
            ) : (
              <Text style={{ ...typography.button, color: colors.textOnPrimary }}>
                Confirmar agendamento
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({});
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackScreenProps } from '@/navigation/types';

type EspecialidadeSugerida = {
  especialidadeId: string;
  nome: string;
  reason: string;
  confidence: 'alta' | 'media' | 'baixa';
};

type TriagemResultadoRouteParams = {
  specialties: EspecialidadeSugerida[];
  disclaimer: string;
  triagemId?: string;
};

export const TriagemResultadoScreen = ({ navigation }: HomeStackScreenProps<'TriagemResultado'>) => {
  const route = useRoute<HomeStackScreenProps<'TriagemResultado'>['route']>();
  const { specialties, disclaimer, triagemId } = route.params ?? { specialties: [], disclaimer: '', triagemId: undefined };

  const confidenceColors = {
    alta: { bg: '#e8f7ed', text: '#23794e', icon: 'checkmark-circle' as const },
    media: { bg: '#fff8e1', text: '#936a1b', icon: 'help-circle' as const },
    baixa: { bg: '#f5f5f5', text: '#687a72', icon: 'information-circle' as const },
  };

  const irParaAgendar = (especialidadeId: string) => {
    navigation.navigate('Agenda', { screen: 'Agendar', params: { especialidadeId, triagemId } });
  };

  const voltarInicio = () => {
    navigation.popToTop();
  };

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
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
        </View>
        <Text style={{ ...typography.h2, color: colors.text, textAlign: 'center' }}>
          Triagem concluída
        </Text>
        <Text style={{ ...typography.body, color: colors.textLight, textAlign: 'center' }}>
          Com base nas suas respostas, identificamos as especialidades mais adequadas
        </Text>
      </View>

      {/* Disclaimer */}
      <View style={[globalStyles.card, globalStyles.cardContent, { backgroundColor: '#fff8e1', borderColor: colors.warning, gap: spacing.sm }]}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <Ionicons name="warning" size={22} color={colors.warning} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.bodySmall, color: colors.warning, fontWeight: '700' }}>
              Importante — Aviso de transparência
            </Text>
            <Text style={{ ...typography.bodySmall, color: colors.text, marginTop: spacing.xs }}>
              {disclaimer}
            </Text>
          </View>
        </View>
      </View>

      {/* Especialidades Sugeridas */}
      <View style={{ gap: spacing.md }}>
        <Text style={{ ...typography.h3, color: colors.text }}>Especialidades recomendadas</Text>
        {specialties.map((spec: EspecialidadeSugerida, index: number) => {
          const conf = confidenceColors[spec.confidence];
          return (
            <TouchableOpacity
              key={`${spec.especialidadeId}-${index}`}
              style={{
                ...globalStyles.card,
                padding: spacing.md,
                gap: spacing.sm,
                borderLeftWidth: 4,
                borderLeftColor: conf.text,
              }}
              onPress={() => irParaAgendar(spec.especialidadeId)}
              activeOpacity={0.8}
              {...a11y.listItem(
                `${spec.nome}, confiança ${spec.confidence}. ${spec.reason}`,
                'Toque para ver profissionais disponíveis e agendar'
              )}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: borderRadius.full,
                    backgroundColor: conf.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={conf.icon} size={22} color={conf.text} />
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={{ ...typography.h3, color: colors.text }}>{spec.nome}</Text>
                    <View style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                      borderRadius: borderRadius.full,
                      backgroundColor: conf.bg,
                    }}>
                      <Text style={{ ...typography.caption, color: conf.text, fontWeight: '700', textTransform: 'uppercase' }}>
                        {spec.confidence}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ ...typography.body, color: colors.textLight }}>
                    {spec.reason}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action Buttons */}
      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <TouchableOpacity
          style={{
            ...globalStyles.card,
            backgroundColor: colors.primary,
            paddingVertical: spacing.md,
            borderRadius: borderRadius.sm,
            alignItems: 'center',
            minHeight: minTouchTarget,
            justifyContent: 'center',
          }}
          onPress={() => specialties.length > 0 && irParaAgendar(specialties[0].especialidadeId)}
          activeOpacity={0.8}
          {...a11y.button('Ver profissionais e agendar', 'Ir para agendamento com a primeira especialidade recomendada')}
        >
          <Text style={{ ...typography.button, color: colors.textOnPrimary }}>
            Ver profissionais e agendar
          </Text>
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
          onPress={voltarInicio}
          activeOpacity={0.8}
          {...a11y.button('Voltar ao início', 'Retornar à tela inicial')}
        >
          <Text style={{ ...typography.button, color: colors.primary }}>
            Voltar ao início
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({});
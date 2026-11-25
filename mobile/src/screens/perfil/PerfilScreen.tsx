import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { pacienteApi } from '@/services/api';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { PerfilStackScreenProps } from '@/navigation/types';
import { useAuth } from '@/context/AuthContext';

type Paciente = {
  _id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  criadoEm?: string;
};

export const PerfilScreen = ({ navigation }: PerfilStackScreenProps<'Perfil'>) => {
  const { user, logout } = useAuth();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const carregarPerfil = async () => {
    if (!user?.pacienteId) {
      setLoading(false);
      return;
    }
    try {
      const data = await pacienteApi.getById(user.pacienteId);
      setPaciente(data);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', 'Não foi possível carregar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPerfil();
  }, [user?.pacienteId]);

  const handleLogout = async () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: confirmarLogout },
      ]
    );
  };

  const confirmarLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
    } finally {
      setLoggingOut(false);
    }
  };

  const formatarData = (data: string) => {
    try {
      return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
    } catch {
      return data;
    }
  };

  const formatarDataCriacao = (data?: string) => {
    if (!data) return '';
    try {
      return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return data;
    }
  };

  const formatarTelefone = (tel: string) => {
    const nums = tel.replace(/\D/g, '');
    if (nums.length === 11) return nums.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (nums.length === 10) return nums.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return tel;
  };

  const formatarCPF = (cpf: string) => {
    const nums = cpf.replace(/\D/g, '');
    if (nums.length === 11) return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return cpf;
  };

  const formatarCEP = (cep: string) => {
    const nums = cep.replace(/\D/g, '');
    if (nums.length === 8) return nums.replace(/(\d{5})(\d{3})/, '$1-$2');
    return cep;
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, color: colors.textLight, marginTop: spacing.md }}>
          Carregando perfil...
        </Text>
      </View>
    );
  }

  if (!paciente) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <Text style={{ ...typography.body, color: colors.textLight }}>
          Perfil não encontrado
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        gap: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header do Perfil */}
      <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md, alignItems: 'center' }]}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: colors.primary }}>
            {paciente.nome.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.h2, color: colors.text }}>{paciente.nome}</Text>
          <Text style={{ ...typography.body, color: colors.textLight }}>{paciente.email}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
            <Ionicons name="calendar" size={16} color={colors.textLight} />
            <Text style={{ ...typography.caption, color: colors.textLight }}>
              {formatarData(paciente.dataNascimento)} • {paciente.cpf ? formatarCPF(paciente.cpf) : 'CPF não informado'}
            </Text>
          </View>
        </View>
      </View>

      {/* Contato */}
      <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
        <Text style={{ ...typography.h3, color: colors.text }}>Contato</Text>
        <View style={{ gap: spacing.sm }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs }}
            onPress={() => {}}
            {...a11y.button(`Telefone ${formatarTelefone(paciente.telefone)}`, 'Ver telefone')}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="call" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Telefone</Text>
              <Text style={{ ...typography.body, color: colors.text }}>{formatarTelefone(paciente.telefone)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Endereço */}
      {paciente.endereco && (
        <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
          <Text style={{ ...typography.h3, color: colors.text }}>Endereço</Text>
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>CEP</Text>
                <Text style={{ ...typography.body, color: colors.text }}>{formatarCEP(paciente.endereco.cep)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="home" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Logradouro</Text>
                <Text style={{ ...typography.body, color: colors.text }}>
                  {paciente.endereco.logradouro}, {paciente.endereco.numero}
                  {paciente.endereco.complemento ? ` - ${paciente.endereco.complemento}` : ''}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="pin" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Bairro</Text>
                <Text style={{ ...typography.body, color: colors.text }}>{paciente.endereco.bairro}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="map" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textLight, textTransform: 'uppercase' }}>Cidade / Estado</Text>
                <Text style={{ ...typography.body, color: colors.text }}>
                  {paciente.endereco.cidade}/{paciente.endereco.estado}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Informações da conta */}
      <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
        <Text style={{ ...typography.h3, color: colors.text }}>Conta</Text>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
            <Text style={{ ...typography.body, color: colors.textLight }}>Cadastrado em</Text>
            <Text style={{ ...typography.body, color: colors.text }}>{formatarDataCriacao(paciente.criadoEm)}</Text>
          </View>
        </View>
      </View>

      {/* Ações */}
      <View style={{ gap: spacing.md }}>
        <TouchableOpacity
          style={{
            ...globalStyles.card,
            paddingVertical: spacing.md,
            borderRadius: borderRadius.sm,
            alignItems: 'center',
            minHeight: minTouchTarget,
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.primary,
          }}
          onPress={() => navigation.navigate('EditarPerfil')}
          activeOpacity={0.8}
          {...a11y.button('Editar perfil', 'Alterar dados pessoais, telefone e endereço')}
        >
          <Text style={{ ...typography.button, color: colors.primary }}>
            Editar perfil
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            ...globalStyles.card,
            backgroundColor: loggingOut ? colors.textLight : colors.danger,
            paddingVertical: spacing.md,
            borderRadius: borderRadius.sm,
            alignItems: 'center',
            minHeight: minTouchTarget,
            justifyContent: 'center',
          }}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
          {...a11y.button('Sair da conta', 'Encerrar sessão e voltar para login')}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.textOnPrimary} size="large" />
          ) : (
            <Text style={{ ...typography.button, color: colors.textOnPrimary }}>
              Sair da conta
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Versão do app */}
      <View style={{ alignItems: 'center', paddingTop: spacing.lg }}>
        <Text style={{ ...typography.caption, color: colors.textLight }}>
          ClinAgenda — Versão 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({});
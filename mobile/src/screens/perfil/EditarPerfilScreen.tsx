import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { pacienteApi } from '@/services/api';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { PerfilStackScreenProps } from '@/navigation/types';
import { useAuth } from '@/context/AuthContext';

type Endereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type Paciente = {
  _id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
  endereco: Endereco;
};

type EnderecoErrors = {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

type FormErrors = {
  nome?: string;
  telefone?: string;
  endereco?: EnderecoErrors;
};

type FormData = {
  nome: string;
  telefone: string;
  endereco: Endereco;
};

type ValidationErrors = {
  nome?: string;
  telefone?: string;
  endereco?: Partial<EnderecoErrors>;
};

export const EditarPerfilScreen = ({ navigation }: PerfilStackScreenProps<'EditarPerfil'>) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    telefone: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const carregarDados = async () => {
    if (!user?.pacienteId) {
      setLoading(false);
      return;
    }
    try {
      const data = await pacienteApi.getById(user.pacienteId);
      setFormData({
        nome: data.nome,
        telefone: data.telefone,
        endereco: data.endereco,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [user?.pacienteId]);

  const handleChange = (field: Exclude<keyof FormData, 'endereco'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEnderecoChange = (field: keyof Endereco, value: string) => {
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, [field]: value },
    }));
    if (errors.endereco?.[field]) {
      setErrors(prev => ({
        ...prev,
        endereco: prev.endereco ? { ...prev.endereco, [field]: undefined } : undefined,
      }));
    }
  };

  const formatarTelefone = (value: string) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 11) {
      if (nums.length <= 2) return `(${nums}`;
      if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
      return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
    }
    return value;
  };

  const formatarCEP = (value: string) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 8) {
      if (nums.length <= 5) return nums;
      return `${nums.slice(0, 5)}-${nums.slice(5)}`;
    }
    return value;
  };

  const validarFormulario = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
      isValid = false;
    }

    const telefoneNumeros = formData.telefone.replace(/\D/g, '');
    if (telefoneNumeros.length < 10) {
      newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos';
      isValid = false;
    }

    const cepNumeros = formData.endereco.cep.replace(/\D/g, '');
    if (cepNumeros.length !== 8) {
      newErrors.endereco = { ...newErrors.endereco, cep: 'CEP deve ter 8 dígitos' };
      isValid = false;
    }

    if (!formData.endereco.logradouro.trim()) {
      newErrors.endereco = { ...newErrors.endereco, logradouro: 'Logradouro é obrigatório' };
      isValid = false;
    }

    if (!formData.endereco.numero.trim()) {
      newErrors.endereco = { ...newErrors.endereco, numero: 'Número é obrigatório' };
      isValid = false;
    }

    if (!formData.endereco.bairro.trim()) {
      newErrors.endereco = { ...newErrors.endereco, bairro: 'Bairro é obrigatório' };
      isValid = false;
    }

    if (!formData.endereco.cidade.trim()) {
      newErrors.endereco = { ...newErrors.endereco, cidade: 'Cidade é obrigatória' };
      isValid = false;
    }

    if (!formData.endereco.estado.trim() || formData.endereco.estado.length !== 2) {
      newErrors.endereco = { ...newErrors.endereco, estado: 'Estado deve ter 2 letras (ex: SP)' };
      isValid = false;
    }

    setErrors(newErrors as FormErrors);
    return isValid;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) return;
    if (!user?.pacienteId) {
      Alert.alert('Erro', 'Usuário não identificado.');
      return;
    }

    setSaving(true);
    try {
      await pacienteApi.update(user.pacienteId, {
        nome: formData.nome.trim(),
        telefone: formData.telefone,
        endereco: {
          cep: formData.endereco.cep.replace(/\D/g, ''),
          logradouro: formData.endereco.logradouro.trim(),
          numero: formData.endereco.numero.trim(),
          complemento: formData.endereco.complemento?.trim() || '',
          bairro: formData.endereco.bairro.trim(),
          cidade: formData.endereco.cidade.trim(),
          estado: formData.endereco.estado.trim().toUpperCase(),
        },
      });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, color: colors.textLight, marginTop: spacing.md }}>
          Carregando...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={globalStyles.container}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.lg,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ alignSelf: 'flex-start', padding: spacing.sm, minWidth: minTouchTarget, minHeight: minTouchTarget }}
            {...a11y.button('Voltar', 'Voltar para o perfil')}
          >
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={{ ...typography.h2, color: colors.text }}>Editar perfil</Text>
          <Text style={{ ...typography.body, color: colors.textLight }}>
            Altere seus dados pessoais e endereço
          </Text>
        </View>

        {/* Dados Pessoais */}
        <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
          <Text style={{ ...typography.h3, color: colors.text }}>Dados pessoais</Text>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.bodySmall, color: colors.text }}>Nome completo</Text>
              <TextInput
                style={{
                  ...typography.input,
                  minHeight: minTouchTarget,
                  backgroundColor: colors.background,
                  borderWidth: errors.nome ? 2 : 1,
                  borderColor: errors.nome ? colors.danger : colors.border,
                  borderRadius: borderRadius.sm,
                  color: colors.text,
                }}
                placeholder="Seu nome completo"
                value={formData.nome}
                onChangeText={value => handleChange('nome', value)}
                autoCapitalize="words"
                {...a11y.input('Nome completo', 'Digite seu nome completo')}
              />
              {errors.nome && <Text style={{ ...typography.caption, color: colors.danger }}>{errors.nome}</Text>}
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.bodySmall, color: colors.text }}>Telefone</Text>
              <TextInput
                style={{
                  ...typography.input,
                  minHeight: minTouchTarget,
                  backgroundColor: colors.background,
                  borderWidth: errors.telefone ? 2 : 1,
                  borderColor: errors.telefone ? colors.danger : colors.border,
                  borderRadius: borderRadius.sm,
                  color: colors.text,
                }}
                placeholder="(XX) XXXXX-XXXX"
                value={formData.telefone}
                onChangeText={value => handleChange('telefone', formatarTelefone(value))}
                keyboardType="phone-pad"
                maxLength={15}
                {...a11y.input('Telefone', 'Digite seu telefone com DDD')}
              />
              {errors.telefone && <Text style={{ ...typography.caption, color: colors.danger }}>{errors.telefone}</Text>}
            </View>
          </View>
        </View>

        {/* Endereço */}
        <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
          <Text style={{ ...typography.h3, color: colors.text }}>Endereço</Text>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.bodySmall, color: colors.text }}>CEP</Text>
              <TextInput
                style={{
                  ...typography.input,
                  minHeight: minTouchTarget,
                  backgroundColor: colors.background,
                  borderWidth: errors.endereco?.cep ? 2 : 1,
                  borderColor: errors.endereco?.cep ? colors.danger : colors.border,
                  borderRadius: borderRadius.sm,
                  color: colors.text,
                }}
                placeholder="XXXXX-XXX"
                value={formData.endereco.cep}
                onChangeText={value => handleEnderecoChange('cep', formatarCEP(value))}
                keyboardType="numeric"
                maxLength={9}
                {...a11y.input('CEP', 'Digite seu CEP')}
              />
              {errors.endereco?.cep && <Text style={{ ...typography.caption, color: colors.danger }}>{errors.endereco.cep}</Text>}
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.bodySmall, color: colors.text }}>Logradouro</Text>
              <TextInput
                style={{
                  ...typography.input,
                  minHeight: minTouchTarget,
                  backgroundColor: colors.background,
                  borderWidth: errors.endereco?.logradouro ? 2 : 1,
                  borderColor: errors.endereco?.logradouro ? colors.danger : colors.border,
                  borderRadius: borderRadius.sm,
                  color: colors.text,
                }}
                placeholder="Rua, Avenida, etc."
                value={formData.endereco.logradouro}
                onChangeText={value => handleEnderecoChange('logradouro', value)}
                autoCapitalize="words"
                {...a11y.input('Logradouro', 'Digite o nome da rua ou avenida')}
              />
              {errors.endereco?.logradouro && <Text style={{ ...typography.caption, color: colors.danger }}>{errors.endereco.logradouro}</Text>}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.bodySmall, color: colors.text }}>Número</Text>
                <TextInput
                  style={{
                    ...typography.input,
                    minHeight: minTouchTarget,
                    backgroundColor: colors.background,
                    borderWidth: errors.endereco?.numero ? 2 : 1,
                    borderColor: errors.endereco?.numero ? colors.danger : colors.border,
                    borderRadius: borderRadius.sm,
                    color: colors.text,
                  }}
                  placeholder="123"
                  value={formData.endereco.numero}
                  onChangeText={value => handleEnderecoChange('numero', value)}
                  {...a11y.input('Número', 'Digite o número da residência')}
                />
                {errors.endereco?.numero && <Text style={{ ...typography.caption, color: colors.danger }}>{errors.endereco.numero}</Text>}
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.bodySmall, color: colors.text }}>Complemento (opcional)</Text>
                <TextInput
                  style={{
                    ...typography.input,
                    minHeight: minTouchTarget,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: borderRadius.sm,
                    color: colors.text,
                  }}
                  placeholder="Apto, Bloco, etc."
                  value={formData.endereco.complemento}
                  onChangeText={value => handleEnderecoChange('complemento', value)}
                  autoCapitalize="words"
                  {...a11y.input('Complemento', 'Digite complemento se houver')}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.bodySmall, color: colors.text }}>Bairro</Text>
                <TextInput
                  style={{
                    ...typography.input,
                    minHeight: minTouchTarget,
                    backgroundColor: colors.background,
                    borderWidth: errors.endereco?.bairro ? 2 : 1,
                    borderColor: errors.endereco?.bairro ? colors.danger : colors.border,
                    borderRadius: borderRadius.sm,
                    color: colors.text,
                  }}
                  placeholder="Centro"
                  value={formData.endereco.bairro}
                  onChangeText={value => handleEnderecoChange('bairro', value)}
                  autoCapitalize="words"
                  {...a11y.input('Bairro', 'Digite seu bairro')}
                />
                {errors.endereco?.bairro && <Text style={{ ...typography.caption, color: colors.danger }}>{errors.endereco.bairro}</Text>}
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.bodySmall, color: colors.text }}>Cidade</Text>
                <TextInput
                  style={{
                    ...typography.input,
                    minHeight: minTouchTarget,
                    backgroundColor: colors.background,
                    borderWidth: errors.endereco?.cidade ? 2 : 1,
                    borderColor: errors.endereco?.cidade ? colors.danger : colors.border,
                    borderRadius: borderRadius.sm,
                    color: colors.text,
                  }}
                  placeholder="São Paulo"
                  value={formData.endereco.cidade}
                  onChangeText={value => handleEnderecoChange('cidade', value)}
                  autoCapitalize="words"
                  {...a11y.input('Cidade', 'Digite sua cidade')}
                />
                {errors.endereco?.cidade && <Text style={{ ...typography.caption, color: colors.danger }}>{errors.endereco.cidade}</Text>}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.bodySmall, color: colors.text }}>Estado</Text>
                <TextInput
                  style={{
                    ...typography.input,
                    minHeight: minTouchTarget,
                    backgroundColor: colors.background,
                    borderWidth: errors.endereco?.estado ? 2 : 1,
                    borderColor: errors.endereco?.estado ? colors.danger : colors.border,
                    borderRadius: borderRadius.sm,
                    color: colors.text,
                  }}
                  placeholder="SP"
                  value={formData.endereco.estado}
                  onChangeText={value => handleEnderecoChange('estado', value.toUpperCase())}
                  maxLength={2}
                  autoCapitalize="characters"
                  {...a11y.input('Estado', 'Digite a sigla do estado (ex: SP)')}
                />
                {errors.endereco?.estado && <Text style={{ ...typography.caption, color: colors.danger }}>{errors.endereco.estado}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* Botões de ação */}
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <TouchableOpacity
            style={{
              ...globalStyles.card,
              backgroundColor: saving ? colors.textLight : colors.primary,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.sm,
              alignItems: 'center',
              minHeight: minTouchTarget,
              justifyContent: 'center',
            }}
            onPress={handleSalvar}
            disabled={saving}
            activeOpacity={0.8}
            {...a11y.button('Salvar alterações', 'Confirmar e salvar as alterações no perfil')}
          >
            {saving ? (
              <ActivityIndicator color={colors.textOnPrimary} size="large" />
            ) : (
              <Text style={{ ...typography.button, color: colors.textOnPrimary }}>
                Salvar alterações
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
            onPress={() => navigation.goBack()}
            disabled={saving}
            activeOpacity={0.8}
            {...a11y.button('Cancelar', 'Voltar sem salvar')}
          >
            <Text style={{ ...typography.button, color: colors.primary }}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({});
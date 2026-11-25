import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

export const LoginScreen = () => {
  const { login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !senha) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email.trim(), senha);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const openWebRegister = () => {
    Linking.openURL('https://clinagenda.onrender.com');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={globalStyles.container}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xl,
          justifyContent: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Brand */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            {...a11y.image('ClínAgenda - Saúde na Palma da Mão')}
          >
            <Ionicons name="medical" size={36} color={colors.textOnPrimary} />
          </View>
          <Text style={{ ...typography.h1, color: colors.primaryDark, marginTop: spacing.md }}>
            ClínAgenda
          </Text>
          <Text style={{ ...typography.body, color: colors.textLight, marginTop: spacing.xs }}>
            Saúde na Palma da Mão
          </Text>
        </View>

        {/* Login Form */}
        <View style={[globalStyles.card, globalStyles.cardContent, { gap: spacing.md }]}>
          <Text style={{ ...typography.h2, color: colors.text, textAlign: 'center' }}>
            Bem-vindo de volta
          </Text>
          <Text style={{ ...typography.body, color: colors.textLight, textAlign: 'center' }}>
            Entre com seus dados para continuar
          </Text>

          {/* Error Message */}
          {error && (
            <View
              style={{
                padding: spacing.md,
                backgroundColor: '#fff0ef',
                borderRadius: borderRadius.sm,
                borderWidth: 1,
                borderColor: colors.danger,
              }}
              {...a11y.text(error)}
            >
              <Text style={{ ...typography.body, color: colors.danger }}>{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>
              E-mail
            </Text>
            <TextInput
              style={{
                ...typography.input,
                minHeight: minTouchTarget,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                color: colors.text,
              }}
              placeholder="voce@email.com"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              {...a11y.input('E-mail', 'Digite seu e-mail de acesso')}
            />
          </View>

          {/* Password Input */}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.body, color: colors.text, fontWeight: '700' }}>
              Senha
            </Text>
            <TextInput
              style={{
                ...typography.input,
                minHeight: minTouchTarget,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                color: colors.text,
              }}
              placeholder="Digite sua senha"
              placeholderTextColor={colors.textLight}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              {...a11y.input('Senha', 'Digite sua senha')}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={{
              ...globalStyles.card,
              backgroundColor: loading ? colors.textLight : colors.primary,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.sm,
              alignItems: 'center',
              minHeight: minTouchTarget,
              justifyContent: 'center',
            }}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            {...a11y.button('Entrar na conta', 'Fazer login com e-mail e senha')}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} size="large" />
            ) : (
              <Text style={{ ...typography.button, color: colors.textOnPrimary }}>
                Entrar na minha conta
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={{ alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm }}>
          <Text style={{ ...typography.body, color: colors.textLight }}>
            Não tem conta?{' '}
            <Text
              style={{ color: colors.primary, fontWeight: '700' }}
              onPress={openWebRegister}
              {...a11y.button('Criar conta no site', 'Abrir site para criar conta de paciente')}
            >
              Crie sua conta no site
            </Text>
          </Text>
          <Text style={{ ...typography.caption, color: colors.textLight }}>
            O cadastro de pacientes é feito pela versão web
          </Text>
        </View>

        {/* Version/Footer */}
        <Text style={{ ...typography.caption, color: colors.textLight, textAlign: 'center', marginTop: spacing.xl }}>
          ClínAgenda — Projeto Integrador
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
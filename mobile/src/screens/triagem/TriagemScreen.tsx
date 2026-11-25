import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, ScrollView as RNScrollView, View as RNView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { triagemApi } from '@/services/api';
import { colors, spacing, borderRadius, typography, minTouchTarget, globalStyles, a11y } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackScreenProps } from '@/navigation/types';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type TriagemRouteParams = { sessionId?: string } | undefined;

type ScrollViewRef = React.ComponentRef<typeof RNScrollView>;
type ViewRef = React.ComponentRef<typeof RNView>;

export const TriagemScreen = ({ navigation }: HomeStackScreenProps<'Triagem'>) => {
  const route = useRoute<HomeStackScreenProps<'Triagem'>['route']>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId || null);
  const [stage, setStage] = useState<'collecting' | 'recommendation' | 'emergency'>('collecting');
  const [collected, setCollected] = useState({ symptoms: [] as string[], duration: null as string | null, intensity: null as number | null });
  const [specialties, setSpecialties] = useState<Array<{ especialidadeId: string; nome: string; reason: string; confidence: 'alta' | 'media' | 'baixa' }>>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState('');
  const [triagemId, setTriagemId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollViewRef>(null);
  const messagesEndRef = useRef<ViewRef>(null);

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const iniciarTriagem = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await triagemApi.start();
      setSessionId(result.sessionId);
      setStage(result.stage);
      setCollected(result.collected);
      setSpecialties(result.specialties);
      if (result.disclaimer) setDisclaimer(result.disclaimer);
      addMessage('assistant', result.reply);
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar triagem. Tente novamente.');
      addMessage('assistant', 'Desculpe, não consegui iniciar a conversa. Tente novamente em alguns instantes.');
    } finally {
      setLoading(false);
    }
  };

  const enviarMensagem = async () => {
    if (!input.trim() || loading || !sessionId) return;
    if (stage === 'recommendation' || stage === 'emergency') return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setLoading(true);
    setError('');

    try {
      const result = await triagemApi.sendMessage(sessionId, userMessage);
      setStage(result.stage);
      setCollected(result.collected);
      setSpecialties(result.specialties);
      if (result.disclaimer) setDisclaimer(result.disclaimer);
      if (result.triagemId) setTriagemId(result.triagemId);

      addMessage('assistant', result.reply);

      if (result.stage === 'recommendation' || result.stage === 'emergency') {
        // Navigate to result screen after a brief delay
        setTimeout(() => {
          navigation.navigate('TriagemResultado', {
            specialties: result.specialties,
            disclaimer: result.disclaimer || 'Esta é uma orientação inicial e não substitui a avaliação de um profissional de saúde.',
            triagemId: result.triagemId,
          });
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar mensagem. Tente novamente.');
      addMessage('assistant', 'Desculpe, ocorreu um erro. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      iniciarTriagem();
    }
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && messages.length === 0) {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, color: colors.textLight, marginTop: spacing.md }}>
          Iniciando pré-triagem...
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
      <View style={{ flex: 1, flexDirection: 'column' }}>
        {/* Header */}
        <View style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: spacing.sm, minWidth: minTouchTarget, minHeight: minTouchTarget, justifyContent: 'center' }}
            {...a11y.button('Voltar', 'Voltar para a tela inicial')}
          >
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.h3, color: colors.text }}>Pré-triagem</Text>
            <Text style={{ ...typography.caption, color: colors.textLight }}>
              {stage === 'collecting' ? 'Coletando informações...' :
               stage === 'recommendation' ? 'Recomendação pronta' : 'Emergência detectada'}
            </Text>
          </View>
          {stage !== 'collecting' && (
            <Ionicons
              name={stage === 'emergency' ? 'alert-circle' : 'checkmark-circle'}
              size={24}
              color={stage === 'emergency' ? colors.emergency : colors.success}
            />
          )}
        </View>

        {/* Error Banner */}
        {error && (
          <View style={{
            padding: spacing.md,
            backgroundColor: '#fff0ef',
            borderBottomWidth: 1,
            borderBottomColor: colors.danger,
          }}>
            <Text style={{ ...typography.bodySmall, color: colors.danger, textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.md,
            gap: spacing.md,
            paddingBottom: spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: spacing.sm,
              }}
            >
              {/* Avatar */}
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: msg.role === 'user' ? colors.primary : colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                {...a11y.image(msg.role === 'user' ? 'Você' : 'Assistente')}
              >
                <Ionicons
                  name={msg.role === 'user' ? 'person' : 'medical'}
                  size={18}
                  color={msg.role === 'user' ? colors.textOnPrimary : colors.primary}
                />
              </View>

              {/* Message Bubble */}
              <View
                style={{
                  maxWidth: '75%',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: msg.role === 'user' ? colors.primary : colors.surface,
                  borderWidth: msg.role === 'assistant' ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    ...typography.body,
                    color: msg.role === 'user' ? colors.textOnPrimary : colors.text,
                    lineHeight: 22,
                  }}
                  {...a11y.text(msg.content)}
                >
                  {msg.content}
                </Text>
                <Text
                  style={{
                    ...typography.caption,
                    color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : colors.textLight,
                    marginTop: 2,
                    textAlign: 'right',
                  }}
                >
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          ))}

          {/* Typing Indicator */}
          {loading && stage === 'collecting' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Ionicons name="medical" size={18} color={colors.primary} />
              </View>
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                </View>
              </View>
            </View>
          )}

          <View ref={messagesEndRef} />
        </ScrollView>

        {/* Input Area */}
        {stage === 'collecting' && (
          <View
            style={{
              padding: spacing.md,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
              <TextInput
                style={{
                  flex: 1,
                  ...typography.input,
                  minHeight: minTouchTarget,
                  maxHeight: 120,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: borderRadius.full,
                  color: colors.text,
                }}
                placeholder="Digite sua resposta..."
                placeholderTextColor={colors.textLight}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={enviarMensagem}
                multiline
                {...a11y.input('Sua resposta', 'Digite seus sintomas ou resposta para a IA')}
              />
              <TouchableOpacity
                style={{
                  width: minTouchTarget,
                  height: minTouchTarget,
                  borderRadius: borderRadius.full,
                  backgroundColor: input.trim() && !loading ? colors.primary : colors.textLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={enviarMensagem}
                disabled={!input.trim() || loading}
                activeOpacity={0.8}
                {...a11y.button('Enviar mensagem', 'Enviar sua resposta para a pré-triagem')}
              >
                <Ionicons name="send" size={22} color={input.trim() && !loading ? colors.textOnPrimary : colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ ...typography.caption, color: colors.textLight, textAlign: 'center' }}>
              A IA fará perguntas sobre seus sintomas. Responda naturalmente.
            </Text>
          </View>
        )}

        {stage !== 'collecting' && (
          <View
            style={{
              padding: spacing.md,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.text, marginTop: spacing.sm }}>
              {stage === 'recommendation' ? 'Preparando recomendação...' : 'Analisando situação de emergência...'}
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({});
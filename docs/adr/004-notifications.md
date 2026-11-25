# ADR 004: Estratégia de Notificações/Lembretes

**Status:** Aceito  
**Data:** 2026-11-24

## Contexto
Critério de avaliação (5%): "lembretes/notificações (estratégia simples e documentada)". Prazo curto (15 dias), sem infra de push server dedicada.

## Decisão
**Dupla camada: In-app (obrigatório) + Push local via `expo-notifications` (opcional, melhora UX).**

### In-app (sempre funciona)
- Tela "Início" mostra **próxima consulta** com destaque (cards, badge)
- Lista "Próximos agendamentos" ordenada por data/hora
- Badge numérico no ícone da aba "Consultas" (ex.: "3 próximas")
- Pull-to-refresh atualiza status

### Push local (expo-notifications)
- Ao confirmar agendamento, app agenda **duas notificações locais**:
  - 24 horas antes: "Lembrete: sua consulta com Dr. X é amanhã às HH:MM"
  - 1 hora antes: "Sua consulta começa em 1 hora. Endereço: Clinica Y"
- Permissão solicitada na primeira abertura pós-login (rationale: "Para lembrar suas consultas")
- Se negada: fallback silencioso → in-app continua funcionando
- Notificações usam `Date` do device (timezone local do paciente)
- Cancelamento da consulta → cancela notificações agendadas (`cancelAllScheduledNotificationsAsync` para IDs daquela consulta)

## Não incluso (fora do escopo)
- Push remoto (Expo Push Service + backend cron)
- E-mail/SMS/WhatsApp
- Serviço de agendamento distribuído (bullmq, cron jobs no servidor)

## Justificativa
- In-app: zero dependência, atende critério "estratégia documentada", funciona 100% do tempo
- Push local: nativo do Expo, não precisa backend, melhora UX real, esforço médio
- Documentação no README: como testar, permissões, fallback

## Consequências
- Dependência: `expo-notifications` + `expo-device` + `expo-constants`
- Permissão `POST_NOTIFICATIONS` no Android 13+ (expo-plugins configura)
- iOS: precisa capability "Push Notifications" no EAS Build (profile preview já inclui)
- Testar em device físico (emulador Android às vezes não mostra notificação local)
# ADR 003: Escopo do App React Native — Apenas Paciente

**Status:** Aceito  
**Data:** 2026-11-24

## Contexto
Backend suporta 3 perfis (paciente, profissional, administrador). Frontend web (PWA) já atende todos e está publicado. Prazo: 15 dias. Peso da nota concentra-se no fluxo paciente (triagem 15% + agendamento 10% + integração 5% = 30%).

## Decisão
**App React Native (Expo) apenas para perfil PACIENTE.**  
Profissionais e administradores continuam usando o **web PWA atual** (https://clinagenda.onrender.com).

## Funcionalidades no app RN (paciente)
- Cadastro/login/logout
- Pré-triagem conversacional (chatbot)
- Visualização de especialidades sugeridas + aviso de transparência
- Busca de profissionais/clínicas **filtrados pela especialidade da triagem**
- Agendamento (data/hora disponíveis)
- Listagem: Próximos agendamentos + Histórico
- Cancelar/Reagendar
- Editar perfil (nome, telefone, endereço)
- Notificações/lembretes (estratégia simples)

## Fora do escopo RN (usam web)
- Cadastro de clínicas, especialidades, profissionais (admin)
- Criação de acesso para profissional (admin)
- Gestão de disponibilidades (profissional)
- Listagem administrativa de pacientes/agendamentos (admin)

## Justificativa
- Entrega o que tem maior peso na nota no tempo disponível
- Web PWA já funciona, é responsivo, instalável, atende profissional/admin
- Evita reescrita de telas admin/profissional em RN
- Arquitetura: API compartilhada, dois frontends (web + RN) consumindo a mesma API

## Consequências
- `EXPO_PUBLIC_API_URL` aponta para a mesma API publicada
- Autenticação JWT idêntica (token em `expo-secure-store`)
- Rotas de triagem novas no backend; web não as usa (por enquanto)
- Deploy: EAS Build → APK preview; web continua no Render
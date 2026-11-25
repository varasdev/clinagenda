# Glossário — ClínAgenda (2ª Entrega)

| Termo | Definição |
|-------|-----------|
| **Pré-triagem** | Fluxo conversacional onde a IA coleta sintomas, duração, intensidade e recomenda especialidade(s). Não diagnostica. |
| **TriageAiProvider** | Interface no backend que isola o provedor de IA (Claude, Gemini, OpenAI). Método principal: `generateRecommendation(messages, context) -> TriageOutput`. |
| **TriageOutput** | JSON validado: `{ stage, reply, collected, specialties[], emergency, disclaimer }`. |
| **Especialidade sugerida** | Nome normalizado mapeado para especialidade existente no banco (sinônimos → ID). Sem match → "Clínico geral". |
| **Sinais de emergência** | Palavras-chave (dor no peito, falta de ar, AVC, desmaio, sangramento intenso, autoagressão) → interrupção imediata + orientação SAMU 192 / CVV 188. |
| **Paciente** | Perfil que faz triagem e agenda para si. Vinculado a `usuarios.perfil = "paciente"` e documento em `pacientes`. |
| **Profissional** | Perfil que gerencia disponibilidades e vê seus agendamentos. Vinculado a `profissionais`. |
| **Administrador** | Perfil que cadastra clínicas, especialidades, profissionais, cria acessos de profissional. |
| **Disponibilidade** | Janela de tempo (dia da semana + hora início/fim) de um profissional em uma clínica. |
| **Agendamento** | Consulta marcada: paciente + profissional + data + hora + status (`agendado`/`cancelado`/`concluído`/`remarcado`). |
| **Triagem** | Documento persistido: pacienteId, conversa (resumo), sintomas, duração, intensidade, especialidades sugeridas, aviso exibido, data, consultaId (opcional). |
| **MVP (03/12)** | Mínimo demonstrável: triagem → especialidade → agendamento funcionando ponta a ponta no app RN + API publicada. |
| **EAS Build** | Serviço da Expo para gerar APK/AAB (preview/production) sem configurar Android Studio/Xcode local. |
| **expo-secure-store** | Armazenamento criptografado no device para JWT (não AsyncStorage). |
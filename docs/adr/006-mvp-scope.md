# ADR 006: Escopo MVP (03/12) vs. Polimento (04–08/12)

**Status:** Aceito  
**Data:** 2026-11-24

## Contexto
Entrega em 09/12. Hoje 24/11 = 15 dias. Precisa de "mínimo demonstrável" funcionando ponta a ponta até 03/12 (10 dias), deixando 5 dias para deploy, ensaio, correções.

## Decisão — MVP (até 03/12)

| Área | Incluído no MVP |
|------|-----------------|
| **Auth RN** | Login/logout + JWT em `expo-secure-store`; cadastro permanece no web |
| **Triagem** | Chat 5–7 turnos → especialidade(s) + aviso transparência + persistência; fallback determinístico básico |
| **Triagem → Agendamento** | Especialidade pré-selecionada na tela de agendamento; lista profissionais filtrados por especialidade |
| **Agendamento** | Listar profissionais da especialidade → data/hora → confirmar; cancelar (409 tratado) |
| **Listagens** | Abas: "Próximos" + "Histórico" (status agendado/cancelado) |
| **Notificações** | In-app: badge na aba, próxima consulta em destaque na Home |
| **Perfil** | Ver/editar nome, telefone, endereço (campos permitidos pela API) |
| **Acessibilidade** | Fonte ≥16sp, botões ≥48dp, `accessibilityLabel/Role/Hint`, contraste AA, poucos passos |
| **Deploy** | API no Render (rotas `/triage/*` + `GOOGLE_API_KEY`); EAS Build preview APK; `EXPO_PUBLIC_API_URL` = API publicada |
| **Docs** | README RN (execução local, build, variáveis), ADRs linkados, script de demo |

## Polimento (04–08/12) — só se houver tempo

- Cadastro de paciente no app RN
- Reagendar (edição de agendamento existente)
- Push local (`expo-notifications`) 24h/1h antes
- Foto de perfil, alterar senha
- Testes TalkBack/VoiceOver, ajustes finos de contraste/tamanho
- Ícone, splash screen, assinatura production
- Vídeo demo gravado, capturas de tela, `ENTREGA.md` final

## Critério de corte
Se qualquer item do MVP não estiver **rodando no device/emulador com API publicada** até 03/12, cortar do polimento e focar no que falta. Prioridade: triagem → agendamento → listagens → auth → perfil → notificações in-app → acessibilidade.

## Justificativa
- 10 dias úteis para MVP é apertado; escopo enxuto garante demo funcionando
- Itens de polimento são incrementais (não quebram o fluxo principal)
- Critérios de nota cobertos: triagem (15%), agendamento (10%), integração (5%), auth/perfis (5%), backend (5%), UX/acessibilidade (5%), deploy (5%) = 55% dos 60% técnicos

## Consequências
- Cadastro no web: instrução no README "crie conta no web antes de usar o app"
- Reagendar = cancelar + novo (aceitável para demo acadêmica)
- Push local documentado como "futuro" no README se não der tempo
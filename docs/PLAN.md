# Plano de Execução — ClínAgenda 2ª Entrega

**Base:** DESIGN.md, ADRs 001–006, MVP até 03/12, Polimento 04–08/12  
**Ordenação:** Peso na nota (decrescente) → Dependências → Esforço  
**Formato:** `[ID] Título — Peso | Dependências | Estimativa | Critério de Aceite`

---

## Legenda
- **Peso:** % da nota impactada (soma 60% técnico)
- **Dep:** IDs das tarefas que devem estar prontas antes
- **Est:** Dias de dev (1 pessoa); total MVP ≈ 10 dias úteis
- **MVP:** ✅ = no MVP (03/12); ⏳ = polimento (04–08/12)

---

## FASE 0 — Setup e Fundação (Pré-requisito)

| ID | Tarefa | Peso | Dep | Est | MVP | Critério de Aceite |
|----|--------|------|-----|-----|-----|-------------------|
| **T01** | Configurar projeto Expo (TypeScript, ESLint, Prettier, husky) | — | — | 0.5 | ✅ | `npx expo start` roda; `npm run lint` passa |
| **T02** | Instalar dependências core: `@anthropic-ai/sdk`, `zod`, `axios`, `expo-secure-store`, `expo-notifications`, `expo-device`, `expo-constants`, `@react-navigation/*`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, `date-fns` | — | T01 | 0.5 | ✅ | `package.json` tem todas; `npm install` limpo |
| **T03** | Configurar navegação: AuthStack + MainTabs (Home, Agenda, Perfil) + TypeScript types | — | T01 | 0.5 | ✅ | Navega entre tabs; TS sem erros |
| **T04** | Cliente HTTP único (`services/api.ts`): axios + interceptor JWT (SecureStore) + baseURL `EXPO_PUBLIC_API_URL` + tratamento central de erro (401→logout, network→banner) | — | T02 | 0.5 | ✅ | Requisição autenticada funciona; 401 limpa token e vai pra Login |
| **T05** | Tema/Estilos base: cores, tipografia (≥16sp), espaçamento, componentes Button, Input, Card, Badge acessíveis (`accessibilityLabel`, `role`, `hint`), contraste AA | — | T01 | 0.5 | ✅ | Storybook/visual check: botões ≥48dp, fonte ≥16sp, labels |
| **T06** | Variáveis de ambiente: `.env.local` (dev) + EAS Build secrets (preview); `EXPO_PUBLIC_API_URL` | — | T01 | 0.25 | ✅ | Build preview aponta para API Render |
| **T07** | Health check backend: adicionar `GET /health` (alias de `/`) + rate limit global (express-rate-limit) | — | — | 0.25 | ✅ | `curl /health` retorna 200; rate limit ativo |

**Subtotal Fase 0:** ~2.5 dias

---

## FASE 1 — Autenticação RN (Paciente)

| ID | Tarefa | Peso | Dep | Est | MVP | Critério de Aceite |
|----|--------|------|-----|-----|-----|-------------------|
| **T10** | LoginScreen: email/senha → `POST /auth/login` → salva token no `expo-secure-store` → navega MainTabs | 5% | T03, T04 | 0.5 | ✅ | Login válido entra; inválido mostra erro PT-BR; token persiste reload |
| **T11** | Logout: limpa SecureStore + estado → volta LoginScreen | 5% | T10 | 0.25 | ✅ | Botão "Sair" no header/perfil faz logout completo |
| **T12** | Auto-login: ao abrir app, se token válido (`GET /auth/me`) → MainTabs; senão → LoginScreen | 5% | T10 | 0.25 | ✅ | Fechar/abrir app mantém sessão |
| **T13** | Cadastro: **não no MVP** — link "Criar conta no site" abre web PWA no navegador | 5% | — | — | ⏳ | Documentado no README |

**Subtotal Fase 1:** ~1 dia

---

## FASE 2 — Backend: Triagem (IA + Persistência) — **PESO 15%**

| ID | Tarefa | Peso | Dep | Est | MVP | Critério de Aceite |
|----|--------|------|-----|-----|-----|-------------------|
| **T20** | Criar coleção `triagens` no MongoDB + índices `(pacienteId, criadoEm)`, `consultaId` único sparse | 15% | — | 0.25 | ✅ | `db.triagens.getIndexes()` mostra índices |
| **T21** | `TriageAiProvider` interface + `AnthropicProvider` (SDK, system prompt PT-BR, JSON output, max 7 turnos, validação Zod) | 15% | T07 | 1.0 | ✅ | Unit test mockado retorna `TriageOutput` válido |
| **T22** | Fallback determinístico: `keywordEmergencyCheck(message)` → `{ emergency: true, reply }` se keywords (dor no peito, falta de ar, AVC, desmaio, sangramento intenso, autoagressão) | 15% | T21 | 0.5 | ✅ | Palavras-chave disparam emergency sem chamar IA |
| **T23** | `specialtyMapper`: mapear nomes da IA → `especialidadeId` do banco (sinônimos + fallback "Clínico geral") | 15% | T20 | 0.5 | ✅ | "Neurologia" → ObjectId correto; desconhecido → Clínico geral |
| **T24** | `TriageService`: orquestra sessão em memória (Map<sessionId, messages[]>), chama provider, valida, persiste em `triagens`, retorna `TriageOutput` | 15% | T21, T22, T23 | 0.75 | ✅ | Fluxo completo: start → 3 mensagens → recommendation persistido |
| **T25** | Rotas Express: `POST /triage/start`, `POST /triage/message`, `GET /triage/:sessionId/result` + auth middleware + rate limit (10 req/min/IP) | 15% | T24 | 0.5 | ✅ | Swagger mostra rotas; `curl` autenticado funciona; rate limit 429 |
| **T26** | Validação Zod nos endpoints + erros padronizados `{ code, message, details? }` | 15% | T25 | 0.25 | ✅ | Body inválido → 400 com detalhes |

**Subtotal Fase 2:** ~3.75 dias

---

## FASE 3 — App RN: Triagem (Chatbot)

| ID | Tarefa | Peso | Dep | Est | MVP | Critério de Aceite |
|----|--------|------|-----|-----|-----|-------------------|
| **T30** | `TriagemScreen`: chat com bolhas user/assistant, input fixo rodapé, `ActivityIndicator` "digitando...", botão enviar ≥48dp | 15% | T03, T05, T10 | 0.75 | ✅ | Visual: bolhas, input, loading; acessibilidade labels |
| **T31** | Hook `useTriage(sessionId?)`: gerencia estado (stage, messages, collected, specialties, emergency), chama `POST /triage/start` e `POST /triage/message` | 15% | T04, T30 | 0.5 | ✅ | Inicia sessão, envia mensagem, recebe reply, atualiza UI |
| **T32** | Tratamento `stage=emergency`: tela de alerta vermelho, texto SAMU 192 / CVV 188, botão "Entendi" volta Home, **não** mostra agendamento | 15% | T31 | 0.25 | ✅ | Palavra-chave "dor no peito" → tela emergência |
| **T33** | Tela `TriagemResultadoScreen` (stage=recommendation): lista especialidades com `reason` + `confidence`, disclaimer fixo, botão "Ver profissionais" → navega AgendarScreen com `especialidadeId` | 15% | T31 | 0.5 | ✅ | Mostra 1-3 especialidades; disclaimer visível; navega com param |
| **T34** | Persistência local da triagem (AsyncStorage opcional) para recuperar se app fechar no meio | 15% | T31 | 0.25 | ⏳ | Recupera sessão ao reabrir |

**Subtotal Fase 3:** ~2 dias (MVP) + 0.25 polimento

---

## FASE 4 — App RN: Agendamento (Integração Triagem → Agenda) — **PESO 10% + 5%**

| ID | Tarefa | Peso | Dep | Est | MVP | Critério de Aceite |
|----|--------|------|-----|-----|-----|-------------------|
| **T40** | `AgendarScreen`: recebe `especialidadeId` (param) → `GET /profissionais?especialidadeId=` → lista profissionais (nome, clínica, especialidade) | 10% | T04, T33 | 0.5 | ✅ | Lista filtrada pela especialidade da triagem |
| **T41** | Seleção de profissional → `GET /disponibilidades?profissionalId=` → agrupa por dia → calendário (dias com horários) → select hora → `POST /agendamentos` | 10% | T40 | 1.0 | ✅ | Fluxo completo: profissional → data → hora → 201 |
| **T42** | Validação UI: data passada disabled, hora fora da disponibilidade hidden, conflito 409 → toast erro PT-BR | 10% | T41 | 0.5 | ✅ | 409 mostra "Horário ocupado"; não trava app |
| **T43** | Sucesso agendamento: toast verde + navega `AgendamentosScreen` (aba Próximos) + atualiza triagem `consultaId` (backend faz via T24) | 10% | T41 | 0.25 | ✅ | Agendamento aparece em Próximos |
| **T44** | `AgendamentosScreen`: tabs "Próximos" / "Histórico" → `GET /agendamentos?status=agendado|cancelado` → cards com profissional, data, hora, status, botão cancelar (se agendado) | 10% | T04, T10 | 0.75 | ✅ | Duas abas funcionam; pull-to-refresh; cancelar → 200 + lista atualiza |
| **T45** | `DetalheAgendamentoScreen`: dados completos (profissional, clínica, endereço, data, hora, observações) + botões cancelar/reagendar | 10% | T44 | 0.5 | ✅ | Navega do card; mostra tudo; cancelar funciona |
| **T46** | Reagendar: **não no MVP** — cancelar + novo agendamento (documentar) | 10% | — | — | ⏳ | README explica workaround |

**Subtotal Fase 4:** ~3.5 dias

---

## FASE 5 — App RN: Perfil + Home + Notificações In-App

| ID | Tarefa | Peso | Dep | Est | MVP | Critério de Aceite |
|----|--------|------|-----|-----|-----|-------------------|
| **T50** | `HomeScreen`: boas-vindas + card "Próxima consulta" (se houver) + botão "Iniciar triagem" → TriagemScreen | 5% | T04, T44 | 0.5 | ✅ | Próxima consulta aparece; botão navega |
| **T51** | `PerfilScreen`: `GET /pacientes/:id` → mostra nome, email, CPF, nascimento, telefone, endereço (readonly) + botão Editar | 5% | T04, T10 | 0.5 | ✅ | Dados carregados; email/CPF/nascimento disabled |
| **T52** | `EditarPerfilScreen`: `PUT /pacientes/:id` com nome, telefone, endereço → toast sucesso → volta Perfil | 5% | T51 | 0.5 | ✅ | Edita campos permitidos; 200 atualiza UI |
| **T53** | Badge na tab "Agenda": contador de agendamentos `status=agendado` (atualiza no focus) | 5% | T44 | 0.25 | ✅ | Badge mostra número correto |
| **T54** | Banner "Sem conexão" (NetInfo) topo fixo + retry automático | 5% | T04 | 0.25 | ✅ | Modo avião → banner; volta → some |
| **T55** | Push local (`expo-notifications`): permissão no login, agenda 24h/1h antes, cancela no cancelamento | 5% | T10, T44 | 0.75 | ⏳ | Notificação aparece no device (teste real) |

**Subtotal Fase 5:** ~2 dias (MVP) + 0.75 polimento

---

## FASE 6 — Acessibilidade + Polimento UX (Idosos) — **PESO 5%**

| ID | Tarefa | Peso | Dep | Est | MVP | Critério de Aceite |
|----|--------|------|-----|-----|-----|-------------------|
| **T60** | Auditoria contraste: todas as cores ≥ 4.5:1 (WCAG AA) — ajustar se necessário | 5% | T05 | 0.25 | ✅ | Ferramenta (axe/color-contrast) passa |
| **T61** | Fonte dinâmica: respeitar `Text` `allowFontScaling=true` + testar "Grande" no sistema | 5% | T05 | 0.25 | ✅ | Configuração "Texto grande" do SO aumenta app |
| **T62** | `accessibilityLabel`, `role`, `hint` em todos botões, inputs, cards interativos | 5% | T05, T30, T40, T44 | 0.5 | ✅ | TalkBack/VoiceOver lê tudo significativo |
| **T63** | Área de toque ≥ 48dp: botões, inputs, itens de lista, tabs | 5% | T05 | 0.25 | ✅ | Inspecionador mostra ≥ 48x48 |
| **T64** | Loading skeletons (não spinners genéricos) nas listas: Home, Agendar, Agendamentos, Perfil | 5% | T30, T40, T44, T50 | 0.5 | ⏳ | Placeholder animado enquanto carrega |
| **T65** | Empty states amigáveis: "Nenhuma consulta ainda. Inicie uma triagem para agendar." + botão ação | 5% | T44, T50 | 0.25 | ✅ | Estados vazios têm CTA |

**Subtotal Fase 6:** ~1.5 dias (MVP) + 0.75 polimento

---

## FASE 7 — Deploy, Build, Docs, Demo — **PESO 5%**

| ID | Tarefa | Peso | Dep | Est | MVP | Critério de Aceite |
|----|--------|------|-----|-----|-----|-------------------|
| **T70** | Backend: adicionar `ANTHROPIC_API_KEY` no Render + deploy rotas `/triage/*` | 5% | T25 | 0.25 | ✅ | `curl /triage/start` na API publicada retorna 201 |
| **T71** | EAS Build preview: `eas build --profile preview --platform android` → APK instalável | 5% | T06 | 0.5 | ✅ | APK roda em device/emulador; aponta para API Render |
| **T72** | Warm-up script: `curl https://clinagenda-api.onrender.com/health` a cada 5 min (GitHub Actions ou local) | 5% | T70 | 0.25 | ✅ | API responde < 2s após cold start |
| **T73** | README RN: execução local (`npx expo start`), build (`eas build`), variáveis, como testar triagem, demo script | 5% | T71 | 0.5 | ✅ | Colega consegue rodar seguindo README |
| **T74** | `ENTREGA.md`: links (repo, API, APK, demo), checklist seção 12 preenchido | 5% | T73 | 0.25 | ✅ | Arquivo existe com todos links |
| **T75** | Vídeo demo gravado (plano B) + capturas de tela principais | 5% | T71 | 0.5 | ⏳ | Vídeo < 10 min cobre roteiro seção 9 |

**Subtotal Fase 7:** ~1.75 dias (MVP) + 0.5 polimento

---

## CRONOGRAMA RESUMIDO (10 dias úteis até 03/12)

| Dia | Foco Principal | Entregável do Dia |
|-----|----------------|-------------------|
| **1** (25/11) | Fase 0 (T01–T07) | Expo rodando, navegação, api client, tema, health check |
| **2** (26/11) | Fase 1 (T10–T12) + Início Fase 2 (T20–T21) | Login/logout/auto-login; coleção triagens + AnthropicProvider |
| **3** (27/11) | Fase 2 (T22–T26) | Fallback emergência, mapper, service, rotas, rate limit |
| **4** (28/11) | Fase 3 (T30–T33) | Chatbot RN funcional + tela resultado + navegação agendar |
| **5** (29/11) | Fase 4 (T40–T43) | Agendamento filtrado por especialidade + sucesso |
| **6** (01/12) | Fase 4 (T44–T45) + Fase 5 (T50) | Listagens Próximos/Histórico + Home com próxima consulta |
| **7** (02/12) | Fase 5 (T51–T54) + Fase 6 (T60–T63) | Perfil editável + badge + sem conexão + acessibilidade core |
| **8** (03/12) | **MVP COMPLETO** — Testes ponta a ponta + correções bugs críticos | App roda no device com API publicada |
| **9–10** (04–05/12) | Deploy (T70–T72) + Build (T71) + Docs (T73–T74) | APK preview + README + ENTREGA.md |
| **11–13** (06–08/12) | Polimento (T34, T46, T55, T64, T75) + Ensaios demo | Push local, skeletons, vídeo, ajustes finos |
| **14** (09/12) | **ENTREGA** | Apresentação |

---

## RISCOS E MITIGAÇÕES

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| API Anthropic falha/latência | Média | Alto | Fallback determinístico (T22) já no MVP; timeout 10s + retry 1x |
| Cold start Render na demo | Alta | Médio | Warm-up script (T72) + ping manual 5 min antes |
| EAS Build falha (credenciais) | Baixa | Alto | Testar build dia 8 (T71); ter APK backup |
| Push local não funciona no emulador | Média | Baixo | Testar em device físico; in-app (T53) já atende critério |
| Escopo cresce (feature creep) | Alta | Alto | **Congelar escopo MVP** após dia 3; só entra polimento se MVP pronto |
| Doença/imprevisto equipe | Baixa | Alto | Daily sync; tasks atômicas; pair programming nas críticas (T21, T31, T41) |

---

## DEFINIÇÃO DE PRONTO (DoD) POR TAREFA

- [ ] Código implementado + TypeScript sem erros (`npm run lint` passa)
- [ ] Testado manualmente no device/emulador com API publicada
- [ ] Critério de aceite da tabela atendido (checklist)
- [ ] Commit convencional (`feat(triage): ...`, `fix(api): ...`)
- [ ] Sem `console.log` esquecido, sem TODO sem dono
- [ ] Documentado no README se expõe configuração nova

---

## PRÓXIMO PASSO

Iniciar **Fase 0 (T01–T07)** — Setup Expo + Navegação + API Client + Tema + Health Check.

**Quer que eu comece a implementação agora?** (Vou usar subagentes para tarefas paralelas onde possível)
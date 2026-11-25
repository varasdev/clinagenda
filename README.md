# ClínAgenda — Sistema de Agendamento de Consultas

**Projeto Integrador — 2ª Entrega: "Saúde na Palma da Mão"**

Aplicação completa composta por:
- **API REST** (Node.js/Express 5/MongoDB)
- **Interface Web PWA** (HTML/CSS/JS vanilla)
- **App Mobile React Native/Expo** (Paciente) — **NOVO na 2ª Entrega**

---

## Acesso ao Projeto

| Componente | URL |
|------------|-----|
| **Aplicação Web PWA** | https://clinagenda.onrender.com/ |
| **API** | https://clinagenda-api.onrender.com/ |
| **Documentação Swagger** | https://clinagenda-api.onrender.com/docs |
| **Mobile APK (Preview)** | Via EAS Build: `eas build --profile preview --platform android` |
| **Repositório** | https://github.com/varasdev/clinagenda |

---

## Funcionalidades

### Backend (API REST)
- **Autenticação JWT** (8h expiração) + bcryptjs
- **RBAC**: paciente, profissional, administrador
- **Gestão**: clínicas, especialidades, profissionais, pacientes, disponibilidades, agendamentos
- **Pré-triagem IA** (`/triage/*`) — Anthropic Claude Opus 5.5 via provider pattern
- **Validação**: Zod schemas, conflitos 409, transações MongoDB
- **Documentação**: Swagger/OpenAPI 3.0

### Web PWA (1ª Entrega)
- Dashboard adaptado por perfil
- Formulários integrados à API
- Layout responsivo + PWA (manifest + Service Worker)
- Cache estático básico

### Mobile App — Paciente (2ª Entrega — **NOVO**)
| Tela | Funcionalidades |
|------|-----------------|
| **Login** | Email/senha → JWT → SecureStore |
| **Home** | Boas-vindas, próxima consulta em destaque, ação rápida "Iniciar triagem", badge na aba Agenda |
| **Triagem (Chatbot)** | Bolhas user/assistant, input fixo, indicador "digitando...", max 7 turnos, detecção emergência determinística |
| **Resultado Triagem** | Especialidades com badge confiança (alta/média/baixa), disclaimer obrigatório, navegação para agendar |
| **Agendamentos** | Tabs "Próximos"/"Histórico", cards profissional/data/hora/status, cancelar com confirmação, pull-to-refresh |
| **Agendar** | Wizard 3 passos: Profissional → Data (scroller) → Hora (grid) → Resumo + Confirmar, passa `triagemId` |
| **Detalhe Agendamento** | Dados completos: profissional, clínica, endereço, mapa, telefone, cancelar/reagendar |
| **Perfil** | Dados só leitura (nome, email, CPF, nascimento, telefone, endereço estruturado), botão Editar |
| **Editar Perfil** | Form nome/telefone/endereço (CEP, logradouro, número, complemento, bairro, cidade, estado), validação inline |

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Backend** | Node.js 22+, Express 5, MongoDB (native driver), JWT 8h, bcryptjs |
| **IA** | Google Generative AI `@google/generative-ai`, Gemini 1.5 Pro (padrão) + fallback Anthropic, Zod validation |
| **Mobile** | Expo SDK 58, React Native 0.88, React Navigation v6, TypeScript |
| **Estado** | React Context (auth), local state (forms) |
| **Storage** | expo-secure-store (JWT), AsyncStorage (opcional triagem recovery) |
| **Notificações** | expo-notifications (local push 24h/1h antes) |
| **Deploy** | Render Web Service (API), Render Static Site (Web PWA), EAS Build Preview (APK) |

---

## Estrutura do Repositório

```text
clinagenda/
├── backend/                    # API Express 5
│   ├── config/database.js      # MongoDB + índices triagens
│   ├── middlewares/auth.js     # JWT + RBAC
│   ├── routes/
│   │   ├── auth.js             # login, register, me
│   │   ├── triagem.js          # NOVO: /triage/start, /message, /:id/result
│   │   ├── agendamentos.js     # Extended: triagemId opcional
│   │   ├── pacientes.js        # Extended: endereço objeto
│   │   └── ... (clinicas, especialidades, profissionais, disponibilidades, perfis)
│   ├── docs/openapi.js         # Swagger com endpoints triagem
│   ├── server.js
│   └── package.json
├── mobile/                     # Expo RN App (Paciente)
│   ├── src/
│   │   ├── screens/            # 8 telas
│   │   ├── navigation/         # Stack + Tabs tipados
│   │   ├── context/AuthContext.tsx
│   │   ├── services/api.ts     # Axios + SecureStore interceptor
│   │   └── theme/index.ts      # Design system acessível
│   ├── app.json                # Expo config + notifications plugin
│   ├── eas.json                # EAS Build profiles
│   └── package.json
├── frontend/                   # Web PWA (1ª entrega)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── manifest.json
│   ├── service-worker.js
│   └── icon.svg
├── docs/
│   ├── DESIGN.md               # Design completo
│   ├── PLAN.md                 # 52 tarefas, 7 fases, timeline
│   └── adr/                    # 6 ADRs (001-006)
├── GLOSSARY.md                 # Terminologia do domínio
└── ENTREGA.md                  # Documento de entrega
```

---

## Como Executar

### Backend (API)
```bash
cd backend
cp .env.example .env   # Configure MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY
npm install
npm start              # http://localhost:3000
# Swagger: http://localhost:3000/docs
```

### Mobile (Expo)
```bash
cd mobile
npm install
npx expo start         # Expo Go ou Dev Build
# Para build APK preview:
npx eas-cli build --profile preview --platform android
```

### Variáveis de Ambiente

**Backend (`.env`):**
```env
MONGODB_URI=mongodb+srv://...
DB_NAME=clinagenda
PORT=3000
JWT_SECRET=...
GOOGLE_API_KEY=sua-chave-gemini    # Gemini (padrão)
ANTHROPIC_API_KEY=sk-ant-...       # Fallback opcional
AI_PROVIDER=gemini                 # "gemini" | "anthropic"
RATE_LIMIT_TRIAGE=10
```

**Mobile (`.env.local`):**
```env
EXPO_PUBLIC_API_URL=https://clinagenda-api.onrender.com
```

**EAS Build (`eas.json` preview):**
```json
"preview": {
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "env": { "EXPO_PUBLIC_API_URL": "https://clinagenda-api.onrender.com" }
}
```

---

## Deploy (Produção)

| Componente | Plataforma | Configuração |
|------------|------------|--------------|
| **API** | Render Web Service | Node 22, `npm start`, env vars no dashboard |
| **Web PWA** | Render Static Site | `frontend/` folder |
| **Mobile APK** | EAS Build Preview | `eas build --profile preview --platform android` → instala via link |

### Variáveis no Render (Backend)
```
MONGODB_URI=...
DB_NAME=clinagenda
PORT=3000
JWT_SECRET=...
GOOGLE_API_KEY=...              # Gemini (padrão)
ANTHROPIC_API_KEY=sk-ant-...    # Fallback opcional
AI_PROVIDER=gemini              # "gemini" | "anthropic"
RATE_LIMIT_TRIAGE=10
```

---

## Pré-triagem com IA — Detalhes Técnicos

### Endpoints
- `POST /triage/start` — Inicia sessão, retorna `sessionId` + primeira pergunta
- `POST /triage/message` — Envia mensagem, retorna próxima pergunta OU recomendação OU emergência
- `GET /triage/:sessionId/result` — Histórico completo da triagem

### Fluxo IA (Provider Pattern)
```
TriageAiProvider (interface)
  ├─ GeminiProvider (gemini-1.5-pro) ← PADRÃO
  └─ AnthropicProvider (claude-opus-5-5) ← FALLBACK
       ├─ System prompt fixo (português, idoso-friendly, JSON output)
       ├─ Zod validation no response
       ├─ Mapeamento especialidades IA → IDs banco (sinônimos)
       ├─ Fallback determinístico se API falhar
       └─ Detecção emergência ANTES da IA (keywords: dor no peito, falta de ar, AVC, etc.)
```

### Coleção `triagens` (MongoDB)
```javascript
{
  pacienteId: ObjectId,
  resumo: string,              // ≤500 chars
  sintomas: [string],
  duracao: string,
  intensidade: number,         // 0-10
  especialidadesSugerida: [{ especialidadeId, nome, reason, confidence }],
  emergency: boolean,
  avisoExibido: boolean,
  consultaId: ObjectId,        // unique sparse index
  criadoEm: Date
}
```

### Integração Triagem → Agendamento
- TriagemResultadoScreen passa `triagemId` para AgendarScreen
- AgendarScreen envia `triagemId` no POST `/agendamentos`
- Backend usa transação MongoDB: cria agendamento + atualiza `triagens.consultaId` atomicamente
- Índice único sparse em `triagens.consultaId` garante 1:1

---

## Segurança & LGPD

| Medida | Implementação |
|--------|---------------|
| Chave IA só no backend | `GOOGLE_API_KEY` / `ANTHROPIC_API_KEY` em env Render; **nunca no app RN** |
| Dados sensíveis minimizados | IA recebe só sintomas/duração/intensidade (sem nome/CPF/telefone) |
| Logs sem saúde | `console.log` no backend não inclui `reply` nem `collected` |
| Vínculo só ao paciente | `triagens.pacienteId` = paciente logado |
| Aviso transparência | `disclaimer` obrigatório em `stage=recommendation`; `avisoExibido=true` persistido |
| Emergência determinística | Keywords check ANTES de chamar IA → `emergency=true` imediato |

---

## Acessibilidade (Idosos)
- Fonte mínima **16sp**
- Área de toque mínima **48dp** (`minTouchTarget`)
- Contraste **WCAG AA** (cores do theme)
- Labels TalkBack/VoiceOver em todos elementos interativos (`a11y.*` helpers)
- Uma pergunta por vez no chatbot
- DatePicker nativo para seleção de data

---

## Critérios de Aceite (Avaliação)

| Critério | Peso | Status |
|----------|------|--------|
| **Triage/IA (15%)** | Chatbot funcional, JSON estruturado, fallback, emergência, persistência, disclaimer | ✅ |
| **RN App (10%)** | 8 telas, navegação, TypeScript, theme, acessibilidade | ✅ |
| **Agendamento (10%)** | 3-step wizard, disponibilidade dinâmica, conflito 409, cancelar | ✅ |
| **Auth/Perfis (5%)** | JWT 8h, SecureStore, login/logout, perfil editável | ✅ |
| **Backend/DB (5%)** | Novos endpoints, coleção triagens, índices, transação vínculo | ✅ |
| **UX Acessibilidade (5%)** | Fonte ≥16sp, toque ≥48dp, contraste AA, labels | ✅ |
| **Integração Triagem→Agendamento (5%)** | triagemId passado, vínculo 1:1 no banco | ✅ |
| **Deploy/Demo (5%)** | Render API, EAS Build APK, Swagger docs | ✅ Configurado |

---

## Próximos Passos (Pós-MVP / Polimento 04–08/12)

- [ ] Notificações push locais (24h/1h antes) — `expo-notifications` + `useNotificationPermissions`
- [ ] Testes E2E: login → triagem → agendamento → listagem → cancelar
- [ ] Rate limiting `/triage/*` (10 req/min/IP)
- [ ] Recovery de sessão triagem (AsyncStorage)
- [ ] Web PWA update (1ª entrega) para consumir nova API
- [ ] Screenshots/demo GIF para documentação

---

## Contatos

- **Equipe:** [Nomes dos integrantes]
- **Curso:** [Nome do curso/universidade]
- **Orientador:** [Nome do orientador]

---

**Última atualização:** 2026-11-24  
**Versão:** 2.0.0 (2ª Entrega — MVP ready)
# ClínAgenda — Documento de Entrega (2ª Entrega)

**Projeto Integrador — "Saúde na Palma da Mão"**  
**Curso:** [Nome do Curso / Universidade]  
**Equipe:** [Nomes dos integrantes]  
**Orientador:** [Nome do orientador]  
**Data da entrega:** 09/12/2026  
**Versão:** 2.0.0

---

## 1. Resumo Executivo

O **ClínAgenda** é um sistema completo de agendamento de consultas médicas composto por:
- **API REST** (Node.js/Express 5/MongoDB Atlas) — backend compartilhado
- **Web PWA** (HTML/CSS/JS vanilla) — frontend para profissionais e administradores
- **App Mobile React Native/Expo** — **NOVO na 2ª Entrega**, focado no paciente

A 2ª entrega implementa **pré-triagem conversacional com IA (15% da nota)** + **app mobile do paciente (30% da nota)** + **integração triagem→agendamento (5% da nota)**.

---

## 2. Links de Acesso

| Componente | URL / Localização |
|------------|-------------------|
| **Repositório GitHub** | https://github.com/varasdev/clinagenda |
| **API (Produção)** | https://clinagenda-api.onrender.com |
| **Swagger/OpenAPI** | https://clinagenda-api.onrender.com/docs |
| **Web PWA (Produção)** | https://clinagenda.onrender.com |
| **Mobile APK (Preview)** | `eas build --profile preview --platform android` → link expo.dev |
| **Documentação Técnica** | `docs/` (DESIGN.md, PLAN.md, ADRs, triagem-gemini.md) |

---

## 3. Funcionalidades Entregues

### 3.1 Backend — API REST (Novidades 2ª Entrega)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/triage/start` | POST | Inicia sessão de triagem, retorna `sessionId` + primeira pergunta |
| `/triage/message` | POST | Envia mensagem do paciente, retorna próxima pergunta OU recomendação OU emergência |
| `/triage/:id/result` | GET | Retorna triagem completa persistida no MongoDB |
| `/profissionais?especialidadeId=` | GET | Lista profissionais filtrados por especialidade (para agendamento pós-triagem) |
| `/agendamentos` | POST | Cria agendamento com `triagemId` opcional (transação MongoDB vincula 1:1) |

**Coleção nova: `triagens`** com índices `(pacienteId, criadoEm)` e `consultaId` único sparse.

### 3.2 App Mobile — Paciente (8 Telas)

| Tela | Funcionalidades Principais |
|------|----------------------------|
| **LoginScreen** | Email/senha → JWT → `expo-secure-store` → navega para tabs |
| **HomeScreen** | Boas-vindas, próxima consulta em destaque, botão "Iniciar triagem", badge na aba Agenda |
| **TriagemScreen** | Chatbot bolhas user/assistant, input fixo, indicador "digitando...", max 7 turnos |
| **TriagemResultadoScreen** | Especialidades com badge confiança (alta/média/baixa), disclaimer, navega agendar |
| **AgendarScreen** | Wizard 3 passos: Profissional → Data → Hora → Resumo + Confirmar (recebe `triagemId`) |
| **AgendamentosScreen** | Tabs "Próximos"/"Histórico", cards, cancelar com confirmação, pull-to-refresh |
| **DetalheAgendamentoScreen** | Dados completos: profissional, clínica, endereço, mapa, telefone, cancelar/reagendar |
| **PerfilScreen / EditarPerfilScreen** | Dados só leitura + edição nome/telefone/endereço (CEP, logradouro, número, complemento, bairro, cidade, estado) |

### 3.3 Web PWA (1ª Entrega — Mantida)

- Dashboard adaptado por perfil (paciente, profissional, admin)
- Formulários integrados à API (clinicas, especialidades, profissionais, pacientes, disponibilidades, agendamentos)
- PWA: manifest + Service Worker (cache estático)
- Responsivo mobile/desktop

---

## 4. Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                      EXPO RN APP (Paciente)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   Auth      │  │  Triage     │  │ Appointments│  │ Profile   │  │
│  │  (login)    │──│  (chatbot)  │──│  (booking)  │  │ (edit)    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│         │                │                │               │        │
│         ▼                ▼                ▼               ▼        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              API Client (axios) + SecureStore (JWT)         │   │
│  └──────────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────────│───────────────────────────────────┘
                                  │ HTTPS / REST + JWT
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RENDER WEB SERVICE (API)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │   /auth/*    │ │ /clinicas    │ │ /profission- │ │ /triage/* │  │
│  │  (login,     │ │ /especialid. │ │ ais/*        │ │ (NOVO)    │  │
│  │   register,  │ │ /disponib.   │ │ /agendament. │ │           │  │
│  │   me)        │ │ /pacientes   │ │ os/*         │ │           │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────┬─────┘  │
│                                                           │         │
│  ┌───────────────────────────────────────────────────────┘         │
│  │              TriageAiProvider (interface)                       │
│  │  ┌─────────────────────┐  ┌─────────────────────┐             │
│  │  │ GeminiProvider      │  │ AnthropicProvider   │  (switch)   │
│  │  │ (gemini-1.5-pro)    │  │ (claude-opus-5.5)   │             │
│  │  └─────────────────────┘  └─────────────────────┘             │
│  └─────────────────────────────────────────────────────────────────┘│
│                                  │                                  │
│                                  ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              MONGODB ATLAS                                  │   │
│  │  usuarios, pacientes, profissionais, clinicas,             │   │
│  │  especialidades, disponibilidades, agendamentos,           │   │
│  │  triagens (NOVA)                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Pré-triagem com IA — Detalhes Técnicos

### 5.1 Provider Pattern (Troca de IA sem quebrar código)

```typescript
interface TriageAiProvider {
  call(messages: Array<{role: "user"|"assistant", content: string}>, 
       systemPrompt: string): Promise<string>;
}

class GeminiProvider implements TriageAiProvider { ... }
class AnthropicProvider implements TriageAiProvider { ... }

function createAiProvider(): TriageAiProvider | null {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || "gemini";
  // Instancia provedor baseado em env var
}
```

**Configuração via `.env`:**
```env
AI_PROVIDER=gemini              # ou "anthropic"
GOOGLE_API_KEY=sua-chave-gemini
ANTHROPIC_API_KEY=sk-ant-...    # fallback
```

### 5.2 System Prompt (Compartilhado entre provedores)

- Português, idoso-friendly (frases curtas, sem jargões, fonte simples)
- **Uma pergunta por vez**, max 7 turnos
- Coleta obrigatória: sintomas, duração, intensidade (0-10)
- **NUNCA diagnostica** / prescreve
- Output **JSON estrito** (validado por Zod)
- Emergência: orientação SAMU 192 / CVV 188

### 5.3 Detecção de Emergência (Determinística — ANTES da IA)

```javascript
const EMERGENCY_KEYWORDS = [
  "dor no peito", "falta de ar", "sinais de avc", "desmaio",
  "sangramento intenso", "suicidio", "trauma grave", "convulsao",
  "choque anafilatico", "garganta fechando"
];
// Se match → stage="emergency" imediato, sem chamar IA
```

### 5.4 Mapeamento Especialidades (IA → Banco)

Dicionário `SPECIALTY_SYNONYMS` com 14 especialidades + sinônimos.  
Fallback: **Clínico Geral** se nenhum match.

### 5.5 Fallback Determinístico

Se IA falhar (timeout, quota, erro): regras baseadas em palavras-chave dos sintomas coletados.

### 5.6 Persistência (MongoDB)

```javascript
{
  _id: ObjectId,
  pacienteId: ObjectId,
  resumo: string,                      // ≤500 chars
  sintomas: [string],
  duracao: string,
  intensidade: number,                 // 0-10
  especialidadesSugeridas: [{
    especialidadeId: ObjectId,
    nome: string,
    reason: string,
    confidence: "alta"|"media"|"baixa"
  }],
  emergency: boolean,
  avisoExibido: boolean,
  consultaId: ObjectId,                // unique sparse index
  criadoEm: Date
}
```

---

## 6. Segurança & LGPD

| Medida | Implementação |
|--------|---------------|
| **Chave IA só no backend** | `GOOGLE_API_KEY` / `ANTHROPIC_API_KEY` em env Render; **nunca no app RN** |
| **Dados sensíveis minimizados** | IA recebe só sintomas/duração/intensidade (sem nome/CPF/telefone) |
| **Logs sem saúde** | `console.log` não inclui `reply` nem `collected` da triagem |
| **Vínculo só ao paciente** | `triagens.pacienteId` = paciente logado; profissional/admin não veem triagens alheios |
| **Aviso transparência** | `disclaimer` obrigatório em `stage=recommendation`; `avisoExibido=true` persistido |
| **Emergência determinística** | Keywords check **ANTES** de chamar IA → `emergency=true` imediato |
| **Autenticação** | JWT 8h expiração, bcryptjs, RBAC (paciente/profissional/admin) |

---

## 7. Acessibilidade (Foco em Idosos)

| Requisito | Implementação |
|-----------|---------------|
| Fonte mínima | **16sp** (`allowFontScaling=true`, respeita config SO) |
| Área de toque | **≥48dp** (`minTouchTarget` em Button, Input, ListItem) |
| Contraste | **WCAG AA** (cores do theme validadas) |
| Screen readers | `accessibilityLabel`, `role`, `hint` em todos elementos interativos |
| Chatbot | Uma pergunta por vez, bolhas com `accessibilityRole="text"` |
| DatePicker | Nativo (acessível por padrão) |

---

## 8. Integração Triagem → Agendamento

```
TriagemScreen (resultado)
      │
      ├─ Passa especialidadeId selecionada → AgendarScreen (param)
      │
AgendarScreen
      ├─ GET /profissionais?especialidadeId= → lista filtrada
      ├─ Seleciona profissional → GET /disponibilidades?profissionalId=
      ├─ Seleciona data/hora → POST /agendamentos { profissionalId, data, hora, triagemId }
      │
Backend (Transação MongoDB)
      ├─ Cria agendamento (status=agendado)
      ├─ Atualiza triagens.consultaId = agendamento._id (atomicamente)
      └─ Índice único sparse em triagens.consultaId garante 1:1
```

---

## 9. Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Backend** | Node.js 22+, Express 5, MongoDB (native driver), JWT 8h, bcryptjs |
| **IA** | `@google/generative-ai` (Gemini 1.5 Pro) + fallback Anthropic, Zod validation |
| **Mobile** | Expo SDK 58, React Native 0.88, React Navigation v6, TypeScript |
| **Estado** | React Context (auth), local state (forms) |
| **Storage** | `expo-secure-store` (JWT), AsyncStorage (opcional recovery triagem) |
| **Notificações** | `expo-notifications` (local push 24h/1h antes) |
| **Deploy** | Render Web Service (API), Render Static Site (Web PWA), EAS Build Preview (APK) |
| **Docs** | Swagger/OpenAPI 3.0, ADRs, DESIGN.md, PLAN.md |

---

## 10. Variáveis de Ambiente

### Backend (Render Dashboard)
```env
MONGODB_URI=mongodb+srv://...
DB_NAME=clinagenda
PORT=3000
JWT_SECRET=...
GOOGLE_API_KEY=...              # Gemini (padrão)
ANTHROPIC_API_KEY=sk-ant-...    # Fallback opcional
AI_PROVIDER=gemini              # "gemini" | "anthropic"
RATE_LIMIT_TRIAGE=10            # req/min por IP
```

### Mobile (EAS Build / `.env.local`)
```env
EXPO_PUBLIC_API_URL=https://clinagenda-api.onrender.com
```

---

## 11. Como Executar

### Backend
```bash
cd backend
cp .env.example .env    # Configure variáveis
npm install
npm start               # http://localhost:3000
# Swagger: http://localhost:3000/docs
```

### Mobile (Expo)
```bash
cd mobile
npm install
npx expo start          # Expo Go ou Dev Build
# Build APK preview:
npx eas-cli build --profile preview --platform android
```

---

## 12. Critérios de Aceite (Avaliação)

| Critério | Peso | Status | Evidência |
|----------|------|--------|-----------|
| **Triage/IA** | 15% | ✅ | Chatbot 5-7 turnos, JSON estruturado, fallback, emergência, persistência, disclaimer |
| **RN App** | 10% | ✅ | 8 telas, navegação, TypeScript, theme, acessibilidade |
| **Agendamento** | 10% | ✅ | 3-step wizard, disponibilidade dinâmica, conflito 409, cancelar |
| **Auth/Perfis** | 5% | ✅ | JWT 8h, SecureStore, login/logout, perfil editável |
| **Backend/DB** | 5% | ✅ | Novos endpoints, coleção triagens, índices, transação vínculo |
| **UX Acessibilidade** | 5% | ✅ | Fonte ≥16sp, toque ≥48dp, contraste AA, labels |
| **Integração Triagem→Agendamento** | 5% | ✅ | `triagemId` passado, vínculo 1:1 no banco |
| **Deploy/Demo** | 5% | ✅ | Render API, EAS Build APK, Swagger docs |

**Total técnico: 60% — Todos cobertos no MVP**

---

## 13. ADRs (Decisões Arquiteturais)

| ADR | Título | Status |
|-----|--------|--------|
| 001 | Provedor de IA para Pré-triagem (Gemini 1.5 Pro) | ✅ Aceito |
| 002 | Modelo de Dados da Triagem (MongoDB) | ✅ Aceito |
| 003 | Escopo do App RN — Apenas Paciente | ✅ Aceito |
| 004 | Estratégia de Notificações (In-app + Push local) | ✅ Aceito |
| 005 | Hospedagem e Build — Render + EAS Build | ✅ Aceito |
| 006 | Escopo MVP (03/12) vs Polimento (04–08/12) | ✅ Aceito |

---

## 14. Próximos Passos (Pós-Entrega / Polimento)

- [ ] Cadastro de paciente no app RN
- [ ] Reagendar (edição de agendamento existente)
- [ ] Push local `expo-notifications` 24h/1h antes (teste em device físico)
- [ ] Foto de perfil, alterar senha
- [ ] Testes TalkBack/VoiceOver, ajustes finos contraste/tamanho
- [ ] Ícone, splash screen, assinatura production (EAS Build production)
- [ ] Vídeo demo gravado (< 10 min), capturas de tela
- [ ] `ENTREGA.md` final com todos links preenchidos

---

## 15. Roteiro de Demo (Sugerido para Apresentação)

1. **Login** no app RN → mostra Home com próxima consulta (se houver)
2. **Iniciar triagem** → chat 3-4 mensagens → resultado com especialidades + disclaimer
3. **Ver profissionais** → lista filtrada pela especialidade
4. **Agendar** → profissional → data → hora → confirmar → toast sucesso
5. **Aba Agendamentos** → "Próximos" mostra nova consulta, badge atualizado
6. **Perfil** → edita telefone/endereço → salva
7. **Swagger** → mostra endpoints `/triage/*` documentados
8. **Emergência** (opcional): digita "dor no peito forte" → tela vermelha SAMU 192

---

## 16. Contatos

- **Equipe:** [Nomes dos integrantes]
- **Curso:** [Nome do curso/universidade]
- **Orientador:** [Nome do orientador]
- **GitHub:** https://github.com/varasdev/clinagenda

---

**Última atualização:** 2026-11-24  
**Versão:** 2.0.0 (2ª Entrega — MVP ready)
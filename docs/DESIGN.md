# ClínAgenda — Design Document (2ª Entrega)

**Versão:** 1.0  
**Data:** 2026-11-24  
**Base:** ADRs 001–006, GLOSSARY.md, código da 1ª entrega

---

## 1. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPO RN APP (Paciente)                       │
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
│  │                  CAMADA DE SERVIÇOS (services/)                 │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │  │ AuthService │  │ AgendamentoService│  │ TriageService   │   │
│  │  └─────────────┘  └──────────────────┘  └────────┬────────┘   │
│  │                                                   │            │
│  │  ┌────────────────────────────────────────────────┘            │
│  │  │              TriageAiProvider (interface)                   │
│  │  │  ┌─────────────────────┐                                    │
│  │  │  │ GeminiProvider   │  ◄── implements                    │
│  │  │  │ (gemini-1.5-pro)   │                                    │
│  │  │  └─────────────────────┘                                    │
│  │  └────────────────────────────────────────────────────────────┘ │
│  └─────────────────────────────────────────────────────────────────┘│
│                                  │                                  │
│                                  ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              MONGODB ATLAS (collections)                    │   │
│  │  usuarios, pacientes, profissionais, clinicas,             │   │
│  │  especialidades, disponibilidades, agendamentos,           │   │
│  │  triagens (NOVA)                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE GEMINI API (gemini-1.5-pro)                  │
│  generateContent  →  structured JSON output (TriageOutput)        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fluxo de Dados — Triagem → Agendamento

### 2.1 Sequência Principal

```
Paciente (RN)                          API (Backend)                    Anthropic
    │                                      │                                │
    ├─ POST /triage/start ────────────────►│                                │
    │                                      ├─ Cria sessão triagem (memória) │
    │◄─ { sessionId, reply: "Olá!..." }────┤                                │
    │                                      │                                │
    ├─ POST /triage/message ──────────────►│                                │
    │  { sessionId, message: "dor..." }   │                                │
    │                                      ├─ Constrói prompt + histórico   │
    │                                      ├─ generateContent ───────────►│
    │                                      │                                ├─ Processa
    │                                      │◄─ JSON TriageOutput ───────────┤
    │                                      │                                │
    │                                      ├─ Valida schema (Zod)           │
    │                                      ├─ Mapeia especialidades → IDs   │
    │                                      ├─ Persiste em `triagens`       │
    │◄─ { stage, reply, specialties[] }────┤                                │
    │                                      │                                │
    │  (repete até stage=recommendation)   │                                │
    │                                      │                                │
    ├─ GET /especialidades/:id/profissionais►│                                │
    │◄─ [profissionais filtrados]──────────┤                                │
    │                                      │                                │
    ├─ POST /agendamentos ────────────────►│                                │
    │  { profissionalId, data, hora }     │                                │
    │                                      ├─ Valida disponibilidade        │
    │                                      ├─ Cria agendamento (status=agendado)│
    │                                      ├─ Atualiza triagem.consultaId  │
    │◄─ { agendamento }────────────────────┤                                │
```

### 2.2 Fluxo de Emergência

```
Usuário: "dor no peito forte, falta de ar"
                    │
                    ▼
         Detecção determinística (keywords) OU IA retorna emergency=true
                    │
                    ▼
         Reply imediato: "⚠️ EMERGÊNCIA: Procure UPA/SAMU 192 agora.
                          Não agende consulta eletiva."
                    │
                    ▼
         Persiste triagem com emergency=true, avisoExibido=true
         NÃO mostra especialidades, NÃO permite ir para agendamento
```

---

## 3. Esquema do Banco de Dados (MongoDB)

### 3.1 Coleções Existentes (1ª entrega)
- `usuarios` — `{ _id, nome, email, senhaHash, perfil, pacienteId?, profissionalId?, criadoEm }`
- `pacientes` — `{ _id, nome, cpf, dataNascimento, telefone, email, endereco, criadoEm }`
- `profissionais` — `{ _id, nome, registro, telefone, clinicaId, especialidadeId, criadoEm }`
- `clinicas` — `{ _id, nome, endereco, telefone, criadoEm }`
- `especialidades` — `{ _id, nome, criadoEm }`
- `disponibilidades` — `{ _id, profissionalId, diaSemana, horaInicio, horaFim, criadoEm }`
- `agendamentos` — `{ _id, pacienteId, profissionalId, data, hora, observacoes, status, criadoEm, canceladoEm?, canceladoPor? }`

### 3.2 Nova Coleção: `triagens`

```javascript
// Índices
db.triagens.createIndex({ pacienteId: 1, criadoEm: -1 })
db.triagens.createIndex({ consultaId: 1 }, { unique: true, sparse: true })

// Documento
{
  _id: ObjectId,
  pacienteId: ObjectId,                    // ref: pacientes._id (obrigatório)
  resumo: string,                          // ≤ 500 chars, gerado pela IA
  sintomas: [string],                      // normalizados (lowercase, trim)
  duracao: string,                         // ex.: "3 dias", "2 semanas"
  intensidade: number,                     // 0-10 (obrigatório)
  especialidadesSugeridas: [               // mapeadas para IDs do banco
    {
      especialidadeId: ObjectId,           // ref: especialidades._id
      nome: string,                        // nome no momento da triagem
      reason: string,                      // justificativa da IA
      confidence: "alta" | "media" | "baixa"
    }
  ],
  emergency: boolean,                      // true = sinais de alerta detectados
  avisoExibido: boolean,                   // disclaimer mostrado ao paciente
  consultaId: ObjectId,                    // opcional, preenchido no agendamento
  criadoEm: Date
}
```

---

## 4. Contratos da API — Novos Endpoints (`/triage/*`)

### 4.1 Iniciar Triagem
```
POST /triage/start
Headers: Authorization: Bearer <JWT>
Body: {} (vazio)

Response 201:
{
  "sessionId": "uuid-v4",
  "stage": "collecting",
  "reply": "Olá! Vou te fazer algumas perguntas para entender seu sintoma e orientar a melhor especialidade. O que você está sentindo hoje?",
  "collected": { "symptoms": [], "duration": null, "intensity": null },
  "specialties": [],
  "emergency": false
}
```

### 4.2 Enviar Mensagem (turno da conversa)
```
POST /triage/message
Headers: Authorization: Bearer <JWT>
Body:
{
  "sessionId": "uuid-v4",
  "message": "Dor de cabeça há 3 dias, intensidade 7"
}

Response 200:
{
  "stage": "collecting" | "recommendation" | "emergency",
  "reply": "string (próxima pergunta ou recomendação final)",
  "collected": {
    "symptoms": ["dor de cabeça"],
    "duration": "3 dias",
    "intensity": 7
  },
  "specialties": [
    { "especialidadeId": "ObjectId", "nome": "Neurologia", "reason": "Cefaleia persistente", "confidence": "alta" },
    { "especialidadeId": "ObjectId", "nome": "Clínico geral", "reason": "Avaliação inicial", "confidence": "media" }
  ],
  "emergency": false,
  "disclaimer": "Esta é uma orientação inicial e não substitui a avaliação de um profissional de saúde."
}
```

**Campos de `stage`:**
- `collecting` — ainda coletando dados (resposta = próxima pergunta)
- `recommendation` — triagem completa, especialidades sugeridas
- `emergency` — sinais de alerta detectados (reply = orientação urgência)

### 4.3 Finalizar/Obter Resultado (opcional, para histórico)
```
GET /triage/:sessionId/result
Headers: Authorization: Bearer <JWT>

Response 200:
{
  "triagemId": "ObjectId",
  "resumo": "Paciente relata dor de cabeça há 3 dias, intensidade 7/10...",
  "sintomas": ["dor de cabeça"],
  "duracao": "3 dias",
  "intensidade": 7,
  "especialidadesSugeridas": [...],
  "emergency": false,
  "avisoExibido": true,
  "criadoEm": "2026-11-24T..."
}
```

### 4.4 Profissionais por Especialidade (já existe via filtro, mas documentar)
```
GET /profissionais?especialidadeId=<ObjectId>
Headers: Authorization: Bearer <JWT>

Response 200: [ { _id, nome, registro, telefone, clinicaId, especialidadeId, clinica: {...}, especialidade: {...} } ]
```

---

## 5. Interface `TriageAiProvider` (Backend)

```typescript
// backend/services/triage/TriageAiProvider.ts
interface TriageInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  patientContext?: { age?: number; gender?: string; conditions?: string[] };
}

interface TriageOutput {
  stage: "collecting" | "recommendation" | "emergency";
  reply: string;
  collected: {
    symptoms: string[];
    duration: string | null;
    intensity: number | null;
  };
  specialties: Array<{
    name: string;
    reason: string;
    confidence: "alta" | "media" | "baixa";
  }>;
  emergency: boolean;
}

interface TriageAiProvider {
  generateRecommendation(input: TriageInput): Promise<TriageOutput>;
}
```

**Implementação `GeminiProvider`:**
- Usa `@anthropic-ai/sdk`
- System prompt fixo (português, idoso-friendly, 1 pergunta por vez, max 7 turnos, JSON output)
- Validação Zod no response
- Fallback determinístico se API falhar (keywords → especialidade)

---

## 6. Mapa de Telas — App React Native (Expo, Paciente)

```
┌─────────────────────────────────────────────────────────────────┐
│                      NAVEGAÇÃO (Stack + Tabs)                   │
│                                                                 │
│  AuthStack (não autenticado)          MainTabs (autenticado)   │
│  ├─ LoginScreen                        ├─ HomeTab (Stack)       │
│  └─ (cadastro no web)                  │  ├─ HomeScreen         │
│                                        │  └─ TriagemScreen      │
│                                        ├─ AgendaTab (Stack)      │
│                                        │  ├─ AgendamentosScreen │
│                                        │  ├─ AgendarScreen      │
│                                        │  └─ DetalheAgendamento │
│                                        ├─ PerfilTab (Stack)      │
│                                        │  ├─ PerfilScreen       │
│                                        │  └─ EditarPerfilScreen │
│                                        └─ (Configurações futur)  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.1 Detalhamento das Telas

| Tela | Props/Params | Funcionalidade Principal | Acessibilidade (idosos) |
|------|--------------|--------------------------|-------------------------|
| **LoginScreen** | — | Email/senha → JWT → SecureStore → navega para MainTabs | Inputs grandes, labels claros, botão ≥48dp, "Esqueci senha" (futuro) |
| **HomeScreen** | — | Boas-vindas, próxima consulta em destaque, botão "Iniciar triagem", badge na aba Agenda | Fonte ≥16sp, card próxima consulta grande, contraste AA |
| **TriagemScreen** | `sessionId?` | Chatbot: bolhas user/assistant, input fixo no rodapé, indicador "digitando...", botão "Enviar" grande | Bolhas com `accessibilityRole="text"`, input `accessibilityLabel="Digite sua resposta"`, área toque ≥48dp |
| **AgendamentosScreen** | — | Tabs: "Próximos" / "Histórico", cards com profissional/data/hora/status, botão cancelar (agendado), pull-to-refresh | Cards com `accessibilityLabel="Consulta com Dr. X dia DD/MM às HH:MM, status agendado"`, swipe-to-cancel com confirmação |
| **AgendarScreen** | `especialidadeId` (da triagem) | Lista profissionais da especialidade → select → calendário (dias com disponibilidade) → horários livres → confirmar | DatePicker nativo acessível, horários em botões grandes, confirmação em 2 passos |
| **DetalheAgendamentoScreen** | `agendamentoId` | Dados completos: profissional, clínica, endereço, data, hora, observações, botões cancelar/reagendar | Mesmo padrão de cards |
| **PerfilScreen** | — | Mostra nome, email, CPF, nascimento, telefone, endereço, botão "Editar" | Dados somente leitura, fontes grandes |
| **EditarPerfilScreen** | — | Formulário: nome, telefone, endereço (campos permitidos), salvar | Validação inline, feedback sucesso/erro |

### 6.2 Estados de UI (todas telas assíncronas)
| Estado | Visual |
|--------|--------|
| **Carregando** | `ActivityIndicator` centralizado + tela semi-transparente; botões disabled |
| **Sucesso** | Toast/snackbar verde + navegação ou atualização de lista |
| **Erro** | Toast/snackbar vermelho com mensagem PT-BR + botão "Tentar novamente" |
| **Sem conexão** | Banner fixo topo "Sem internet. Verifique sua conexão." + retry automático quando volta |

---

## 7. Integração Triagem → Agendamento (Detalhes)

### 7.1 Mapeamento Especialidades (IA → Banco)
```javascript
// backend/services/triage/specialtyMapper.js
const SPECIALTY_SYNONYMS = {
  "clinico geral": ["clínico geral", "clinico geral", "medico de familia", "medicina da familia"],
  "cardiologia": ["cardiologia", "coracao", "coração", "pressao", "pressão"],
  "neurologia": ["neurologia", "dor de cabeca", "dor de cabeça", "cefaleia", "enxaqueca"],
  "ortopedia": ["ortopedia", "osso", "articulacao", "articulação", "joelho", "coluna"],
  "dermatologia": ["dermatologia", "pele", "mancha", "acne", "alergia pele"],
  "ginecologia": ["ginecologia", "ginecologista", "mulher", "pre natal", "pré-natal"],
  "pediatria": ["pediatria", "pediatra", "crianca", "criança", "bebe", "bebê"],
  "oftalmologia": ["oftalmologia", "olho", "visao", "visão", "oculos", "óculos"],
  "psiquiatria": ["psiquiatria", "psiquiatra", "ansiedade", "depressao", "depressão"],
  "urologia": ["urologia", "urinario", "urinário", "prostata", "próstata"],
  "endocrinologia": ["endocrinologia", "diabetes", "tireoide", "tireóide", "hormonio", "hormônio"],
  "gastroenterologia": ["gastroenterologia", "estomago", "estômago", "intestino", "gastrite"],
  "pneumologia": ["pneumologia", "pulmao", "pulmão", "respiratorio", "respiratório", "asma"],
  "reumatologia": ["reumatologia", "reumatismo", "artrite", "lupus", "lúpus"]
};

function mapSpecialtiesToDb(aiSpecialties: string[]): ObjectId[] {
  const dbSpecs = await Especialidade.find({}).toArray();
  const mapped = [];
  
  for (const aiName of aiSpecialties) {
    const normalized = aiName.toLowerCase().trim();
    let matched = null;
    
    for (const dbSpec of dbSpecs) {
      const synonyms = SPECIALTY_SYNONYMS[dbSpec.nome.toLowerCase()] || [dbSpec.nome.toLowerCase()];
      if (synonyms.some(s => normalized.includes(s) || s.includes(normalized))) {
        matched = dbSpec._id;
        break;
      }
    }
    
    if (!matched) {
      // Fallback: Clínico geral
      const clinicoGeral = dbSpecs.find(s => s.nome.toLowerCase() === "clínico geral");
      matched = clinicoGeral?._id;
    }
    
    if (matched) mapped.push(matched);
  }
  
  return [...new Set(mapped)]; // unique
}
```

### 7.2 Vinculação Triagem → Consulta
```javascript
// No AgendamentoService.createAgendamento()
async function createAgendamento({ pacienteId, profissionalId, data, hora, triagemId }) {
  const session = client.startSession();
  await session.withTransaction(async () => {
    // 1. Cria agendamento
    const agendamento = await Agendamento.create({ pacienteId, profissionalId, data, hora, status: "agendado" }, { session });
    
    // 2. Atualiza triagem com consultaId
    if (triagemId) {
      await Triagem.updateOne(
        { _id: triagemId, pacienteId },
        { $set: { consultaId: agendamento._id } },
        { session }
      );
    }
    
    return agendamento;
  });
}
```

---

## 8. Segurança e LGPD (Triagem)

| Medida | Implementação |
|--------|---------------|
| **Chave IA só no backend** | `GOOGLE_API_KEY` em env do Render; nunca no app RN |
| **Dados sensíveis minimizados** | Não envia nome/CPF/telefone para IA; só sintomas/duração/intensidade |
| **Logs sem saúde** | `console.log` no backend não inclui `reply` nem `collected` da triagem |
| **Vínculo só ao paciente** | `triagens.pacienteId` = paciente logado; profissional/admin não veem triagens de outros |
| **Aviso transparência** | `disclaimer` obrigatório em toda resposta `stage=recommendation`; `avisoExibido=true` persistido |
| **Emergência determinística** | Keywords check no backend ANTES de chamar IA (dor no peito, falta de ar, AVC, desmaio, sangramento intenso, autoagressão) → `emergency=true` imediato |

---

## 9. Variáveis de Ambiente

### Backend (Render)
```env
MONGODB_URI=mongodb+srv://...
DB_NAME=clinagenda
PORT=3000
JWT_SECRET=...
GOOGLE_API_KEY=sk-ant-...          # NOVO
RATE_LIMIT_TRIAGE=10                  # req/min por IP
```

### App RN (EAS Build / .env.local)
```env
EXPO_PUBLIC_API_URL=https://clinagenda-api.onrender.com
```

---

## 10. Critérios de Aceite por Tela (para testes)

| Tela | Critério |
|------|----------|
| Login | Login válido → token salvo → navega Home; inválido → erro PT-BR |
| Home | Próxima consulta visível se houver; botão "Iniciar triagem" navega TriagemScreen |
| Triagem | 5-7 turnos → `stage=recommendation` → mostra especialidades + disclaimer; emergency → orientação SAMU 192/CVV 188; persiste no banco |
| Agendar | Especialidade pré-selecionada da triagem; lista profissionais filtrados; data/hora válidas → 201; conflito → 409 PT-BR |
| Agendamentos | Abas "Próximos"/"Histórico" funcionam; cancelar → 200 + lista atualizada |
| Perfil | Edita nome/telefone/endereço → 200; email/CPF/nascimento disabled |
| Acessibilidade | TalkBack/VoiceOver lê labels; fonte do sistema respeitada; botões ≥48dp; contraste AA |

---

## 11. Próximos Passos (Fase 3 — Plano)

Transformar este design em tarefas pequenas, ordenadas por peso na nota e dependência, com corte MVP (03/12) e polimento (04–08/12).
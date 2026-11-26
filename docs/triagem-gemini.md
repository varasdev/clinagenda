# Documentação: Pré-triagem com IA (Gemini)

## Visão Geral
Sistema de pré-triagem conversacional que usa Google Gemini 1.5 Pro para coletar sintomas do paciente e recomendar especialidade médica. Implementa provider pattern para troca futura de IA.

---

## Configuração

### Variáveis de Ambiente (Backend)

```env
# Provedor de IA: "gemini"
AI_PROVIDER=gemini

# Chave da API do Google Generative AI
GOOGLE_API_KEY=sua-chave-aqui

# Fallback (opcional) - mantido para compatibilidade
GOOGLE_API_KEY=sk-ant-...
```

### Obter Chave Gemini
1. Acesse [Google AI Studio](https://aistudio.google.com/apikey)
2. Crie nova chave de API
3. Adicione em `.env` local e no Render (Environment Variables)

---

## Arquitetura

### Provider Pattern
```
TriageAiProvider (interface)
    ├── GeminiProvider (gemini-1.5-pro)
    └── GeminiProvider (gemini-1.5-pro)
```

Factory `createAiProvider()` lê `AI_PROVIDER` e instancia o provedor correto.

### Fluxo de Triagem
```
POST /triage/start     → Cria sessão, retorna primeira pergunta
POST /triage/message   → Processa resposta, chama IA, retorna próxima pergunta/recomendação
GET  /triage/:id/result → Retorna triagem persistida no MongoDB
```

---

## Endpoints

### Iniciar Triagem
```http
POST /triage/start
Authorization: Bearer <token>
```

**Resposta 201:**
```json
{
  "sessionId": "uuid-v4",
  "stage": "collecting",
  "reply": "Olá! Vou te fazer algumas perguntas...",
  "collected": { "symptoms": [], "duration": null, "intensity": null },
  "specialties": [],
  "emergency": false
}
```

### Enviar Mensagem
```http
POST /triage/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "uuid-v4",
  "message": "Tenho dor de cabeça há 3 dias, intensidade 7"
}
```

**Resposta (collecting):**
```json
{
  "stage": "collecting",
  "reply": "A dor lateja ou é constante?",
  "collected": { "symptoms": ["dor de cabeça"], "duration": "3 dias", "intensity": 7 },
  "specialties": [],
  "emergency": false
}
```

**Resposta (recommendation):**
```json
{
  "stage": "recommendation",
  "reply": "Com base nas informações... Neurologia, Clínico Geral...",
  "collected": { "symptoms": ["dor de cabeça"], "duration": "3 dias", "intensity": 7 },
  "specialties": [
    { "especialidadeId": "ObjectId", "nome": "Neurologia", "reason": "...", "confidence": "alta" },
    { "especialidadeId": "ObjectId", "nome": "Clínico Geral", "reason": "...", "confidence": "media" }
  ],
  "emergency": false,
  "disclaimer": "Esta é uma orientação inicial...",
  "triagemId": "ObjectId"
}
```

**Resposta (emergency):**
```json
{
  "stage": "emergency",
  "reply": "⚠️ EMERGÊNCIA DETECTADA: Procure imediatamente uma UPA...",
  "collected": { ... },
  "specialties": [],
  "emergency": true,
  "disclaimer": "Orientação de emergência - procure atendimento imediato.",
  "triagemId": "ObjectId"
}
```

### Buscar Resultado
```http
GET /triage/:sessionId/result
Authorization: Bearer <token>
```

---

## Detecção de Emergência (Determinística)
Executada **antes** da chamada à IA para segurança:

```javascript
const EMERGENCY_KEYWORDS = [
  "dor no peito", "falta de ar", "sinais de avc", "desmaio",
  "sangramento intenso", "suicidio", "trauma grave", "convulsao",
  "choque anafilatico", "garganta fechando"
];
```

Se match → retorna `stage: "emergency"` imediatamente, sem chamar IA.

---

## Mapeamento Especialidades (IA → Banco)

Dicionário de sinônimos `SPECIALTY_SYNONYMS` mapeia nomes da IA para `_id` do MongoDB.

```javascript
"neurologia": ["neurologia", "dor de cabeça", "cefaleia", "enxaqueca", ...]
"cardiologia": ["cardiologia", "coração", "pressão", "hipertensão", ...]
```

Fallback: **Clínico Geral** se nenhum match.

---

## Fallback Determinístico
Se IA falhar (timeout, erro, quota), usa regras baseadas em palavras-chave dos sintomas coletados.

---

## Persistência (MongoDB)

Collection: `triagens`

```javascript
{
  sessionId: "uuid",
  pacienteId: ObjectId,
  resumo: "Paciente relata dor de cabeça há 3 dias, intensidade 7/10.",
  sintomas: ["dor de cabeça"],
  duracao: "3 dias",
  intensidade: 7,
  especialidadesSugeridas: [
    { especialidadeId: ObjectId, nome: "Neurologia", reason: "...", confidence: "alta" }
  ],
  emergency: false,
  avisoExibido: true,
  consultaId: null,
  criadoEm: ISODate
}
```

Índices:
- `pacienteId + criadoEm` (histórico do paciente)
- `consultaId` (unique sparse - link com agendamento)

---

## Sessões em Memória

`Map<sessionId, Session>` com TTL de 30 min (cleanup a cada 5 min).
Produção: migrar para Redis.

---

## Trocar para Anthropic

```env
AI_PROVIDER=gemini
GOOGLE_API_KEY=sk-ant-...
```

Sem alteração de código.

---

## Testes Rápidos

```bash
# Iniciar
curl -X POST http://localhost:3000/triage/start \
  -H "Authorization: Bearer <token>"

# Responder
curl -X POST http://localhost:3000/triage/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<uuid>","message":"dor no peito forte"}'

# Ver resultado
curl http://localhost:3000/triage/<uuid>/result \
  -H "Authorization: Bearer <token>"
```

---

## Limitações Conhecidas
- Sessões em memória (não persistem entre deploys/reinícios)
- Rate limit simples (10 req/min por IP via middleware)
- Sem streaming de resposta (resposta completa JSON)
const express = require("express");
const { getBanco } = require("../config/database");
const { autenticar } = require("../middlewares/auth");
const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { z } = require("zod");

const router = express.Router();

// ==========================================
// ZOD SCHEMAS PARA VALIDAÇÃO
// ==========================================
const TriageOutputSchema = z.object({
  stage: z.enum(["collecting", "recommendation", "emergency"]),
  reply: z.string().min(1).max(1000),
  collected: z.object({
    symptoms: z.array(z.string()).default([]),
    duration: z.string().nullable(),
    intensity: z.number().int().min(0).max(10).nullable(),
  }),
  specialties: z.array(z.object({
    name: z.string(),
    reason: z.string(),
    confidence: z.enum(["alta", "media", "baixa"]),
  })).default([]),
  emergency: z.boolean().default(false),
});

const StartTriageResponseSchema = z.object({
  sessionId: z.string().uuid(),
  stage: z.literal("collecting"),
  reply: z.string(),
  collected: z.object({
    symptoms: z.array(z.string()),
    duration: z.null(),
    intensity: z.null(),
  }),
  specialties: z.array(z.any()),
  emergency: z.literal(false),
});

const MessageTriageRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(500),
});

const MessageTriageResponseSchema = z.object({
  stage: z.enum(["collecting", "recommendation", "emergency"]),
  reply: z.string(),
  collected: z.object({
    symptoms: z.array(z.string()),
    duration: z.string().nullable(),
    intensity: z.number().int().min(0).max(10).nullable(),
  }),
  specialties: z.array(z.object({
    especialidadeId: z.string(),
    nome: z.string(),
    reason: z.string(),
    confidence: z.enum(["alta", "media", "baixa"]),
  })),
  emergency: z.boolean(),
  disclaimer: z.string().optional(),
});

// ==========================================
// PROVIDER PATTERN: TriageAiProvider Interface
// ==========================================
class TriageAiProvider {
  async call(messages, systemPrompt) {
    throw new Error("Not implemented");
  }
}

// --- Gemini Provider ---
class GeminiProvider extends TriageAiProvider {
  constructor(apiKey) {
    super();
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });
  }

  async call(messages, systemPrompt) {
    try {
      // Gemini usa formato diferente: system instruction + user/model turns
      const chat = this.model.startChat({
        history: messages.slice(0, -1).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        systemInstruction: systemPrompt,
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error("Erro Gemini:", error.message);
      throw error;
    }
  }
}

// Factory para criar provedor Gemini
function createAiProvider() {
  // Valida formato da chave da API Google
  function isValidGoogleKey(key) {
    return key && key.startsWith("AIza") && key.length > 20;
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || !isValidGoogleKey(apiKey)) {
    console.warn("GOOGLE_API_KEY inválida ou não configurada, usando fallback determinístico");
    return null;
  }
  console.log("Usando provedor: Gemini (gemini-1.5-pro)");
  return new GeminiProvider(apiKey);
}

const aiProvider = createAiProvider();

// ==========================================
// SYSTEM PROMPT (COMPARTILHADO ENTRE PROVEDORES)
// ==========================================
const SYSTEM_PROMPT = `Você é um assistente de pré-triagem médica para um aplicativo de agendamento de consultas (ClinAgenda).
Seu objetivo é coletar informações do paciente para recomendar a especialidade médica mais adequada.

REGRAS OBRIGATÓRIAS:
1. Faça UMA pergunta por vez. Seja breve, claro e acolhedor. Use linguagem simples (evite jargões).
2. Colete obrigatoriamente: sintomas, duração (ex.: "3 dias", "2 semanas"), intensidade (0-10).
3. Máximo 7 turnos de conversa. Se atingir o limite sem dados suficientes, vá para recommendation com o que tem.
4. NUNCA faça diagnóstico. NÃO prescreva medicamentos. NÃO diga "você tem X".
5. Se detectar sinais de EMERGÊNCIA (dor no peito forte, falta de ar intensa, sinais de AVC, desmaio, sangramento intenso, ideação suicida, trauma grave), retorne stage="emergency" imediatamente com orientação para procurar UPA/SAMU 192 / CVV 188.
6. A resposta DEVE ser JSON válido conforme o schema fornecido. Não inclua texto extra, markdown, nem explicações.
7. Para idosos: use fonte simples, frases curtas, evite abreviações.
8. Ao recomendar especialidades, forneça razão clara e confiança (alta/media/baixa).
9. Especialidades válidas no sistema: Clínico Geral, Cardiologia, Neurologia, Ortopedia, Dermatologia, Ginecologia, Pediatria, Oftalmologia, Psiquiatria, Urologia, Endocrinologia, Gastroenterologia, Pneumologia, Reumatologia.

OUTPUT SCHEMA (JSON):
{
  "stage": "collecting" | "recommendation" | "emergency",
  "reply": "string - próxima pergunta OU recomendação final OU orientação de emergência",
  "collected": {
    "symptoms": ["string"],
    "duration": "string ou null",
    "intensity": number 0-10 ou null
  },
  "specialties": [
    {"name": "string", "reason": "string", "confidence": "alta|media|baixa"}
  ],
  "emergency": boolean
}`;

// ==========================================
// PALAVRAS-CHAVE DE EMERGÊNCIA (DETERMINÍSTICO)
// ==========================================
const EMERGENCY_KEYWORDS = [
  "dor no peito", "dor no peito forte", "aperto no peito",
  "falta de ar", "falta de ar forte", "dificuldade para respirar", "não consigo respirar",
  "sinais de avc", "avc", "derrame", "face dormente", "braço fraco", "fala arrastada",
  "desmaio", "desmaiei", "perdi a consciência", "perdi os sentidos",
  "sangramento intenso", "muito sangue", "hemorragia",
  "suicidio", "suicídio", "me matar", "quero morrer", "autoagressão", "autoagressao",
  "trauma grave", "acidente grave", "batida forte", "queda forte",
  "convulsao", "convulsão", "ataque epileptico", "ataque epilético",
  "alergia grave", "choque anafilatico", "choque anafilático", "garganta fechando",
];

function checkEmergencyKeywords(text) {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

// ==========================================
// MAPEAMENTO ESPECIALIDADES (IA → BANCO)
// ==========================================
const SPECIALTY_SYNONYMS = {
  "clínico geral": ["clínico geral", "clinico geral", "médico de família", "medico de familia", "medicina da família", "medicina da familia", "clínico", "clinico"],
  "cardiologia": ["cardiologia", "coração", "coracao", "pressão", "pressao", "hipertensão", "hipertensao", "cardíaco", "cardiaco"],
  "neurologia": ["neurologia", "dor de cabeça", "dor de cabeca", "cefaleia", "enxaqueca", "migrânia", "migrania", "neurológico", "neurologico"],
  "ortopedia": ["ortopedia", "osso", "articulação", "articulacao", "joelho", "coluna", "coluna vertebral", "ombro", "quadril", "fratura", "tendinite"],
  "dermatologia": ["dermatologia", "pele", "mancha", "acne", "alergia pele", "dermatite", "psoríase", "psoriase", "vitiligo"],
  "ginecologia": ["ginecologia", "ginecologista", "mulher", "pré-natal", "pre natal", "gravidez", "menstruação", "menstruacao", "anticoncepcional"],
  "pediatria": ["pediatria", "pediatra", "criança", "crianca", "bebê", "bebe", "recém-nascido", "recem nascido", "infantil"],
  "oftalmologia": ["oftalmologia", "olho", "visão", "visao", "óculos", "oculos", "catarata", "glaucoma", "miopia", "vista"],
  "psiquiatria": ["psiquiatria", "psiquiatra", "ansiedade", "depressão", "depressao", "transtorno", "bipolar", "esquizofrenia", "psicológico", "psicologico"],
  "urologia": ["urologia", "urinário", "urinario", "próstata", "prostata", "rins", "pedra nos rins", "infecção urinária", "infecção urinaria"],
  "endocrinologia": ["endocrinologia", "diabetes", "tireoide", "tireóide", "hormônio", "hormonio", "hipotireoidismo", "hipertireoidismo", "obesidade"],
  "gastroenterologia": ["gastroenterologia", "estômago", "estomago", "intestino", "gastrite", "refluxo", "azia", "cólica", "colica", "digestão", "digestao"],
  "pneumologia": ["pneumologia", "pulmão", "pulmao", "respiratório", "respiratorio", "asma", "bronquite", "pneumonia", "tosse crônica", "tosse cronica"],
  "reumatologia": ["reumatologia", "reumatismo", "artrite", "lúpus", "lupus", "fibromialgia", "artrose", "artrose", "doença autoimune", "doenca autoimune"],
};

async function mapSpecialtiesToDb(aiSpecialtyNames) {
  const banco = getBanco();
  const dbSpecs = await banco.collection("especialidades").find().toArray();
  const mapped = [];

  for (const aiName of aiSpecialtyNames) {
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
      const clinicoGeral = dbSpecs.find(s => s.nome.toLowerCase() === "clínico geral");
      matched = clinicoGeral?._id;
    }

    if (matched) {
      mapped.push(matched.toString());
    }
  }

  return [...new Set(mapped)];
}

// ==========================================
// ARMAZENAMENTO TEMPORÁRIO DE SESSÕES (em memória)
// ==========================================
const triagemSessions = new Map();

setInterval(() => {
  const agora = Date.now();
  for (const [sessionId, session] of triagemSessions.entries()) {
    if (agora - session.updatedAt > 30 * 60 * 1000) {
      triagemSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// ==========================================
// CHAMADA À IA (USA PROVIDER SELECIONADO)
// ==========================================
async function callAi(messages) {
  if (!aiProvider) {
    throw new Error("Nenhum provedor de IA configurado");
  }
  return aiProvider.call(messages, SYSTEM_PROMPT);
}

// ==========================================
// FALLBACK DETERMINÍSTICO (SE IA FALHAR)
// ==========================================
function deterministicFallback(collected) {
  const symptoms = collected.symptoms.join(" ").toLowerCase();
  let specialties = ["Clínico Geral"];

  if (symptoms.includes("coração") || symptoms.includes("pressão") || symptoms.includes("hipertens")) {
    specialties = ["Cardiologia", "Clínico Geral"];
  } else if (symptoms.includes("cabeça") || symptoms.includes("cefaleia") || symptoms.includes("enxaqueca")) {
    specialties = ["Neurologia", "Clínico Geral"];
  } else if (symptoms.includes("osso") || symptoms.includes("articula") || symptoms.includes("joelho") || symptoms.includes("coluna")) {
    specialties = ["Ortopedia", "Clínico Geral"];
  } else if (symptoms.includes("pele") || symptoms.includes("mancha") || symptoms.includes("alergia")) {
    specialties = ["Dermatologia", "Clínico Geral"];
  } else if (symptoms.includes("mulher") || symptoms.includes("gravidez") || symptoms.includes("menstrua")) {
    specialties = ["Ginecologia", "Clínico Geral"];
  } else if (symptoms.includes("criança") || symptoms.includes("bebê") || symptoms.includes("infantil")) {
    specialties = ["Pediatria", "Clínico Geral"];
  } else if (symptoms.includes("olho") || symptoms.includes("visão") || symptoms.includes("óculos")) {
    specialties = ["Oftalmologia", "Clínico Geral"];
  } else if (symptoms.includes("ansiedade") || symptoms.includes("depress") || symptoms.includes("psicológ")) {
    specialties = ["Psiquiatria", "Clínico Geral"];
  } else if (symptoms.includes("urinári") || symptoms.includes("próstata") || symptoms.includes("rim")) {
    specialties = ["Urologia", "Clínico Geral"];
  } else if (symptoms.includes("diabetes") || symptoms.includes("tireoide") || symptoms.includes("hormônio")) {
    specialties = ["Endocrinologia", "Clínico Geral"];
  } else if (symptoms.includes("estômago") || symptoms.includes("intestino") || symptoms.includes("gastrite") || symptoms.includes("digest")) {
    specialties = ["Gastroenterologia", "Clínico Geral"];
  } else if (symptoms.includes("pulmão") || symptoms.includes("asma") || symptoms.includes("bronqui") || symptoms.includes("tosse")) {
    specialties = ["Pneumologia", "Clínico Geral"];
  } else if (symptoms.includes("reumat") || symptoms.includes("artrite") || symptoms.includes("lúpus")) {
    specialties = ["Reumatologia", "Clínico Geral"];
  }

  return {
    stage: "recommendation",
    reply: `Com base nas informações que você me passou, as especialidades mais indicadas são: ${specialties.join(", ")}. Lembre-se: esta é uma orientação inicial e não substitui a avaliação de um profissional de saúde.`,
    collected,
    specialties: specialties.map((name, i) => ({
      name,
      reason: `Sintomas relatados sugerem ${name.toLowerCase()}`,
      confidence: i === 0 ? "alta" : "media",
    })),
    emergency: false,
  };
}

// ==========================================
// ROTAS
// ==========================================

// POST /triage/start
router.post("/start", autenticar, async (req, res) => {
  try {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      pacienteId: req.usuario.pacienteId,
      messages: [],
      collected: { symptoms: [], duration: null, intensity: null },
      stage: "collecting",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    triagemSessions.set(sessionId, session);

    const initialReply = "Olá! Vou te fazer algumas perguntas para entender seu sintoma e orientar a melhor especialidade. O que você está sentindo hoje?";

    session.messages.push({ role: "assistant", content: initialReply });
    session.updatedAt = Date.now();

    const response = {
      sessionId,
      stage: "collecting",
      reply: initialReply,
      collected: session.collected,
      specialties: [],
      emergency: false,
    };

    return res.status(201).json(response);
  } catch (erro) {
    console.error("Erro ao iniciar triagem:", erro);
    return res.status(500).json({ mensagem: "Erro ao iniciar triagem." });
  }
});

// POST /triage/message
router.post("/message", autenticar, async (req, res) => {
  try {
    const parseResult = MessageTriageRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ mensagem: "Dados inválidos.", errors: parseResult.error.flatten() });
    }

    const { sessionId, message } = parseResult.data;
    const session = triagemSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ mensagem: "Sessão de triagem não encontrada ou expirada." });
    }

    if (session.pacienteId.toString() !== req.usuario.pacienteId.toString()) {
      return res.status(403).json({ mensagem: "Acesso negado a esta sessão." });
    }

    if (session.stage !== "collecting") {
      return res.status(400).json({ mensagem: "Esta triagem já foi finalizada." });
    }

    // Verificação determinística de emergência ANTES de chamar IA
    if (checkEmergencyKeywords(message)) {
      const emergencyReply = "⚠️ EMERGÊNCIA DETECTADA: Procure imediatamente uma UPA ou ligue para o SAMU 192. Se houver risco de vida, não aguarde agendamento eletivo. Para apoio emocional, ligue CVV 188.";

      session.messages.push({ role: "user", content: message });
      session.messages.push({ role: "assistant", content: emergencyReply });
      session.stage = "emergency";
      session.emergency = true;
      session.updatedAt = Date.now();

      const triagemId = await persistTriagem(session);

      return res.json({
        stage: "emergency",
        reply: emergencyReply,
        collected: session.collected,
        specialties: [],
        emergency: true,
        disclaimer: "Orientação de emergência - procure atendimento imediato.",
        triagemId,
      });
    }

    session.messages.push({ role: "user", content: message });
    session.updatedAt = Date.now();

    const aiMessages = session.messages.filter(m => m.role === "user" || m.role === "assistant");

    let aiResult;
    try {
      const aiResponseText = await callAi(aiMessages);
      const parsed = JSON.parse(aiResponseText);
      aiResult = TriageOutputSchema.parse(parsed);
    } catch (aiError) {
      console.error("Erro IA, usando fallback:", aiError.message);
      aiResult = deterministicFallback(session.collected);
    }

    session.collected = aiResult.collected;
    session.stage = aiResult.stage;
    session.emergency = aiResult.emergency;
    session.messages.push({ role: "assistant", content: aiResult.reply });
    session.updatedAt = Date.now();

    if (aiResult.stage === "recommendation" || aiResult.stage === "emergency") {
      const specialtyNames = aiResult.specialties.map(s => s.name);
      let dbSpecialtyIds = [];
      try {
        dbSpecialtyIds = await mapSpecialtiesToDb(specialtyNames);
      } catch (dbError) {
        console.error("Erro ao mapear especialidades no banco:", dbError.message);
      }

      // Fallback: usar um ID genérico se o mapeamento falhar
      const fallbackEspecialidadeId = dbSpecialtyIds[0] || "000000000000000000000000";

      const specialtiesWithIds = aiResult.specialties.map((s, i) => ({
        especialidadeId: dbSpecialtyIds[i] || fallbackEspecialidadeId,
        nome: s.name,
        reason: s.reason,
        confidence: s.confidence,
      }));

      session.specialties = specialtiesWithIds;

      let triagemId = null;
      try {
        triagemId = await persistTriagem(session);
      } catch (persistError) {
        console.error("Erro ao persistir triagem:", persistError.message);
        triagemId = "fallback-" + Date.now();
      }

      const disclaimer = aiResult.stage === "recommendation"
        ? "Esta é uma orientação inicial e não substitui a avaliação de um profissional de saúde."
        : "Orientação de emergência - procure atendimento imediato.";

      return res.json({
        stage: aiResult.stage,
        reply: aiResult.reply,
        collected: session.collected,
        specialties: specialtiesWithIds,
        emergency: aiResult.emergency,
        disclaimer,
        triagemId,
      });
    }

    return res.json({
      stage: "collecting",
      reply: aiResult.reply,
      collected: session.collected,
      specialties: [],
      emergency: false,
    });
  } catch (erro) {
    console.error("Erro na triagem:", erro);
    return res.status(500).json({ mensagem: "Erro ao processar mensagem." });
  }
});

// GET /triage/:sessionId/result
router.get("/:sessionId/result", autenticar, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      return res.status(400).json({ mensagem: "ID de sessão inválido." });
    }

    const banco = getBanco();
    const triagem = await banco.collection("triagens").findOne({ sessionId });

    if (!triagem) {
      return res.status(404).json({ mensagem: "Triagem não encontrada." });
    }

    if (triagem.pacienteId.toString() !== req.usuario.pacienteId.toString()) {
      return res.status(403).json({ mensagem: "Acesso negado." });
    }

    return res.json({
      triagemId: triagem._id.toString(),
      resumo: triagem.resumo,
      sintomas: triagem.sintomas,
      duracao: triagem.duracao,
      intensidade: triagem.intensidade,
      especialidadesSugeridas: triagem.especialidadesSugeridas.map(s => ({
        especialidadeId: s.especialidadeId.toString(),
        nome: s.nome,
        reason: s.reason,
        confidence: s.confidence,
      })),
      emergency: triagem.emergency,
      avisoExibido: triagem.avisoExibido,
      criadoEm: triagem.criadoEm,
    });
  } catch (erro) {
    console.error("Erro ao buscar resultado:", erro);
    return res.status(500).json({ mensagem: "Erro ao buscar resultado da triagem." });
  }
});

// ==========================================
// FUNÇÃO AUXILIAR: PERSISTIR TRIAGEM NO BANCO
// ==========================================
async function persistTriagem(session) {
  const banco = getBanco();

  const sintomasStr = session.collected.symptoms.join(", ") || "não informados";
  const duracaoStr = session.collected.duration || "não informada";
  const intensidadeStr = session.collected.intensity !== null ? `${session.collected.intensity}/10` : "não informada";
  const resumo = `Paciente relata ${sintomasStr} há ${duracaoStr}, intensidade ${intensidadeStr}.`;

  const triagemDoc = {
    sessionId: session.sessionId,
    pacienteId: session.pacienteId,
    resumo: resumo.slice(0, 500),
    sintomas: session.collected.symptoms,
    duracao: session.collected.duration,
    intensidade: session.collected.intensity,
    especialidadesSugeridas: (session.specialties || []).map(s => ({
      especialidadeId: new ObjectId(s.especialidadeId),
      nome: s.nome,
      reason: s.reason,
      confidence: s.confidence,
    })),
    emergency: session.emergency || false,
    avisoExibido: session.stage === "recommendation" || session.stage === "emergency",
    consultaId: null,
    criadoEm: new Date(),
  };

  const result = await banco.collection("triagens").insertOne(triagemDoc);
  return result.insertedId.toString();
}

module.exports = router;
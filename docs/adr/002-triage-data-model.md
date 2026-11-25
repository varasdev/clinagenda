# ADR 002: Modelo de Dados da Triagem (MongoDB)

**Status:** Aceito  
**Data:** 2026-11-24

## Contexto
A pré-triagem precisa persistir resultado estruturado para: (a) histórico do paciente, (b) vincular à consulta quando agendada, (c) exibir aviso de transparência, (d) LGPD (minimização).

## Decisão
Coleção `triagens` com esquema:

```js
{
  _id: ObjectId,
  pacienteId: ObjectId,                    // obrigatório, índice
  resumo: string,                          // resumo da IA (≤ 500 chars)
  sintomas: [string],                      // normalizados (lowercase, trim)
  duracao: string,                         // ex.: "3 dias"
  intensidade: number,                     // 0-10, obrigatório
  especialidadesSugeridas: [               // mapeadas para IDs do banco
    {
      especialidadeId: ObjectId,           // ref: especialidades._id
      nome: string,                        // nome no momento da triagem
      reason: string,                      // por que a IA sugeriu
      confidence: "alta" | "media" | "baixa"
    }
  ],
  emergency: boolean,                      // true = sinais de alerta
  avisoExibido: boolean,                   // disclaimer mostrado ao paciente
  consultaId: ObjectId,                    // opcional, preenchido no agendamento
  criadoEm: Date
}
```

**Índices:**
- `{ pacienteId: 1, criadoEm: -1 }` — histórico do paciente
- `{ consultaId: 1 }` — vínculo 1:1 (único, sparse)

**Não persistir:** conversa bruta (role/user/assistant). Apenas `resumo` + campos estruturados.

## Justificativa
- LGPD: minimização de dados sensíveis de saúde
- `intensidade` obrigatória (0-10) garante triagem acionável
- `especialidadeId` permite join direto no agendamento (pré-seleção)
- `emergency` boolean separa fluxo de urgência do eletivo
- Índices cobrem consultas frequentes (histórico paciente, busca por consulta)

## Consequências
- Backend valida esquema com Zod antes de inserir
- Fallback determinístico (palavras-chave → especialidade) também persiste no mesmo formato
- Migração futura: adicionar `versaoPrompt` se prompt mudar
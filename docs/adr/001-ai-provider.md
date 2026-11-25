# ADR 001: Provedor de IA para Pré-triagem

**Status:** Aceito  
**Data:** 2026-11-24

## Contexto
A 2ª entrega exige pré-triagem conversacional com IA (15% da nota). Precisa de provedor com API, resposta estruturada (JSON), suporte a system prompt em português, e custo viável para demo acadêmica.

## Decisão
Usar **Google Gemini 1.5 Pro** (`gemini-1.5-pro`) via API oficial do Google Generative AI (`@google/generative-ai`).

## Justificativa
- Modelo capaz da Google (raciocínio complexo, seguir instruções de JSON estrito)
- Contexto amplo (1M tokens) — cabe histórico curto de triagem + system prompt
- API estável, SDK oficial (`@google/generative-ai`)
- Custo significativamente menor que Claude Opus 5.5 para uso acadêmico
- Chave fica **somente no backend** (variável `GOOGLE_API_KEY` ou `GEMINI_API_KEY`); app RN nunca chama a IA direto
- Interface `TriageAiProvider` isola o provedor para troca futura sem quebrar o resto
- Variável `AI_PROVIDER` permite alternar entre `gemini` e `anthropic` sem deploy de código

## Consequências
- Custo por request muito menor que Anthropic; mitigado: triagem curta (5–7 turnos), rate limit por usuário, fallback determinístico
- Chave fica **somente no backend**; app RN nunca chama a IA direto
- Interface `TriageAiProvider` isola o provedor para troca futura sem quebrar o resto
- Resposta estruturada via `responseMimeType: "application/json"` no Gemini garante JSON válido
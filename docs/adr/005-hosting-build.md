# ADR 005: Hospedagem e Build — Render + EAS Build

**Status:** Aceito  
**Data:** 2026-11-24

## Contexto
API já roda no Render (Web Service). Frontend web é Static Site no Render. Precisa adicionar endpoints de triagem e gerar APK do app RN para demo.

## Decisão
| Componente | Onde | Como |
|------------|------|------|
| **API (backend + triagem)** | Render (mesmo Web Service) | Novas rotas `/triage/*` no `server.js`; variável `GOOGLE_API_KEY` no painel Render; `GET /health` para warm-up |
| **Banco** | MongoDB Atlas (já configurado) | String de conexão `MONGODB_URI` no Render; `DB_NAME` |
| **App RN (paciente)** | EAS Build (preview profile) | `eas build --profile preview --platform android` → APK instalável; `EXPO_PUBLIC_API_URL=https://clinagenda-api.onrender.com` |
| **Frontend web (profissional/admin)** | Render Static Site (já publicado) | Sem mudanças |

## Variáveis de ambiente no Render (backend)
```
MONGODB_URI=...
DB_NAME=...
PORT=3000
JWT_SECRET=...
GOOGLE_API_KEY=sk-ant-...   # NOVA - chave do Claude Opus 5.5
```

## Variáveis no app RN (EAS Build / .env)
```
EXPO_PUBLIC_API_URL=https://clinagenda-api.onrender.com
```

## Cold start Render
- Serviço gratuito "spin down" após 15 min sem request
- **Warm-up antes da demo:** `curl https://clinagenda-api.onrender.com/health` a cada 5 min (script simples) ou ping manual 5 min antes
- Health endpoint: `GET /` já retorna JSON; adicionar `/health` alias se necessário

## Justificativa
- Reutiliza infra existente (zero custo extra, zero config nova)
- EAS Build: não precisa Android Studio/Xcode local; APK preview roda em device/emulador
- API única para web + RN simplifica CORS, auth, deploy

## Consequências
- `cors()` no Express já permite origem do app RN (mesmo domínio API)
- Rate limit nas rotas `/triage/*` (ex.: 10 req/min por IP/usuário)
- APK preview expira em 30 dias; rebuild antes da apresentação se necessário
# ClínAgenda Mobile — App Paciente

**React Native / Expo SDK 58** — Aplicativo móvel para pacientes do sistema ClínAgenda.

---

## Visão Geral

App nativo para pacientes com:
- **Autenticação JWT** (SecureStore)
- **Pré-triagem conversacional** com IA (Claude Opus 5.5)
- **Agendamento integrado** (wizard 3 passos)
- **Gestão de consultas** (próximos/histórico, cancelar)
- **Perfil editável** (endereço estruturado)
- **Acessibilidade** para idosos (fonte 16sp+, toque 48dp+, contraste AA)

---

## Telas (8)

| Tela | Arquivo | Descrição |
|------|---------|-----------|
| Login | `src/screens/auth/LoginScreen.tsx` | Email/senha → JWT → MainTabs |
| Home | `src/screens/home/HomeScreen.tsx` | Próxima consulta, quick actions, badge Agenda |
| Triagem | `src/screens/triagem/TriagemScreen.tsx` | Chatbot bolhas, typing indicator, max 7 turnos |
| Triagem Resultado | `src/screens/triagem/TriagemResultadoScreen.tsx` | Especialidades + confiança, disclaimer, navega Agendar |
| Agendamentos | `src/screens/agenda/AgendamentosScreen.tsx` | Tabs Próximos/Histórico, cards, cancelar, pull-to-refresh |
| Agendar | `src/screens/agenda/AgendarScreen.tsx` | Wizard: Profissional → Data → Hora → Resumo + Confirmar |
| Detalhe Agendamento | `src/screens/agenda/DetalheAgendamentoScreen.tsx` | Dados completos, mapa, telefone, cancelar/reagendar |
| Perfil | `src/screens/perfil/PerfilScreen.tsx` | Read-only, botão Editar, logout |
| Editar Perfil | `src/screens/perfil/EditarPerfilScreen.tsx` | Form nome/telefone/endereço estruturado, validação inline |

---

## Navegação

```
RootNavigator (Stack)
├─ AuthStack
│  └─ Login
└─ MainTabs (Bottom Tabs)
   ├─ HomeStack
   │  ├─ HomeScreen
   │  ├─ Triagem
   │  └─ TriagemResultado
   ├─ AgendaStack
   │  ├─ Agendamentos
   │  ├─ Agendar
   │  └─ DetalheAgendamento
   └─ PerfilStack
      ├─ Perfil
      └─ EditarPerfil
```

**Cross-tab navigation**: Home → DetalheAgendamento navega para tab Agenda via `navigation.navigate('Agenda', { screen: 'DetalheAgendamento', params })`.

---

## Início Rápido

```bash
cd mobile
npm install
npx expo start
```

Abre no **Expo Go** (QR code) ou **Dev Build** (`npx expo run:android|ios`).

---

## Build APK (Preview)

```bash
# Requer EAS CLI logado: npx eas-cli login
npx eas-cli build --profile preview --platform android
```

Gera APK instalável via link do EAS (distribution: internal).

---

## Variáveis de Ambiente

**`.env.local`** (já configurado):
```env
EXPO_PUBLIC_API_URL=https://clinagenda-api.onrender.com
```

**`eas.json`** (preview profile injeta a URL no build):
```json
"preview": {
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "env": { "EXPO_PUBLIC_API_URL": "https://clinagenda-api.onrender.com" }
}
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia Expo dev server |
| `npm run android` | Abre no emulador Android |
| `npm run ios` | Abre no simulador iOS |
| `npm run web` | Abre no navegador (Expo Web) |
| `npm run lint` | ESLint (Expo config) |
| `npx tsc --noEmit` | TypeScript type check |

---

## Estrutura de Código

```
mobile/
├── src/
│   ├── screens/           # 8 telas (auth, home, triagem, agenda, perfil)
│   ├── navigation/        # Stacks tipados + RootNavigator
│   │   ├── types.ts       # Navigation param lists (TypeScript)
│   │   ├── AuthStack.tsx
│   │   ├── HomeStack.tsx
│   │   ├── AgendaStack.tsx
│   │   ├── PerfilStack.tsx
│   │   ├── MainTabs.tsx
│   │   └── RootNavigator.tsx
│   ├── context/
│   │   └── AuthContext.tsx  # Auth state + SecureStore persistence
│   ├── services/
│   │   └── api.ts           # Axios instance + API modules
│   ├── theme/
│   │   └── index.ts         # Design system (cores, spacing, typography, a11y)
│   ├── hooks/               # Custom hooks (se houver)
│   ├── utils/               # Helpers
│   └── types/               # Shared types
├── App.tsx                  # AuthProvider + RootNavigator + Notifications handler
├── app.json                 # Expo config (nome, ícone, splash, plugins)
├── eas.json                 # EAS Build profiles
├── tsconfig.json            # TypeScript config (path aliases @/*)
└── package.json
```

---

## API Service (`src/services/api.ts`)

- **Axios instance** com baseURL de `EXPO_PUBLIC_API_URL`
- **Request interceptor**: anexa JWT do `expo-secure-store`
- **Response interceptor**: trata 401→logout, 409→conflito, network→banner
- **Módulos tipados**: `authApi`, `triagemApi`, `catalogoApi`, `disponibilidadeApi`, `agendamentoApi`, `pacienteApi`, `healthApi`

---

## Theme System (`src/src/theme/index.ts`)

Design system completo:
- **Cores**: primary, surface, background, text, danger, success, warning, emergency + light/dark variants
- **Espaçamento**: xs(4) → xl(24)
- **Tipografia**: h1-h3, body, bodySmall, caption, button, input
- **Acessibilidade**: `minTouchTarget = 48`, helpers `a11y.button()`, `a11y.text()`, `a11y.input()`, `a11y.listItem()`, `a11y.image()`
- **Sombras**: card, modal, elevation helpers
- **Utilidades**: `globalStyles` (container, center, card, cardContent)

---

## Autenticação (`src/context/AuthContext.tsx`)

- **Estado**: `user`, `token`, `loading`
- **Persistência**: `expo-secure-store` (token + user data)
- **Auto-restore**: `restoreSession()` no mount valida token com `/auth/me`
- **Login**: salva token+user, navega `MainTabs` via `navigationRef`
- **Logout**: limpa storage, navega `Login` via `navigationRef`

---

## Triagem IA — Fluxo Mobile

1. **HomeScreen** → "Iniciar triagem" → `navigation.navigate('Triagem')`
2. **TriagemScreen** → `triagemApi.start()` → `sessionId` + primeira pergunta
3. **Chat loop**: usuário responde → `triagemApi.sendMessage(sessionId, msg)` → próxima pergunta OU recomendação OU emergência
4. **Detecção emergência**: keywords determinísticas ANTES de chamar IA (dor no peito, falta de ar, AVC, etc.)
5. **Resultado**: `stage=recommendation` → navega `TriagemResultado` com `specialties[]`, `disclaimer`, `triagemId`
6. **TriagemResultadoScreen** → "Ver profissionais e agendar" → `navigation.navigate('Agenda', { screen: 'Agendar', params: { especialidadeId, triagemId } })`

---

## Agendamento — Wizard 3 Passos

```
AgendarScreen (params: especialidadeId, triagemId?)
│
├─ Passo 1: Profissional
│   ├─ GET /profissionais?especialidadeId
│   └─ Seleção → carrega disponibilidades
│
├─ Passo 2: Data (scroller horizontal 30 dias)
│   ├─ Filtra disponibilidades por dia da semana
│   └─ Gera horários em intervalos de 30min
│
├─ Passo 3: Horário (grid)
│   └─ Seleção habilita Resumo
│
└─ Resumo + Confirmar
    └─ POST /agendamentos { profissionalId, data, hora, triagemId }
        └─ Backend: transação cria agendamento + atualiza triagens.consultaId
```

---

## Testes de Qualidade

```bash
# TypeScript
npx tsc --noEmit

# Lint
npm run lint

# Expo Doctor (diagnostica dependências)
npx expo-doctor
```

---

## Deploy Mobile

### EAS Build (Preview APK)
```bash
npx eas-cli build --profile preview --platform android
```
- Gera APK (não AAB) para instalação direta
- `distribution: internal` → link compartilhável
- Injeta `EXPO_PUBLIC_API_URL` via `eas.json`

### Produção (futuro)
```bash
npx eas-cli build --profile production --platform android
npx eas-cli submit --platform android
```

---

## Acessibilidade (Idosos)

| Requisito | Implementação |
|-----------|---------------|
| Fonte mínima 16sp | `typography.body: { fontSize: 16 }` |
| Toque mínimo 48dp | `minTouchTarget = 48`, todos botões `minHeight: minTouchTarget` |
| Contraste AA | Cores do theme validadas (primary/#156e3d sobre branco = 7.2:1) |
| Screen readers | `a11y.*` helpers em todos elementos interativos |
| Uma pergunta por vez | Chatbot design |
| DatePicker nativo | Seleção de data usa componente nativo do SO |

---

## Próximos Passos (Polimento)

- [ ] Notificações push locais (`expo-notifications` + permissões)
- [ ] Rate limiting client-side (debounce envio mensagens)
- [ ] Recovery sessão triagem (AsyncStorage)
- [ ] Testes E2E automatizados
- [ ] Screenshots para documentação

---

## Licença

Projeto acadêmico — Projeto Integrador "Saúde na Palma da Mão".
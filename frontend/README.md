# ClínAgenda — Frontend

Interface web do Projeto Integrador para consultar clínicas, especialidades e profissionais, gerenciar disponibilidades e acompanhar agendamentos de consultas.

Este frontend foi desenvolvido com **HTML, CSS e JavaScript puro**, sem framework de interface ou etapa de compilação. A API e o banco de dados ficam no diretório `backend/`.

## Funcionalidades da interface

- Login de usuários e cadastro público de pacientes.
- Dashboard com navegação por perfil.
- Consulta de clínicas e especialidades.
- Consulta e filtragem de profissionais por nome e especialidade.
- Formulários administrativos para cadastrar clínicas, especialidades e profissionais.
- Criação administrativa de conta vinculada a um profissional.
- Consulta e cadastro de disponibilidades de atendimento, conforme as permissões da API.
- Agendamento, listagem e cancelamento de consultas.
- Consulta e edição dos campos permitidos do perfil do paciente.
- Layout responsivo para computadores e dispositivos móveis.
- Manifesto e Service Worker para instalação como Progressive Web App (PWA) e cache básico dos arquivos estáticos.

## Estrutura dos arquivos

```text
frontend/
├── index.html          # Estrutura das telas e formulários
├── style.css           # Identidade visual e layout responsivo
├── app.js              # Navegação, autenticação e integração com a API
├── manifest.json       # Metadados usados na instalação do PWA
├── service-worker.js   # Cache básico dos arquivos da interface
├── icon.svg            # Ícone do aplicativo
└── README.md           # Esta documentação
```

## Requisitos

- Node.js e npm instalados para executar o backend.
- MongoDB acessível e variáveis de ambiente configuradas no backend.
- Visual Studio Code com a extensão Live Server (ou outro servidor HTTP local).
- Navegador moderno com suporte a JavaScript, Service Worker e PWA.

## Executar localmente

### 1. Iniciar o backend

Abra um terminal na pasta `backend/` e execute:

```bash
npm install
node server.js
```

O backend deve estar configurado com seu arquivo `.env`, incluindo as variáveis de conexão MongoDB e a chave JWT. **Não publique nem compartilhe o `.env`.** Com a configuração padrão, a API fica em `http://localhost:3000`.

### 2. Abrir o frontend

No VS Code, clique com o botão direito em `frontend/index.html` e escolha **Open with Live Server**. A página deverá abrir num endereço HTTP local, por exemplo `http://127.0.0.1:5500/frontend/`.

Mantenha o backend rodando em outro terminal. No cabeçalho do ClínAgenda, o indicador deverá mostrar **API conectada** quando a rota inicial da API responder.

> Não abra apenas o arquivo com o esquema `file://` para validar o PWA. Service Workers exigem um contexto seguro; `localhost` e HTTPS são contextos aceitos pelos navegadores modernos.

## Configuração do endereço da API

No início de `app.js`, a constante `API_URL` indica onde está a API:

```javascript
const API_URL = "http://localhost:3000";
```

Esse endereço é apropriado para desenvolvimento local. **Não funciona para visitantes de outro computador ou celular**: nesses casos, `localhost` apontaria para o próprio dispositivo do visitante.

Antes de publicar o frontend, substitua esse valor pela URL HTTPS pública real do backend, depois que o serviço estiver hospedado. A API também precisa permitir CORS para a origem pública do frontend. Não invente uma URL de produção antes de concluir a publicação do backend.

## Autenticação e segurança

- O login usa `POST /auth/login` e recebe um token JWT da API.
- O token é mantido em `sessionStorage` durante a sessão do navegador e enviado em requisições protegidas no cabeçalho `Authorization: Bearer <token>`.
- A interface adapta itens de navegação e formulários ao perfil recebido: `paciente`, `profissional` ou `administrador`.
- A autorização real é responsabilidade do backend. Ocultar um botão no frontend não substitui a validação de permissões feita pela API.
- Não coloque credenciais, tokens, chaves JWT ou strings de conexão no código do frontend ou neste README.

## Integração com a API

O frontend utiliza atualmente os seguintes endpoints:

| Método | Endpoint | Uso na interface |
|---|---|---|
| `GET` | `/` | Verificar conexão com a API |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/register` | Cadastro público de paciente |
| `GET` | `/auth/me` | Restaurar e validar sessão |
| `GET` | `/clinicas` | Listar clínicas |
| `POST` | `/clinicas` | Cadastrar clínica (administrador) |
| `GET` | `/especialidades` | Listar especialidades |
| `POST` | `/especialidades` | Cadastrar especialidade (administrador) |
| `GET` | `/profissionais` | Listar, filtrar e preencher seletores |
| `POST` | `/profissionais` | Cadastrar profissional (administrador) |
| `POST` | `/auth/usuarios/profissional` | Criar conta de profissional (administrador) |
| `GET` | `/disponibilidades` | Consultar disponibilidades de acordo com o perfil |
| `POST` | `/disponibilidades` | Cadastrar disponibilidade conforme permissões |
| `GET` | `/agendamentos` | Listar agendamentos permitidos ao usuário |
| `POST` | `/agendamentos` | Agendar consulta como paciente |
| `PUT` | `/agendamentos/:id/cancelar` | Cancelar agendamento autorizado |
| `GET` | `/pacientes/:id` | Consultar dados do paciente autenticado |
| `PUT` | `/pacientes/:id` | Atualizar campos permitidos do próprio perfil |

A documentação interativa dos endpoints encontra-se no backend, em `/docs` quando a API está em execução local.

## PWA e funcionamento offline

O `manifest.json` declara nome, ícone, cor e modo de exibição do aplicativo. O `service-worker.js` faz cache dos arquivos estáticos da interface e permite carregar a estrutura do app depois de uma visita inicial.

- Para instalação e testes locais, use o endereço HTTP fornecido pelo Live Server.
- Em um ambiente publicado, utilize HTTPS.
- O cache offline é limitado aos arquivos estáticos. Login, consultas, agendamentos, dados atualizados e outras operações da API precisam de conexão com o backend.
- O Service Worker não deve ser considerado um mecanismo de armazenamento offline de dados de pacientes ou consultas.
- Depois de alterar arquivos estáticos, atualize o navegador e, se necessário, verifique o Service Worker em DevTools → Application.

## Testes manuais recomendados

1. Com o backend ativo, confirmar que o cabeçalho mostra **API conectada**.
2. Entrar com uma conta de teste válida e verificar a dashboard correspondente ao perfil.
3. Conferir se clínicas, especialidades e profissionais são carregados da API.
4. Como administrador, testar os formulários de cadastro e a criação de acesso de profissional.
5. Como profissional, testar o cadastro de disponibilidade vinculada ao próprio perfil.
6. Como paciente, agendar uma consulta em um horário disponível, atualizar a lista e testar o cancelamento.
7. Tentar repetir um horário ocupado e confirmar que a API rejeita a duplicidade.
8. Testar a interface em uma largura de celular e conferir o registro do Service Worker.
9. Confirmar que operações protegidas continuam bloqueadas pela API para perfis sem permissão.

## Limitações conhecidas e próximos passos

- O endereço da API está configurado para desenvolvimento local (`http://localhost:3000`); precisa ser alterado para a URL HTTPS de produção antes da publicação do frontend.
- O backend e o frontend precisam estar publicados e configurados para comunicação entre origens, incluindo CORS.
- O PWA tem cache básico de recursos estáticos; não oferece operação completa offline.
- Os formatos dos dados retornados pelas rotas devem permanecer compatíveis com o que `app.js` espera. Após mudanças na API, execute os testes manuais acima.
- Confirme os requisitos finais da atividade, incluindo URL publicada, links dos repositórios e eventuais funcionalidades administrativas ainda não expostas pela interface.

## Créditos

**ClínAgenda — Projeto Integrador**

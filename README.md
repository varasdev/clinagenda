# ClínAgenda — Sistema de Agendamento de Consultas

Aplicação web desenvolvida como Projeto Integrador para gerenciar clínicas, especialidades, profissionais de saúde, pacientes, disponibilidades de atendimento e agendamentos de consultas.

O projeto é composto por uma **API REST**, uma **interface web responsiva** e recursos de **Progressive Web App (PWA)**. O backend utiliza Node.js, Express e MongoDB; o frontend foi desenvolvido com HTML, CSS e JavaScript puro.

## Acesso ao projeto

- **Aplicação web:** [https://clinagenda.onrender.com/](https://clinagenda.onrender.com/)
- **API:** [https://clinagenda-api.onrender.com/](https://clinagenda-api.onrender.com/)
- **Documentação interativa (Swagger UI):** [https://clinagenda-api.onrender.com/docs](https://clinagenda-api.onrender.com/docs)
- **Repositório:** [https://github.com/varasdev/clinagenda](https://github.com/varasdev/clinagenda)

## Funcionalidades

### Autenticação e perfis

- Cadastro público de pacientes.
- Login com autenticação baseada em JWT.
- Controle de acesso por perfil: paciente, profissional e administrador.
- Criação administrativa de contas vinculadas a profissionais já cadastrados.
- Consulta da sessão do usuário autenticado.

### Gestão do atendimento

- Cadastro e consulta de clínicas.
- Cadastro e consulta de especialidades.
- Cadastro, consulta e filtragem de profissionais por nome, clínica e especialidade.
- Consulta e atualização dos dados permitidos do paciente, respeitando as regras de acesso.
- Cadastro e consulta de disponibilidades de atendimento.
- Agendamento, listagem, consulta e cancelamento de consultas.
- Validação de dados e bloqueio de conflitos de horários e agendamentos duplicados.

### Interface e PWA

- Dashboard com navegação adaptada ao perfil autenticado.
- Formulários integrados à API.
- Layout responsivo para computadores e dispositivos móveis.
- Manifesto, ícone e Service Worker para instalação como PWA.
- Cache básico dos arquivos estáticos da interface.

## Tecnologias utilizadas

| Área | Tecnologias |
|---|---|
| Backend | Node.js, Express 5 |
| Banco de dados | MongoDB / MongoDB Atlas |
| Autenticação | JSON Web Token (JWT) |
| Hash de senhas | bcryptjs |
| Comunicação entre origens | CORS |
| Variáveis de ambiente | dotenv |
| Documentação da API | Swagger UI / OpenAPI |
| Frontend | HTML5, CSS3 e JavaScript |
| PWA | Web App Manifest e Service Worker |
| Versionamento | Git e GitHub |
| Hospedagem | Render |

## Estrutura do repositório

```text
clinagenda/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── docs/
│   │   └── openapi.js
│   ├── middlewares/
│   │   └── auth.js
│   ├── routes/
│   │   ├── agendamentos.js
│   │   ├── auth.js
│   │   ├── clinicas.js
│   │   ├── disponibilidades.js
│   │   ├── especialidades.js
│   │   ├── pacientes.js
│   │   ├── perfis.js
│   │   └── profissionais.js
│   ├── scripts/
│   │   └── criar-admin.js
│   ├── .env                 # Arquivo local; não versionar
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── manifest.json
│   ├── service-worker.js
│   └── icon.svg
├── .gitignore
└── README.md
```

> A estrutura acima destaca os principais arquivos do projeto. Arquivos locais de dependências, como `node_modules/`, não fazem parte do repositório.

## Executar o projeto localmente

### Requisitos

- Node.js e npm instalados.
- Uma instância MongoDB acessível (por exemplo, MongoDB Atlas).
- Visual Studio Code com a extensão Live Server, ou outro servidor HTTP local.
- Navegador moderno com suporte a JavaScript, Service Worker e PWA.

### 1. Clonar o repositório

```bash
git clone https://github.com/varasdev/clinagenda.git
cd clinagenda
```

### 2. Configurar e iniciar o backend

Abra um terminal na pasta `backend/`:

```bash
cd backend
npm install
```

Crie um arquivo `.env` dentro de `backend/` com as variáveis necessárias:

```env
MONGODB_URI=sua_string_de_conexao_mongodb
DB_NAME=test
PORT=3000
JWT_SECRET=sua_chave_secreta
```

Use uma string de conexão válida e o nome do banco que contém as coleções do projeto. O valor `test` é o banco utilizado no ambiente atual do projeto; em outra instalação, ajuste `DB_NAME` conforme o banco configurado.

Inicie a API:

```bash
node server.js
```

Com a configuração padrão, a API fica disponível localmente em `http://localhost:3000`. A rota `/` retorna uma mensagem para verificar se a API está funcionando, e a documentação Swagger fica em `http://localhost:3000/docs`.

### 3. Abrir o frontend

Em outro terminal, volte à raiz do projeto e abra `frontend/index.html` com o Live Server pelo VS Code. O endereço local será semelhante a `http://127.0.0.1:5500/`.

O frontend utiliza a constante `API_URL`, declarada no início de `frontend/app.js`, para definir o endereço do backend. Para desenvolvimento local, configure-a para:

```javascript
const API_URL = "http://localhost:3000";
```

Na versão publicada, essa constante deve apontar para a API hospedada:

```javascript
const API_URL = "https://clinagenda-api.onrender.com";
```

Depois de alterar o endereço, salve o arquivo e recarregue a página. Mantenha o backend local em execução quando estiver usando `localhost`.

> Para testar o PWA, acesse o frontend por HTTP em `localhost` ou por HTTPS. Abrir o HTML diretamente pelo esquema `file://` não permite validar corretamente o Service Worker.

## API e documentação

A API utiliza endpoints REST organizados por recurso. A documentação interativa está disponível em:

- Local: `http://localhost:3000/docs`
- Publicada: [https://clinagenda-api.onrender.com/docs](https://clinagenda-api.onrender.com/docs)

### Principais endpoints

| Método | Endpoint | Descrição / acesso |
|---|---|---|
| `GET` | `/` | Verificar se a API está funcionando |
| `POST` | `/auth/register` | Cadastro público de paciente |
| `POST` | `/auth/login` | Login de usuário |
| `GET` | `/auth/me` | Consultar usuário autenticado — JWT |
| `POST` | `/auth/usuarios/profissional` | Criar conta de profissional — administrador |
| `GET` | `/perfis/paciente` | Rota de teste de permissão — paciente |
| `GET` | `/perfis/profissional` | Rota de teste de permissão — profissional |
| `GET` | `/perfis/administrador` | Rota de teste de permissão — administrador |
| `GET` / `POST` | `/clinicas` | Listar/filtrar clínicas; cadastrar clínica — administrador no cadastro |
| `GET` / `POST` | `/especialidades` | Listar especialidades; cadastrar — administrador no cadastro |
| `GET` / `POST` | `/profissionais` | Listar/filtrar profissionais; cadastrar — administrador no cadastro |
| `GET` / `POST` | `/pacientes` | Listar/cadastrar pacientes — operações administrativas protegidas |
| `GET` / `PUT` | `/pacientes/:id` | Consultar/atualizar paciente, conforme perfil e autorização |
| `GET` / `POST` | `/disponibilidades` | Consultar/cadastrar disponibilidades, conforme perfil e autorização |
| `GET` / `POST` | `/agendamentos` | Listar agendamentos conforme perfil; paciente cria agendamento |
| `GET` | `/agendamentos/:id` | Consultar agendamento por ID, conforme autorização |
| `PUT` | `/agendamentos/:id/cancelar` | Cancelar agendamento, conforme autorização |

As rotas protegidas exigem o cabeçalho de autorização:

```http
Authorization: Bearer SEU_TOKEN
```

O token é obtido em `POST /auth/login`. No Swagger UI, use **Authorize** para informar o token antes de executar operações protegidas.

## Perfis e permissões

- **Paciente:** pode consultar e atualizar os próprios dados permitidos, consultar informações de atendimento, realizar agendamentos e acompanhar/cancelar suas consultas conforme as regras da API.
- **Profissional:** pode gerenciar suas próprias disponibilidades e consultar os agendamentos permitidos ao seu perfil.
- **Administrador:** pode executar operações administrativas, incluindo cadastros protegidos, criação de acessos de profissionais e gerenciamento de agendamentos conforme as regras da API.

O cadastro público cria somente contas de pacientes. Contas de profissionais são criadas por um administrador e vinculadas a um registro de profissional existente. A interface pode ocultar opções conforme o perfil, mas a autorização efetiva é validada pelo backend.

## Segurança

- As senhas são armazenadas como **hashes gerados com bcryptjs**; não são guardadas em texto puro nem recuperadas por descriptografia.
- Durante o login, `bcrypt.compare()` verifica a senha informada em relação ao hash armazenado.
- A autenticação utiliza JWT, com validade configurada no backend.
- O frontend mantém o token em `sessionStorage` durante a sessão e o envia no cabeçalho `Authorization` nas requisições protegidas.
- As permissões são verificadas nas rotas do backend; controles visuais no frontend não substituem essas verificações.
- O arquivo `.env`, senhas, tokens, chaves JWT e strings de conexão não devem ser enviados ao GitHub nem compartilhados.

## PWA e funcionamento offline

O `manifest.json` contém os metadados de instalação, como nome, ícone e modo de exibição. O `service-worker.js` armazena em cache os arquivos estáticos principais da interface.

O suporte offline é **limitado à estrutura estática previamente carregada**. Login, acesso ao banco, consulta de dados, agendamentos, cancelamentos e demais operações da API exigem conexão com o backend. O Service Worker não armazena dados pessoais ou consultas para uso offline.

Em produção, o PWA deve ser acessado por HTTPS. Após alterações nos arquivos estáticos, atualize o navegador; se necessário, confira o registro e o cache do Service Worker em DevTools → Application.

## Testes manuais realizados

Durante o desenvolvimento, foram realizados testes manuais, incluindo:

- Login de administrador, profissional e paciente.
- Controle de permissões, incluindo resposta `403 Forbidden` para tentativa de operação administrativa por paciente.
- Cadastro de especialidade por administrador.
- Criação de conta vinculada a profissional.
- Cadastro de disponibilidade pelo profissional.
- Agendamento de consulta por paciente.
- Bloqueio de tentativa de agendar novamente o mesmo horário, com resposta `409 Conflict`.
- Listagem e cancelamento de consultas pela interface.
- Consulta de clínicas, especialidades e profissionais no frontend.
- Registro do Service Worker e abertura da aplicação como PWA.
- Testes do fluxo principal na versão publicada.

Esses testes foram manuais; este README não declara a existência de uma suíte automatizada de testes.

## Implantação

O projeto está publicado na plataforma Render em dois serviços:

- **Backend:** serviço Web que executa `node server.js` a partir da pasta `backend/`.
- **Frontend:** Static Site que publica os arquivos da pasta `frontend/`.

As variáveis de ambiente do backend são configuradas no painel de hospedagem. O arquivo `.env` local não é enviado ao repositório. O frontend utiliza a URL HTTPS pública da API definida em `frontend/app.js`.

## Observações

- Este projeto foi desenvolvido para fins acadêmicos como Projeto Integrador.
- O funcionamento das operações depende da disponibilidade do backend e do MongoDB.
- O cache do PWA não representa funcionamento completo offline.
- Ao alterar endpoints ou formatos de resposta da API, revise a integração no `frontend/app.js` e atualize a documentação Swagger e este README.
- Para executar o projeto em outro ambiente, configure suas próprias credenciais e variáveis; nunca reutilize ou exponha segredos em arquivos públicos.

---

**ClínAgenda — Projeto Integrador**

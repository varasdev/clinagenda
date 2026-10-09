# API do Projeto Integrador — Sistema de Agendamento de Consultas

## Sobre o projeto

Esta API faz parte de um Projeto Integrador e tem como objetivo gerenciar clínicas, especialidades médicas, profissionais de saúde, pacientes, disponibilidades de horários e agendamentos de consultas.

O backend disponibiliza endpoints REST, utiliza MongoDB para persistência de dados e implementa autenticação com JWT e controle de acesso conforme o perfil do usuário.

## Tecnologias utilizadas

* **Node.js** — execução do JavaScript no servidor.
* **Express** — criação da API REST.
* **MongoDB** — banco de dados NoSQL.
* **bcryptjs** — criptografia das senhas armazenadas.
* **JSON Web Token (JWT)** — autenticação e identificação dos usuários.
* **CORS** — configuração de acesso entre origens.
* **Swagger UI** — documentação interativa dos endpoints.
* **dotenv** — carregamento das variáveis de ambiente.

## Funcionalidades

* Cadastro público de pacientes.
* Login e autenticação de usuários.
* Controle de acesso para pacientes, profissionais e administradores.
* Cadastro e consulta de clínicas.
* Cadastro e consulta de especialidades.
* Cadastro e consulta de profissionais.
* Consulta e atualização de dados de pacientes conforme as permissões.
* Criação de contas de acesso para profissionais pelo administrador.
* Cadastro e consulta de disponibilidades.
* Agendamento e consulta de consultas médicas.
* Cancelamento de agendamentos.
* Validação de dados e prevenção de conflitos de horários.
* Documentação interativa da API com Swagger.

## Requisitos

Para executar o projeto localmente, são necessários:

* Node.js e npm instalados.
* Uma instância do MongoDB acessível.
* As variáveis de ambiente configuradas no arquivo `.env`.

## Instalação

1. Abra o terminal na pasta `backend`.
2. Instale as dependências:

```bash
npm install
```

3. Crie o arquivo `.env` na pasta `backend` e configure as variáveis necessárias.

Exemplo de configuração:

```env
MONGODB_URI=sua_string_de_conexao_mongodb
DB_NAME=nome_do_banco
PORT=3000
JWT_SECRET=sua_chave_secreta
```

Substitua os valores de exemplo pelos dados do seu ambiente. A variável `DB_NAME` pode ser omitida caso a configuração da conexão já determine o banco utilizado pelo projeto.

**Importante:** não compartilhe nem publique o arquivo `.env`, senhas, credenciais do banco ou chaves JWT.

## Como executar

Depois de instalar as dependências e configurar o `.env`, execute:

```bash
node server.js
```

Por padrão, a API utiliza a porta `3000`, caso outra porta não esteja configurada na variável `PORT`.

Se a conexão com o banco for estabelecida corretamente, o servidor deverá iniciar e ficará disponível em:

`http://localhost:3000`

Para verificar se a API está funcionando, acesse:

`http://localhost:3000/`

## Documentação da API

A documentação interativa está disponível pelo Swagger UI:

`http://localhost:3000/docs`

Nessa página, é possível consultar os endpoints, visualizar os parâmetros e os corpos das requisições e executar testes.

As rotas protegidas exigem um token JWT obtido pelo endpoint de login. No Swagger, utilize o botão **Authorize** para informar o token quando necessário.

## Principais endpoints

| Método | Endpoint                      | Descrição                             |
| ------ | ----------------------------- | ------------------------------------- |
| GET    | `/`                           | Verificar o funcionamento da API      |
| POST   | `/auth/register`              | Cadastrar paciente                    |
| POST   | `/auth/login`                 | Realizar login                        |
| GET    | `/auth/me`                    | Consultar usuário autenticado         |
| POST   | `/auth/usuarios/profissional` | Criar acesso de profissional          |
| GET    | `/clinicas`                   | Listar e filtrar clínicas             |
| POST   | `/clinicas`                   | Cadastrar clínica                     |
| GET    | `/especialidades`             | Listar especialidades                 |
| POST   | `/especialidades`             | Cadastrar especialidade               |
| GET    | `/profissionais`              | Listar e filtrar profissionais        |
| POST   | `/profissionais`              | Cadastrar profissional                |
| GET    | `/pacientes`                  | Listar pacientes                      |
| POST   | `/pacientes`                  | Cadastrar paciente pela administração |
| GET    | `/pacientes/:id`              | Consultar paciente por ID             |
| PUT    | `/pacientes/:id`              | Atualizar dados do paciente           |
| GET    | `/disponibilidades`           | Consultar disponibilidades            |
| POST   | `/disponibilidades`           | Cadastrar disponibilidade             |
| GET    | `/agendamentos`               | Listar agendamentos                   |
| POST   | `/agendamentos`               | Agendar consulta                      |
| GET    | `/agendamentos/:id`           | Consultar agendamento por ID          |
| PUT    | `/agendamentos/:id/cancelar`  | Cancelar agendamento                  |

A API também possui endpoints de teste de permissões em `/perfis`, utilizados para verificar o acesso conforme o perfil autenticado.

## Autenticação e permissões

A API utiliza JWT para autenticação. Após o login, o token deve ser enviado no cabeçalho das requisições protegidas:

```http
Authorization: Bearer SEU_TOKEN
```

As permissões são verificadas de acordo com o perfil do usuário.

* **Paciente:** pode consultar e atualizar os próprios dados conforme as regras implementadas, além de realizar e acompanhar seus agendamentos.
* **Profissional:** pode gerenciar suas próprias disponibilidades e consultar os agendamentos permitidos ao seu perfil.
* **Administrador:** pode realizar operações administrativas, incluindo cadastros protegidos e gerenciamento de agendamentos.

As rotas públicas de cadastro permitem criar apenas contas de pacientes. A criação de contas de profissionais é restrita ao administrador.

## Estrutura do backend

```text
backend/
├── config/
│   └── database.js
├── docs/
│   └── openapi.js
├── middlewares/
│   └── auth.js
├── routes/
│   ├── agendamentos.js
│   ├── auth.js
│   ├── clinicas.js
│   ├── disponibilidades.js
│   ├── especialidades.js
│   ├── pacientes.js
│   ├── perfis.js
│   └── profissionais.js
├── scripts/
│   └── criar-admin.js
├── .env
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

A estrutura acima representa os principais arquivos do backend. Os arquivos de configuração e dependências devem ser mantidos de acordo com o ambiente de execução.

## Testes realizados

Durante o desenvolvimento, foram realizados testes de requisições e permissões, incluindo:

* Login do administrador e do profissional.
* Bloqueio de cadastro administrativo para usuários com perfil de paciente.
* Cadastro de especialidades por administrador.
* Cadastro de disponibilidades por profissional.
* Agendamento de consultas por pacientes.
* Bloqueio de agendamentos duplicados para o mesmo horário.
* Verificação do funcionamento da API e da documentação Swagger.

## Observações

Este README documenta o backend. Informações sobre o frontend, a publicação da aplicação e os repositórios do projeto devem ser acrescentadas quando estiverem definidos.

---

**Projeto Integrador — API de Agendamento de Consultas**

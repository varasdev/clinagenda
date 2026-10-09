
const corpo = (nomeSchema) => ({
    required: true,
    content: {
        "application/json": {
            schema: {
                $ref: `#/components/schemas/${nomeSchema}`
            }
        }
    }
});

const resposta = (descricao) => ({ description: descricao });

const autenticacao = [{ bearerAuth: [] }];

const idParam = {
    name: "id",
    in: "path",
    required: true,
    description: "ID do registro.",
    schema: { type: "string" }
};

const openapi = {
    openapi: "3.0.3",

    info: {
        title: "API do Projeto Integrador",
        version: "1.0.0",
        description:
            "API para gerenciamento de clínicas, especialidades, profissionais, pacientes, disponibilidades e agendamentos. As rotas protegidas utilizam autenticação JWT."
    },

    servers: [
        {
            url: "http://localhost:3000",
            description: "Servidor local"
        }
    ],

    tags: [
        { name: "Sistema" },
        { name: "Autenticação" },
        { name: "Perfis" },
        { name: "Clínicas" },
        { name: "Especialidades" },
        { name: "Profissionais" },
        { name: "Pacientes" },
        { name: "Disponibilidades" },
        { name: "Agendamentos" }
    ],

    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Informe o token retornado pelo login."
            }
        },

        schemas: {
            Mensagem: {
                type: "object",
                properties: {
                    mensagem: { type: "string" }
                }
            },

            Login: {
                type: "object",
                required: ["email", "senha"],
                properties: {
                    email: { type: "string", format: "email" },
                    senha: { type: "string", format: "password" }
                }
            },

            RegistroPaciente: {
                type: "object",
                required: [
                    "nome",
                    "email",
                    "senha",
                    "cpf",
                    "dataNascimento",
                    "telefone"
                ],
                properties: {
                    nome: { type: "string" },
                    email: { type: "string", format: "email" },
                    senha: {
                        type: "string",
                        format: "password",
                        minLength: 8
                    },
                    cpf: { type: "string", example: "12345678900" },
                    dataNascimento: {
                        type: "string",
                        format: "date",
                        example: "1995-05-20"
                    },
                    telefone: { type: "string" },
                    endereco: { type: "string" }
                }
            },

            CriarAcessoProfissional: {
                type: "object",
                required: ["email", "senha", "profissionalId"],
                properties: {
                    email: { type: "string", format: "email" },
                    senha: {
                        type: "string",
                        format: "password",
                        minLength: 8
                    },
                    profissionalId: {
                        type: "string",
                        description: "ID de um profissional já cadastrado."
                    }
                }
            },

            Clinica: {
                type: "object",
                required: ["nome", "endereco", "telefone"],
                properties: {
                    nome: { type: "string" },
                    endereco: { type: "string" },
                    telefone: { type: "string" }
                }
            },

            Especialidade: {
                type: "object",
                required: ["nome"],
                properties: {
                    nome: { type: "string", example: "Cardiologia" }
                }
            },

            Profissional: {
                type: "object",
                required: [
                    "nome",
                    "registro",
                    "telefone",
                    "clinicaId",
                    "especialidadeId"
                ],
                properties: {
                    nome: { type: "string" },
                    registro: { type: "string" },
                    telefone: { type: "string" },
                    clinicaId: { type: "string" },
                    especialidadeId: { type: "string" }
                }
            },

            Paciente: {
                type: "object",
                required: [
                    "nome",
                    "cpf",
                    "dataNascimento",
                    "telefone",
                    "email",
                    "endereco"
                ],
                properties: {
                    nome: { type: "string" },
                    cpf: { type: "string" },
                    dataNascimento: { type: "string", format: "date" },
                    telefone: { type: "string" },
                    email: { type: "string", format: "email" },
                    endereco: { type: "string" }
                }
            },

            AtualizarPaciente: {
                type: "object",
                description: "Informe os campos que deseja atualizar.",
                properties: {
                    nome: { type: "string" },
                    cpf: { type: "string" },
                    dataNascimento: { type: "string", format: "date" },
                    telefone: { type: "string" },
                    email: { type: "string", format: "email" },
                    endereco: { type: "string" }
                }
            },

            Disponibilidade: {
                type: "object",
                required: [
                    "profissionalId",
                    "diaSemana",
                    "horaInicio",
                    "horaFim"
                ],
                properties: {
                    profissionalId: { type: "string" },
                    diaSemana: {
                        type: "string",
                        example: "terça"
                    },
                    horaInicio: {
                        type: "string",
                        example: "08:00"
                    },
                    horaFim: {
                        type: "string",
                        example: "12:00"
                    }
                }
            },

            Agendamento: {
                type: "object",
                required: ["profissionalId", "data", "hora"],
                properties: {
                    profissionalId: { type: "string" },
                    data: {
                        type: "string",
                        format: "date",
                        example: "2026-10-13"
                    },
                    hora: {
                        type: "string",
                        example: "08:30"
                    }
                }
            }
        }
    },

    paths: {
        "/": {
            get: {
                tags: ["Sistema"],
                summary: "Verificar se a API está funcionando",
                responses: {
                    "200": resposta("API disponível.")
                }
            }
        },

        "/auth/register": {
            post: {
                tags: ["Autenticação"],
                summary: "Cadastrar paciente",
                description: "Cadastro público disponível somente para pacientes.",
                requestBody: corpo("RegistroPaciente"),
                responses: {
                    "201": resposta("Paciente e conta criados."),
                    "400": resposta("Dados inválidos."),
                    "403": resposta("Perfil público não permitido."),
                    "409": resposta("Email ou CPF já cadastrado.")
                }
            }
        },

        "/auth/login": {
            post: {
                tags: ["Autenticação"],
                summary: "Entrar no sistema",
                requestBody: corpo("Login"),
                responses: {
                    "200": {
                        description: "Login realizado. Retorna o token JWT e os dados do usuário.",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        mensagem: { type: "string" },
                                        token: { type: "string" },
                                        usuario: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                nome: { type: "string" },
                                                email: { type: "string" },
                                                perfil: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": resposta("Dados obrigatórios ausentes."),
                    "401": resposta("Email ou senha incorretos.")
                }
            }
        },

        "/auth/me": {
            get: {
                tags: ["Autenticação"],
                summary: "Consultar usuário autenticado",
                security: autenticacao,
                responses: {
                    "200": resposta("Usuário autenticado."),
                    "401": resposta("Token ausente ou inválido.")
                }
            }
        },

        "/auth/usuarios/profissional": {
            post: {
                tags: ["Autenticação"],
                summary: "Criar acesso para profissional",
                description: "Apenas o administrador pode criar essa conta.",
                security: autenticacao,
                requestBody: corpo("CriarAcessoProfissional"),
                responses: {
                    "201": resposta("Acesso criado."),
                    "400": resposta("Dados inválidos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Somente administradores."),
                    "404": resposta("Profissional não encontrado."),
                    "409": resposta("Email ou conta já existente.")
                }
            }
        },

        "/perfis/paciente": {
            get: {
                tags: ["Perfis"],
                summary: "Testar acesso do paciente",
                security: autenticacao,
                responses: {
                    "200": resposta("Acesso autorizado."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Perfil sem permissão.")
                }
            }
        },

        "/perfis/profissional": {
            get: {
                tags: ["Perfis"],
                summary: "Testar acesso do profissional",
                security: autenticacao,
                responses: {
                    "200": resposta("Acesso autorizado."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Perfil sem permissão.")
                }
            }
        },

        "/perfis/administrador": {
            get: {
                tags: ["Perfis"],
                summary: "Testar acesso do administrador",
                security: autenticacao,
                responses: {
                    "200": resposta("Acesso autorizado."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Perfil sem permissão.")
                }
            }
        },

        "/clinicas": {
            get: {
                tags: ["Clínicas"],
                summary: "Listar e filtrar clínicas",
                parameters: [
                    {
                        name: "nome",
                        in: "query",
                        schema: { type: "string" }
                    },
                    {
                        name: "endereco",
                        in: "query",
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": resposta("Lista de clínicas.")
                }
            },

            post: {
                tags: ["Clínicas"],
                summary: "Cadastrar clínica",
                security: autenticacao,
                requestBody: corpo("Clinica"),
                responses: {
                    "201": resposta("Clínica criada."),
                    "400": resposta("Dados inválidos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Somente administradores.")
                }
            }
        },

        "/especialidades": {
            get: {
                tags: ["Especialidades"],
                summary: "Listar especialidades",
                responses: {
                    "200": resposta("Lista de especialidades.")
                }
            },

            post: {
                tags: ["Especialidades"],
                summary: "Cadastrar especialidade",
                security: autenticacao,
                requestBody: corpo("Especialidade"),
                responses: {
                    "201": resposta("Especialidade criada."),
                    "400": resposta("Dados inválidos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Somente administradores."),
                    "409": resposta("Especialidade já cadastrada.")
                }
            }
        },

        "/profissionais": {
            get: {
                tags: ["Profissionais"],
                summary: "Listar e filtrar profissionais",
                parameters: [
                    { name: "nome", in: "query", schema: { type: "string" } },
                    { name: "clinica", in: "query", schema: { type: "string" } },
                    { name: "especialidade", in: "query", schema: { type: "string" } },
                    { name: "clinicaId", in: "query", schema: { type: "string" } },
                    { name: "especialidadeId", in: "query", schema: { type: "string" } }
                ],
                responses: {
                    "200": resposta("Lista de profissionais.")
                }
            },

            post: {
                tags: ["Profissionais"],
                summary: "Cadastrar profissional",
                security: autenticacao,
                requestBody: corpo("Profissional"),
                responses: {
                    "201": resposta("Profissional criado."),
                    "400": resposta("Dados ou IDs inválidos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Somente administradores."),
                    "404": resposta("Clínica ou especialidade não encontrada."),
                    "409": resposta("Registro profissional já cadastrado.")
                }
            }
        },

        "/pacientes": {
            get: {
                tags: ["Pacientes"],
                summary: "Listar pacientes",
                security: autenticacao,
                responses: {
                    "200": resposta("Lista de pacientes."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Somente administradores.")
                }
            },

            post: {
                tags: ["Pacientes"],
                summary: "Cadastrar paciente pela administração",
                security: autenticacao,
                requestBody: corpo("Paciente"),
                responses: {
                    "201": resposta("Paciente criado."),
                    "400": resposta("Dados inválidos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Somente administradores."),
                    "409": resposta("CPF ou email já cadastrado.")
                }
            }
        },

        "/pacientes/{id}": {
            get: {
                tags: ["Pacientes"],
                summary: "Consultar paciente por ID",
                security: autenticacao,
                parameters: [idParam],
                responses: {
                    "200": resposta("Dados do paciente."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Sem permissão para consultar este paciente."),
                    "404": resposta("Paciente não encontrado.")
                }
            },

            put: {
                tags: ["Pacientes"],
                summary: "Atualizar dados do paciente",
                description: "O paciente pode atualizar seus próprios dados permitidos; o administrador tem acesso administrativo.",
                security: autenticacao,
                parameters: [idParam],
                requestBody: corpo("AtualizarPaciente"),
                responses: {
                    "200": resposta("Paciente atualizado."),
                    "400": resposta("Dados inválidos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Sem permissão."),
                    "404": resposta("Paciente não encontrado."),
                    "409": resposta("CPF ou email já utilizado.")
                }
            }
        },

        "/disponibilidades": {
            get: {
                tags: ["Disponibilidades"],
                summary: "Consultar disponibilidades",
                security: autenticacao,
                parameters: [
                    {
                        name: "profissionalId",
                        in: "query",
                        schema: { type: "string" },
                        description: "Filtrar disponibilidades por profissional."
                    }
                ],
                responses: {
                    "200": resposta("Lista de disponibilidades."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Sem permissão.")
                }
            },

            post: {
                tags: ["Disponibilidades"],
                summary: "Cadastrar disponibilidade",
                description: "Permitido ao profissional para seus próprios horários ou ao administrador.",
                security: autenticacao,
                requestBody: corpo("Disponibilidade"),
                responses: {
                    "201": resposta("Disponibilidade criada."),
                    "400": resposta("Dados ou horários inválidos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Sem permissão para este profissional."),
                    "404": resposta("Profissional não encontrado."),
                    "409": resposta("Horário sobreposto.")
                }
            }
        },

        "/agendamentos": {
            get: {
                tags: ["Agendamentos"],
                summary: "Listar agendamentos",
                description: "Os resultados são limitados conforme o perfil autenticado.",
                security: autenticacao,
                parameters: [
                    {
                        name: "status",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: ["agendado", "cancelado"]
                        }
                    }
                ],
                responses: {
                    "200": resposta("Lista de agendamentos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Sem permissão.")
                }
            },

            post: {
                tags: ["Agendamentos"],
                summary: "Agendar consulta",
                description: "O paciente autenticado agenda a consulta para si mesmo.",
                security: autenticacao,
                requestBody: corpo("Agendamento"),
                responses: {
                    "201": resposta("Consulta agendada."),
                    "400": resposta("Data, horário ou dados inválidos."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Somente pacientes podem agendar."),
                    "404": resposta("Profissional ou disponibilidade não encontrada."),
                    "409": resposta("Horário ocupado ou conflito de agendamento.")
                }
            }
        },

        "/agendamentos/{id}": {
            get: {
                tags: ["Agendamentos"],
                summary: "Consultar agendamento por ID",
                security: autenticacao,
                parameters: [idParam],
                responses: {
                    "200": resposta("Dados do agendamento."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Sem permissão para consultar."),
                    "404": resposta("Agendamento não encontrado.")
                }
            }
        },

        "/agendamentos/{id}/cancelar": {
            put: {
                tags: ["Agendamentos"],
                summary: "Cancelar agendamento",
                description: "O paciente ou profissional responsável, ou um administrador, pode cancelar conforme as regras de acesso.",
                security: autenticacao,
                parameters: [idParam],
                responses: {
                    "200": resposta("Agendamento cancelado."),
                    "401": resposta("Não autenticado."),
                    "403": resposta("Sem permissão para cancelar."),
                    "404": resposta("Agendamento não encontrado."),
                    "409": resposta("Agendamento já cancelado ou não está mais ativo.")
                }
            }
        }
    }
};

module.exports = openapi;
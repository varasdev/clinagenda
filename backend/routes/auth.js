
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getBanco } = require("../config/database");
const { autenticar, permitirPerfis } = require("../middlewares/auth");
const { ObjectId } = require("mongodb");

const router = express.Router();

// ==========================================
// CADASTRO PÚBLICO: SOMENTE PACIENTES
// ==========================================
router.post("/register", async (req, res) => {
    let pacienteCriadoId = null;

    try {
        const {
            nome,
            email,
            senha,
            cpf,
            dataNascimento,
            telefone,
            endereco = ""
        } = req.body;

        // Impede a escolha pública de outros perfis
        if (
            req.body.perfil !== undefined &&
            req.body.perfil !== "paciente"
        ) {
            return res.status(403).json({
                mensagem: "O cadastro público está disponível apenas para pacientes."
            });
        }

        // Os vínculos são definidos pelo servidor, nunca por IDs enviados pelo cliente
        if (
            req.body.pacienteId !== undefined ||
            req.body.profissionalId !== undefined
        ) {
            return res.status(400).json({
                mensagem: "Não envie pacienteId ou profissionalId no cadastro."
            });
        }

        if (
            typeof nome !== "string" ||
            !nome.trim() ||
            typeof email !== "string" ||
            typeof senha !== "string" ||
            typeof cpf !== "string" ||
            typeof dataNascimento !== "string" ||
            typeof telefone !== "string" ||
            !telefone.trim()
        ) {
            return res.status(400).json({
                mensagem: "Nome, email, senha, CPF, data de nascimento e telefone são obrigatórios."
            });
        }

        const nomeNormalizado = nome.trim();
        const emailNormalizado = email.trim().toLowerCase();
        const cpfNormalizado = cpf.replace(/\D/g, "");

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
            return res.status(400).json({
                mensagem: "Email inválido."
            });
        }

        if (senha.length < 8) {
            return res.status(400).json({
                mensagem: "A senha deve ter pelo menos 8 caracteres."
            });
        }

        if (cpfNormalizado.length !== 11) {
            return res.status(400).json({
                mensagem: "O CPF deve conter 11 dígitos."
            });
        }

        const dataNascimentoObj = new Date(
            `${dataNascimento}T00:00:00.000Z`
        );

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento) ||
            Number.isNaN(dataNascimentoObj.getTime()) ||
            dataNascimentoObj.toISOString().slice(0, 10) !== dataNascimento ||
            dataNascimentoObj > new Date()
        ) {
            return res.status(400).json({
                mensagem: "Data de nascimento inválida. Use YYYY-MM-DD."
            });
        }

        const banco = getBanco();

        // Verifica se o email já pertence a uma conta
        const usuarioExistente = await banco
            .collection("usuarios")
            .findOne({ email: emailNormalizado });

        if (usuarioExistente) {
            return res.status(409).json({
                mensagem: "Já existe um usuário cadastrado com este email."
            });
        }

        // Se o paciente já existe, só permite vincular com os dados correspondentes
        let paciente = await banco
            .collection("pacientes")
            .findOne({ cpf: cpfNormalizado });

        let pacienteId;

        if (paciente) {
            const mesmoEmail =
                paciente.email?.trim().toLowerCase() === emailNormalizado;

            const mesmoNome =
                paciente.nome?.trim().toLowerCase() ===
                nomeNormalizado.toLowerCase();

            if (!mesmoEmail || !mesmoNome) {
                return res.status(409).json({
                    mensagem: "Este CPF já está cadastrado. Confira os dados ou procure a administração."
                });
            }

            pacienteId = paciente._id;
        } else {
            // Evita criar dois pacientes com o mesmo email
            const pacienteComEmail = await banco
                .collection("pacientes")
                .findOne({ email: emailNormalizado });

            if (pacienteComEmail) {
                return res.status(409).json({
                    mensagem: "Este email já está associado a outro cadastro de paciente."
                });
            }

            const novoPaciente = {
                nome: nomeNormalizado,
                cpf: cpfNormalizado,
                dataNascimento,
                telefone: telefone.trim(),
                email: emailNormalizado,
                endereco: typeof endereco === "string" ? endereco.trim() : "",
                criadoEm: new Date()
            };

            const resultadoPaciente = await banco
                .collection("pacientes")
                .insertOne(novoPaciente);

            pacienteId = resultadoPaciente.insertedId;
            pacienteCriadoId = pacienteId;
        }

        // A senha nunca é armazenada em texto puro
        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = {
            nome: nomeNormalizado,
            email: emailNormalizado,
            senha: senhaHash,
            perfil: "paciente",
            pacienteId,
            profissionalId: null,
            criadoEm: new Date()
        };

        try {
            const resultadoUsuario = await banco
                .collection("usuarios")
                .insertOne(usuario);

            return res.status(201).json({
                mensagem: "Paciente e usuário cadastrados com sucesso!",
                id: resultadoUsuario.insertedId,
                pacienteId,
                perfil: "paciente"
            });
        } catch (erro) {
            // Evita deixar um paciente órfão se a criação da conta falhar
            if (pacienteCriadoId) {
                await banco.collection("pacientes").deleteOne({
                    _id: pacienteCriadoId
                });
            }

            throw erro;
        }
    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            mensagem: "Erro ao cadastrar usuário."
        });
    }
});

// ==========================================
// LOGIN
// ==========================================
router.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (
            typeof email !== "string" ||
            typeof senha !== "string" ||
            !email.trim() ||
            !senha
        ) {
            return res.status(400).json({
                mensagem: "Email e senha são obrigatórios."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET não configurado.");
            return res.status(500).json({
                mensagem: "Configuração de autenticação indisponível."
            });
        }

        const banco = getBanco();

        const usuario = await banco
            .collection("usuarios")
            .findOne({
                email: email.trim().toLowerCase()
            });

        if (!usuario) {
            return res.status(401).json({
                mensagem: "Email ou senha incorretos."
            });
        }

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "Email ou senha incorretos."
            });
        }

        const token = jwt.sign(
            {
                id: usuario._id.toString(),
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                pacienteId: usuario.pacienteId
                    ? usuario.pacienteId.toString()
                    : null,
                profissionalId: usuario.profissionalId
                    ? usuario.profissionalId.toString()
                    : null
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        return res.json({
            mensagem: "Login realizado com sucesso!",
            token,
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        });
    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            mensagem: "Erro ao realizar login."
        });
    }
});

// ==========================================
// CRIAR ACESSO PARA PROFISSIONAL
// SOMENTE ADMINISTRADOR
// ==========================================

router.post(
    "/usuarios/profissional",
    autenticar,
    permitirPerfis("administrador"),
    async (req, res) => {
        try {
            const { email, senha, profissionalId } = req.body;

            if (
                typeof email !== "string" ||
                typeof senha !== "string" ||
                typeof profissionalId !== "string" ||
                !email.trim() ||
                !senha
            ) {
                return res.status(400).json({
                    mensagem: "Email, senha e profissionalId são obrigatórios."
                });
            }

            const emailNormalizado = email.trim().toLowerCase();

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
                return res.status(400).json({
                    mensagem: "Email inválido."
                });
            }

            if (senha.length < 8) {
                return res.status(400).json({
                    mensagem: "A senha deve ter pelo menos 8 caracteres."
                });
            }

            if (!/^[a-fA-F0-9]{24}$/.test(profissionalId)) {
                return res.status(400).json({
                    mensagem: "ID do profissional inválido."
                });
            }

            const banco = getBanco();
            const idProfissional = new ObjectId(profissionalId);

            const profissional = await banco
                .collection("profissionais")
                .findOne({ _id: idProfissional });

            if (!profissional) {
                return res.status(404).json({
                    mensagem: "Profissional não encontrado."
                });
            }

            const usuarios = banco.collection("usuarios");

            const emailExistente = await usuarios.findOne({
                email: emailNormalizado
            });

            if (emailExistente) {
                return res.status(409).json({
                    mensagem: "Já existe uma conta com este email."
                });
            }

            const contaExistente = await usuarios.findOne({
                profissionalId: idProfissional
            });

            if (contaExistente) {
                return res.status(409).json({
                    mensagem: "Este profissional já possui uma conta."
                });
            }

            const senhaHash = await bcrypt.hash(senha, 10);

            const novoUsuario = {
                nome: profissional.nome,
                email: emailNormalizado,
                senha: senhaHash,
                perfil: "profissional",
                pacienteId: null,
                profissionalId: idProfissional,
                criadoEm: new Date()
            };

            const resultado = await usuarios.insertOne(novoUsuario);

            return res.status(201).json({
                mensagem: "Acesso do profissional criado com sucesso!",
                usuario: {
                    id: resultado.insertedId.toString(),
                    nome: profissional.nome,
                    email: emailNormalizado,
                    perfil: "profissional",
                    profissionalId: idProfissional.toString()
                }
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao criar acesso do profissional."
            });
        }
    }
);

// ==========================================
// USUÁRIO AUTENTICADO
// ==========================================
router.get("/me", autenticar, (req, res) => {
    res.json({
        mensagem: "Usuário autenticado com sucesso!",
        usuario: req.usuario
    });
});

module.exports = router;
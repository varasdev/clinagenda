const express = require("express");
const { ObjectId } = require("mongodb");
const { getBanco } = require("../config/database");

const {
    autenticar,
    permitirPerfis
} = require("../middlewares/auth");

const router = express.Router();

function dataValida(data) {
    if (
        typeof data !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data)
    ) {
        return false;
    }

    const d = new Date(`${data}T00:00:00.000Z`);

    return (
        !Number.isNaN(d.getTime()) &&
        d.toISOString().slice(0, 10) === data &&
        d <= new Date()
    );
}

function cpfNormalizado(cpf) {
    return typeof cpf === "string"
        ? cpf.replace(/\D/g, "")
        : "";
}

// ==========================================
// CADASTRAR PACIENTE
// Somente administrador
// O cadastro público é feito por /auth/register
// ==========================================
router.post(
    "/",
    autenticar,
    permitirPerfis("administrador"),
    async (req, res) => {
        try {
            const {
                nome,
                cpf,
                dataNascimento,
                telefone,
                email,
                endereco = ""
            } = req.body;

            if (
                typeof nome !== "string" ||
                !nome.trim() ||
                typeof telefone !== "string" ||
                !telefone.trim() ||
                typeof email !== "string" ||
                !email.trim() ||
                !dataValida(dataNascimento) ||
                cpfNormalizado(cpf).length !== 11 ||
                typeof endereco !== "string"
            ) {
                return res.status(400).json({
                    mensagem: "Confira nome, CPF, data de nascimento, telefone, email e endereço."
                });
            }

            const banco = getBanco();
            const cpfLimpo = cpfNormalizado(cpf);
            const emailLimpo = email.trim().toLowerCase();

            const existente = await banco
                .collection("pacientes")
                .findOne({
                    $or: [
                        { cpf: cpfLimpo },
                        { email: emailLimpo }
                    ]
                });

            if (existente) {
                return res.status(409).json({
                    mensagem: "Já existe um paciente com este CPF ou email."
                });
            }

            const paciente = {
                nome: nome.trim(),
                cpf: cpfLimpo,
                dataNascimento,
                telefone: telefone.trim(),
                email: emailLimpo,
                endereco: endereco.trim(),
                criadoEm: new Date()
            };

            const resultado = await banco
                .collection("pacientes")
                .insertOne(paciente);

            return res.status(201).json({
                mensagem: "Paciente cadastrado com sucesso!",
                id: resultado.insertedId,
                paciente: {
                    ...paciente,
                    _id: resultado.insertedId
                }
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao cadastrar paciente."
            });
        }
    }
);

// ==========================================
// LISTAR TODOS OS PACIENTES
// Somente administrador
// ==========================================
router.get(
    "/",
    autenticar,
    permitirPerfis("administrador"),
    async (req, res) => {
        try {
            const banco = getBanco();

            const pacientes = await banco
                .collection("pacientes")
                .find()
                .sort({ nome: 1 })
                .toArray();

            return res.json(pacientes);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao consultar pacientes."
            });
        }
    }
);

// ==========================================
// CONSULTAR PACIENTE POR ID
// Paciente: próprio cadastro
// Profissional: paciente com agendamento vinculado
// Administrador: qualquer paciente
// ==========================================
router.get(
    "/:id",
    autenticar,
    permitirPerfis("paciente", "profissional", "administrador"),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    mensagem: "ID do paciente inválido."
                });
            }

            const banco = getBanco();
            const pacienteObjectId = new ObjectId(id);

            const paciente = await banco
                .collection("pacientes")
                .findOne({ _id: pacienteObjectId });

            if (!paciente) {
                return res.status(404).json({
                    mensagem: "Paciente não encontrado."
                });
            }

            if (req.usuario.perfil === "paciente") {
                if (
                    !req.usuario.pacienteId ||
                    req.usuario.pacienteId.toString() !== id
                ) {
                    return res.status(403).json({
                        mensagem: "Você só pode consultar seus próprios dados."
                    });
                }
            }

            if (req.usuario.perfil === "profissional") {
                const profissionalId = req.usuario.profissionalId;

                if (!profissionalId || !ObjectId.isValid(profissionalId)) {
                    return res.status(403).json({
                        mensagem: "Esta conta não está vinculada a um profissional."
                    });
                }

                const agendamento = await banco
                    .collection("agendamentos")
                    .findOne({
                        pacienteId: pacienteObjectId,
                        profissionalId: new ObjectId(profissionalId)
                    });

                if (!agendamento) {
                    return res.status(403).json({
                        mensagem: "Você não tem acesso aos dados deste paciente."
                    });
                }
            }

            return res.json(paciente);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao consultar paciente."
            });
        }
    }
);

// ==========================================
// ALTERAR PACIENTE
// Administrador: todos os campos
// Paciente: nome, telefone e endereço próprios
// ==========================================
router.put(
    "/:id",
    autenticar,
    permitirPerfis("paciente", "administrador"),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    mensagem: "ID do paciente inválido."
                });
            }

            const banco = getBanco();
            const pacienteObjectId = new ObjectId(id);

            const paciente = await banco
                .collection("pacientes")
                .findOne({ _id: pacienteObjectId });

            if (!paciente) {
                return res.status(404).json({
                    mensagem: "Paciente não encontrado."
                });
            }

            const ehAdministrador =
                req.usuario.perfil === "administrador";

            if (!ehAdministrador) {
                if (
                    !req.usuario.pacienteId ||
                    req.usuario.pacienteId.toString() !== id
                ) {
                    return res.status(403).json({
                        mensagem: "Você só pode alterar seus próprios dados."
                    });
                }
            }

            const camposPermitidos = ehAdministrador
                ? [
                    "nome",
                    "cpf",
                    "dataNascimento",
                    "telefone",
                    "email",
                    "endereco"
                ]
                : ["nome", "telefone", "endereco"];

            const atualizacoes = {};

            for (const campo of camposPermitidos) {
                if (req.body[campo] !== undefined) {
                    if (
                        typeof req.body[campo] !== "string" ||
                        !req.body[campo].trim()
                    ) {
                        return res.status(400).json({
                            mensagem: `O campo ${campo} deve ser um texto não vazio.`
                        });
                    }

                    atualizacoes[campo] = req.body[campo].trim();
                }
            }

            if (Object.keys(atualizacoes).length === 0) {
                return res.status(400).json({
                    mensagem: "Nenhum campo permitido foi enviado."
                });
            }

            if (atualizacoes.cpf !== undefined) {
                atualizacoes.cpf = cpfNormalizado(atualizacoes.cpf);

                if (atualizacoes.cpf.length !== 11) {
                    return res.status(400).json({
                        mensagem: "O CPF deve conter 11 dígitos."
                    });
                }

                const outroCpf = await banco
                    .collection("pacientes")
                    .findOne({
                        cpf: atualizacoes.cpf,
                        _id: { $ne: pacienteObjectId }
                    });

                if (outroCpf) {
                    return res.status(409).json({
                        mensagem: "Este CPF já pertence a outro paciente."
                    });
                }
            }

            if (
                atualizacoes.dataNascimento !== undefined &&
                !dataValida(atualizacoes.dataNascimento)
            ) {
                return res.status(400).json({
                    mensagem: "Data de nascimento inválida."
                });
            }

            if (atualizacoes.email !== undefined) {
                atualizacoes.email =
                    atualizacoes.email.toLowerCase();

                if (
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                        atualizacoes.email
                    )
                ) {
                    return res.status(400).json({
                        mensagem: "Email inválido."
                    });
                }

                const outroEmail = await banco
                    .collection("pacientes")
                    .findOne({
                        email: atualizacoes.email,
                        _id: { $ne: pacienteObjectId }
                    });

                if (outroEmail) {
                    return res.status(409).json({
                        mensagem: "Este email já pertence a outro paciente."
                    });
                }
            }

            atualizacoes.atualizadoEm = new Date();

            await banco
                .collection("pacientes")
                .updateOne(
                    { _id: pacienteObjectId },
                    { $set: atualizacoes }
                );

            // Mantém nome/email da conta alinhados ao cadastro do paciente
            const usuarioVinculado = await banco
                .collection("usuarios")
                .findOne({
                    $or: [
                        { pacienteId: pacienteObjectId },
                        { pacienteId: id }
                    ]
                });

            if (usuarioVinculado) {
                const dadosUsuario = {};

                if (atualizacoes.nome !== undefined) {
                    dadosUsuario.nome = atualizacoes.nome;
                }

                if (
                    ehAdministrador &&
                    atualizacoes.email !== undefined
                ) {
                    const emailEmUso = await banco
                        .collection("usuarios")
                        .findOne({
                            email: atualizacoes.email,
                            _id: { $ne: usuarioVinculado._id }
                        });

                    if (emailEmUso) {
                        return res.status(409).json({
                            mensagem: "Este email já está sendo usado por outra conta."
                        });
                    }

                    dadosUsuario.email = atualizacoes.email;
                }

                if (Object.keys(dadosUsuario).length > 0) {
                    await banco
                        .collection("usuarios")
                        .updateOne(
                            { _id: usuarioVinculado._id },
                            { $set: dadosUsuario }
                        );
                }
            }

            return res.json({
                mensagem: "Paciente atualizado com sucesso!"
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao atualizar paciente."
            });
        }
    }
);

module.exports = router;
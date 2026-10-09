
const express = require("express");
const { ObjectId } = require("mongodb");

const { getBanco } = require("../config/database");
const {
    autenticar,
    permitirPerfis
} = require("../middlewares/auth");

const router = express.Router();

const PERFIS_AGENDAMENTO = [
    "paciente",
    "profissional",
    "administrador"
];

const STATUS_VALIDOS = ["agendado", "cancelado"];

// ==========================================
// VALIDAÇÕES
// ==========================================

function idValido(id) {
    return typeof id === "string" && ObjectId.isValid(id);
}

function dataValida(data) {
    if (
        typeof data !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data)
    ) {
        return false;
    }

    const [ano, mes, dia] = data.split("-").map(Number);

    if (ano < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
        return false;
    }

    const dataUTC = new Date(Date.UTC(ano, mes - 1, dia));

    return (
        dataUTC.getUTCFullYear() === ano &&
        dataUTC.getUTCMonth() === mes - 1 &&
        dataUTC.getUTCDate() === dia
    );
}

function horaValida(hora) {
    return (
        typeof hora === "string" &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora)
    );
}

function descobrirDiaSemana(data) {
    const dias = [
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado"
    ];

    const dataObj = new Date(`${data}T12:00:00Z`);

    return dias[dataObj.getUTCDay()];
}

function pertenceAoPaciente(agendamento, usuario) {
    return (
        Boolean(usuario.pacienteId) &&
        agendamento.pacienteId.toString() ===
            usuario.pacienteId.toString()
    );
}

function pertenceAoProfissional(agendamento, usuario) {
    return (
        Boolean(usuario.profissionalId) &&
        agendamento.profissionalId.toString() ===
            usuario.profissionalId.toString()
    );
}

function podeAcessarAgendamento(agendamento, usuario) {
    if (usuario.perfil === "administrador") {
        return true;
    }

    if (usuario.perfil === "paciente") {
        return pertenceAoPaciente(agendamento, usuario);
    }

    if (usuario.perfil === "profissional") {
        return pertenceAoProfissional(agendamento, usuario);
    }

    return false;
}


// ==========================================
// CRIAR AGENDAMENTO
// Somente pacientes autenticados
// ==========================================

router.post(
    "/",
    autenticar,
    permitirPerfis("paciente"),
    async (req, res) => {
        try {
            const {
                profissionalId,
                data,
                hora,
                observacoes = ""
            } = req.body;

            if (!profissionalId || !data || !hora) {
                return res.status(400).json({
                    mensagem:
                        "Profissional, data e hora são obrigatórios."
                });
            }

            if (!idValido(profissionalId)) {
                return res.status(400).json({
                    mensagem: "ID do profissional inválido."
                });
            }

            if (!dataValida(data)) {
                return res.status(400).json({
                    mensagem:
                        "Data inválida. Use uma data real no formato YYYY-MM-DD."
                });
            }

            if (!horaValida(hora)) {
                return res.status(400).json({
                    mensagem:
                        "Horário inválido. Use o formato HH:MM."
                });
            }

            if (
                typeof observacoes !== "string" ||
                observacoes.length > 1000
            ) {
                return res.status(400).json({
                    mensagem:
                        "As observações devem ser um texto de até 1000 caracteres."
                });
            }

            const pacienteId = req.usuario.pacienteId;

            if (!idValido(pacienteId)) {
                return res.status(400).json({
                    mensagem:
                        "Sua conta não está vinculada a um paciente válido."
                });
            }

            // Rejeita datas e horários passados.
            // A comparação usa o fuso horário local do servidor.
            const dataHoraEscolhida = new Date(`${data}T${hora}:00`);

            if (
                Number.isNaN(dataHoraEscolhida.getTime()) ||
                dataHoraEscolhida <= new Date()
            ) {
                return res.status(400).json({
                    mensagem:
                        "Não é possível agendar para uma data ou horário passado."
                });
            }

            const banco = getBanco();

            const pacienteObjectId = new ObjectId(pacienteId);
            const profissionalObjectId = new ObjectId(profissionalId);

            const paciente = await banco
                .collection("pacientes")
                .findOne({ _id: pacienteObjectId });

            if (!paciente) {
                return res.status(404).json({
                    mensagem: "Paciente não encontrado."
                });
            }

            const profissional = await banco
                .collection("profissionais")
                .findOne({ _id: profissionalObjectId });

            if (!profissional) {
                return res.status(404).json({
                    mensagem: "Profissional não encontrado."
                });
            }

            const diaSemana = descobrirDiaSemana(data);

            const disponibilidades = await banco
                .collection("disponibilidades")
                .find({
                    profissionalId: profissionalObjectId,
                    diaSemana
                })
                .toArray();

            if (disponibilidades.length === 0) {
                return res.status(400).json({
                    mensagem:
                        "O profissional não possui disponibilidade nesse dia."
                });
            }

            const horarioDisponivel = disponibilidades.some(
                disponibilidade =>
                    hora >= disponibilidade.horaInicio &&
                    hora < disponibilidade.horaFim
            );

            if (!horarioDisponivel) {
                return res.status(400).json({
                    mensagem:
                        "O horário escolhido não está dentro da disponibilidade do profissional."
                });
            }

            const filtroConflitoProfissional = {
                profissionalId: profissionalObjectId,
                data,
                hora,
                status: "agendado"
            };

            const conflitoProfissional = await banco
                .collection("agendamentos")
                .findOne(filtroConflitoProfissional);

            if (conflitoProfissional) {
                return res.status(409).json({
                    mensagem:
                        "Esse horário já está ocupado para o profissional."
                });
            }

            const conflitoPaciente = await banco
                .collection("agendamentos")
                .findOne({
                    pacienteId: pacienteObjectId,
                    data,
                    hora,
                    status: "agendado"
                });

            if (conflitoPaciente) {
                return res.status(409).json({
                    mensagem:
                        "O paciente já possui um agendamento nesse horário."
                });
            }

            const agendamento = {
                pacienteId: pacienteObjectId,
                profissionalId: profissionalObjectId,
                data,
                hora,
                observacoes: observacoes.trim(),
                status: "agendado",
                criadoEm: new Date()
            };

            const resultado = await banco
                .collection("agendamentos")
                .insertOne(agendamento);

            return res.status(201).json({
                mensagem: "Agendamento realizado com sucesso!",
                id: resultado.insertedId,
                agendamento: {
                    ...agendamento,
                    _id: resultado.insertedId
                }
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao realizar agendamento."
            });
        }
    }
);


// ==========================================
// LISTAR AGENDAMENTOS
// Pacientes e profissionais veem os próprios.
// Administradores podem ver todos.
// ==========================================

router.get(
    "/",
    autenticar,
    permitirPerfis(...PERFIS_AGENDAMENTO),
    async (req, res) => {
        try {
            const banco = getBanco();
            const filtro = {};

            if (req.usuario.perfil === "paciente") {
                if (!idValido(req.usuario.pacienteId)) {
                    return res.status(400).json({
                        mensagem:
                            "Sua conta não está vinculada a um paciente válido."
                    });
                }

                filtro.pacienteId = new ObjectId(
                    req.usuario.pacienteId
                );
            }

            if (req.usuario.perfil === "profissional") {
                if (!idValido(req.usuario.profissionalId)) {
                    return res.status(400).json({
                        mensagem:
                            "Sua conta não está vinculada a um profissional válido."
                    });
                }

                filtro.profissionalId = new ObjectId(
                    req.usuario.profissionalId
                );
            }

            if (req.query.status) {
                if (!STATUS_VALIDOS.includes(req.query.status)) {
                    return res.status(400).json({
                        mensagem:
                            "Status inválido. Use 'agendado' ou 'cancelado'."
                    });
                }

                filtro.status = req.query.status;
            }

            const agendamentos = await banco
                .collection("agendamentos")
                .aggregate([
                    { $match: filtro },
                    {
                        $lookup: {
                            from: "pacientes",
                            localField: "pacienteId",
                            foreignField: "_id",
                            as: "paciente"
                        }
                    },
                    {
                        $lookup: {
                            from: "profissionais",
                            localField: "profissionalId",
                            foreignField: "_id",
                            as: "profissional"
                        }
                    },
                    {
                        $unwind: {
                            path: "$paciente",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: "$profissional",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $sort: {
                            data: 1,
                            hora: 1
                        }
                    }
                ])
                .toArray();

            return res.json(agendamentos);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao consultar agendamentos."
            });
        }
    }
);


// ==========================================
// CONSULTAR UM AGENDAMENTO
// ==========================================

router.get(
    "/:id",
    autenticar,
    permitirPerfis(...PERFIS_AGENDAMENTO),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!idValido(id)) {
                return res.status(400).json({
                    mensagem: "ID do agendamento inválido."
                });
            }

            const banco = getBanco();

            const agendamento = await banco
                .collection("agendamentos")
                .findOne({
                    _id: new ObjectId(id)
                });

            if (!agendamento) {
                return res.status(404).json({
                    mensagem: "Agendamento não encontrado."
                });
            }

            if (!podeAcessarAgendamento(agendamento, req.usuario)) {
                return res.status(403).json({
                    mensagem:
                        "Você não tem permissão para visualizar este agendamento."
                });
            }

            return res.json(agendamento);
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao consultar agendamento."
            });
        }
    }
);


// ==========================================
// CANCELAR AGENDAMENTO
// ==========================================

router.put(
    "/:id/cancelar",
    autenticar,
    permitirPerfis(...PERFIS_AGENDAMENTO),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!idValido(id)) {
                return res.status(400).json({
                    mensagem: "ID do agendamento inválido."
                });
            }

            const banco = getBanco();
            const agendamentoId = new ObjectId(id);

            const agendamento = await banco
                .collection("agendamentos")
                .findOne({ _id: agendamentoId });

            if (!agendamento) {
                return res.status(404).json({
                    mensagem: "Agendamento não encontrado."
                });
            }

            if (!podeAcessarAgendamento(agendamento, req.usuario)) {
                return res.status(403).json({
                    mensagem:
                        "Você não tem permissão para cancelar este agendamento."
                });
            }

            if (agendamento.status === "cancelado") {
                return res.status(400).json({
                    mensagem: "Esse agendamento já está cancelado."
                });
            }

            if (agendamento.status !== "agendado") {
                return res.status(400).json({
                    mensagem:
                        "Somente agendamentos ativos podem ser cancelados."
                });
            }

            const resultado = await banco
                .collection("agendamentos")
                .updateOne(
                    {
                        _id: agendamentoId,
                        status: "agendado"
                    },
                    {
                        $set: {
                            status: "cancelado",
                            canceladoEm: new Date(),
                            canceladoPor: req.usuario.id
                        }
                    }
                );

            if (resultado.modifiedCount === 0) {
                return res.status(409).json({
                    mensagem:
                        "O agendamento foi alterado por outra operação. Consulte novamente."
                });
            }

            return res.json({
                mensagem: "Agendamento cancelado com sucesso!",
                id: agendamentoId,
                status: "cancelado"
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao cancelar agendamento."
            });
        }
    }
);

module.exports = router;
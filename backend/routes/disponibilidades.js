
const express = require("express");
const { ObjectId } = require("mongodb");
const { getBanco } = require("../config/database");

const {
    autenticar,
    permitirPerfis
} = require("../middlewares/auth");

const router = express.Router();

// Normaliza dias como "terça-feira", "terça" e "TERCA"
function normalizarDia(dia) {
    return dia
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/-feira$/, "");
}

const diasPermitidos = [
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "domingo"
];

function horaValida(hora) {
    return typeof hora === "string" &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

// ==========================================
// CADASTRAR DISPONIBILIDADE
// Apenas profissional ou administrador
// ==========================================
router.post(
    "/",
    autenticar,
    permitirPerfis("profissional", "administrador"),
    async (req, res) => {
        try {
            const {
                profissionalId,
                diaSemana,
                horaInicio,
                horaFim
            } = req.body;

            if (
                !profissionalId ||
                typeof diaSemana !== "string" ||
                !horaInicio ||
                !horaFim
            ) {
                return res.status(400).json({
                    mensagem:
                        "Profissional, dia da semana, hora inicial e hora final são obrigatórios."
                });
            }

            if (!ObjectId.isValid(profissionalId)) {
                return res.status(400).json({
                    mensagem: "ID do profissional inválido."
                });
            }

            const dia = normalizarDia(diaSemana);

            if (!diasPermitidos.includes(dia)) {
                return res.status(400).json({
                    mensagem: "Dia da semana inválido."
                });
            }

            if (!horaValida(horaInicio) || !horaValida(horaFim)) {
                return res.status(400).json({
                    mensagem: "Use horários válidos no formato HH:MM."
                });
            }

            if (horaInicio >= horaFim) {
                return res.status(400).json({
                    mensagem:
                        "A hora inicial deve ser anterior à hora final."
                });
            }

            // Um profissional só pode alterar a própria disponibilidade.
            // O administrador pode gerenciar qualquer profissional.
            if (req.usuario.perfil === "profissional") {
                if (
                    !req.usuario.profissionalId ||
                    req.usuario.profissionalId !== profissionalId
                ) {
                    return res.status(403).json({
                        mensagem:
                            "Você só pode cadastrar sua própria disponibilidade."
                    });
                }
            }

            const banco = getBanco();
            const profissionalObjectId = new ObjectId(profissionalId);

            const profissional = await banco
                .collection("profissionais")
                .findOne({
                    _id: profissionalObjectId
                });

            if (!profissional) {
                return res.status(404).json({
                    mensagem: "Profissional não encontrado."
                });
            }

            // Verifica intervalos que se sobrepõem no mesmo dia.
            const horariosExistentes = await banco
                .collection("disponibilidades")
                .find({
                    profissionalId: profissionalObjectId,
                    diaSemana: dia
                })
                .toArray();

            const existeConflito = horariosExistentes.some(
                disponibilidade =>
                    horaInicio < disponibilidade.horaFim &&
                    horaFim > disponibilidade.horaInicio
            );

            if (existeConflito) {
                return res.status(409).json({
                    mensagem:
                        "Esse horário se sobrepõe a uma disponibilidade já cadastrada."
                });
            }

            const disponibilidade = {
                profissionalId: profissionalObjectId,
                diaSemana: dia,
                horaInicio,
                horaFim,
                criadoEm: new Date()
            };

            const resultado = await banco
                .collection("disponibilidades")
                .insertOne(disponibilidade);

            return res.status(201).json({
                mensagem: "Disponibilidade cadastrada com sucesso!",
                id: resultado.insertedId,
                disponibilidade
            });

        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao cadastrar disponibilidade."
            });
        }
    }
);

// ==========================================
// CONSULTAR DISPONIBILIDADES
// Pacientes podem consultar horários disponíveis.
// Profissionais só consultam os próprios horários.
// Administradores podem consultar todos.
// ==========================================
router.get(
    "/",
    autenticar,
    permitirPerfis("paciente", "profissional", "administrador"),
    async (req, res) => {
        try {
            const banco = getBanco();
            const filtro = {};

            if (req.query.profissionalId) {
                if (!ObjectId.isValid(req.query.profissionalId)) {
                    return res.status(400).json({
                        mensagem: "ID do profissional inválido."
                    });
                }

                filtro.profissionalId = new ObjectId(
                    req.query.profissionalId
                );
            }

            if (req.usuario.perfil === "profissional") {
                const idDoProfissional = req.usuario.profissionalId;

                if (!idDoProfissional ||
                    !ObjectId.isValid(idDoProfissional)) {
                    return res.status(400).json({
                        mensagem:
                            "Esta conta não está vinculada a um profissional."
                    });
                }

                if (
                    req.query.profissionalId &&
                    req.query.profissionalId !== idDoProfissional
                ) {
                    return res.status(403).json({
                        mensagem:
                            "Você só pode consultar sua própria disponibilidade."
                    });
                }

                filtro.profissionalId = new ObjectId(idDoProfissional);
            }

            const disponibilidades = await banco
                .collection("disponibilidades")
                .find(filtro)
                .sort({
                    diaSemana: 1,
                    horaInicio: 1
                })
                .toArray();

            return res.json(disponibilidades);

        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao consultar disponibilidades."
            });
        }
    }
);

module.exports = router;
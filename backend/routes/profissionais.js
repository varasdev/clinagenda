const express = require("express");
const { ObjectId } = require("mongodb");
const { getBanco } = require("../config/database");

const {
    autenticar,
    permitirPerfis
} = require("../middlewares/auth");

const router = express.Router();

// Escapa caracteres especiais da pesquisa
function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// CADASTRAR PROFISSIONAL
// Somente administrador autenticado
// ==========================================
router.post(
    "/",
    autenticar,
    permitirPerfis("administrador"),
    async (req, res) => {
        try {
            const {
                nome,
                registro,
                telefone,
                clinicaId,
                especialidadeId
            } = req.body;

            if (
                typeof nome !== "string" ||
                !nome.trim() ||
                typeof registro !== "string" ||
                !registro.trim() ||
                typeof telefone !== "string" ||
                !telefone.trim() ||
                typeof clinicaId !== "string" ||
                typeof especialidadeId !== "string"
            ) {
                return res.status(400).json({
                    mensagem:
                        "Nome, registro, telefone, clínica e especialidade são obrigatórios."
                });
            }

            if (
                !ObjectId.isValid(clinicaId) ||
                !ObjectId.isValid(especialidadeId)
            ) {
                return res.status(400).json({
                    mensagem:
                        "ID da clínica ou da especialidade inválido."
                });
            }

            const banco = getBanco();

            const clinica = await banco
                .collection("clinicas")
                .findOne({
                    _id: new ObjectId(clinicaId)
                });

            if (!clinica) {
                return res.status(404).json({
                    mensagem: "Clínica não encontrada."
                });
            }

            const especialidade = await banco
                .collection("especialidades")
                .findOne({
                    _id: new ObjectId(especialidadeId)
                });

            if (!especialidade) {
                return res.status(404).json({
                    mensagem: "Especialidade não encontrada."
                });
            }

            const registroNormalizado = registro.trim();

            const registroExistente = await banco
                .collection("profissionais")
                .findOne({
                    registro: registroNormalizado
                });

            if (registroExistente) {
                return res.status(409).json({
                    mensagem:
                        "Já existe um profissional com esse registro."
                });
            }

            const profissional = {
                nome: nome.trim(),
                registro: registroNormalizado,
                telefone: telefone.trim(),
                clinicaId: new ObjectId(clinicaId),
                especialidadeId: new ObjectId(especialidadeId),
                criadoEm: new Date()
            };

            const resultado = await banco
                .collection("profissionais")
                .insertOne(profissional);

            return res.status(201).json({
                mensagem: "Profissional cadastrado com sucesso!",
                id: resultado.insertedId,
                profissional: {
                    ...profissional,
                    _id: resultado.insertedId
                }
            });

        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao cadastrar profissional."
            });
        }
    }
);

// ==========================================
// CONSULTAR E PESQUISAR PROFISSIONAIS
// Filtros: nome, clínica e especialidade
// ==========================================
router.get("/", async (req, res) => {
    try {
        const parametros = [
            "nome",
            "clinica",
            "especialidade",
            "clinicaId",
            "especialidadeId"
        ];

        for (const parametro of parametros) {
            if (
                req.query[parametro] !== undefined &&
                typeof req.query[parametro] !== "string"
            ) {
                return res.status(400).json({
                    mensagem: `O filtro ${parametro} deve ser um texto.`
                });
            }
        }

        const nome = (req.query.nome || "").trim();
        const clinica = (req.query.clinica || "").trim();
        const especialidade = (req.query.especialidade || "").trim();
        const clinicaId = req.query.clinicaId;
        const especialidadeId = req.query.especialidadeId;

        if (clinicaId && !ObjectId.isValid(clinicaId)) {
            return res.status(400).json({
                mensagem: "ID da clínica inválido."
            });
        }

        if (
            especialidadeId &&
            !ObjectId.isValid(especialidadeId)
        ) {
            return res.status(400).json({
                mensagem: "ID da especialidade inválido."
            });
        }

        const filtro = {};

        if (nome) {
            filtro.nome = {
                $regex: escaparRegex(nome),
                $options: "i"
            };
        }

        if (clinica) {
            filtro["clinica.nome"] = {
                $regex: escaparRegex(clinica),
                $options: "i"
            };
        }

        if (especialidade) {
            filtro["especialidade.nome"] = {
                $regex: escaparRegex(especialidade),
                $options: "i"
            };
        }

        if (clinicaId) {
            filtro.clinicaId = new ObjectId(clinicaId);
        }

        if (especialidadeId) {
            filtro.especialidadeId = new ObjectId(especialidadeId);
        }

        const banco = getBanco();

        const profissionais = await banco
            .collection("profissionais")
            .aggregate([
                {
                    $lookup: {
                        from: "clinicas",
                        localField: "clinicaId",
                        foreignField: "_id",
                        as: "clinica"
                    }
                },
                {
                    $lookup: {
                        from: "especialidades",
                        localField: "especialidadeId",
                        foreignField: "_id",
                        as: "especialidade"
                    }
                },
                {
                    $unwind: {
                        path: "$clinica",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$especialidade",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: filtro
                },
                {
                    $sort: {
                        nome: 1
                    }
                }
            ])
            .toArray();

        return res.json(profissionais);

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            mensagem: "Erro ao consultar profissionais."
        });
    }
});

module.exports = router;
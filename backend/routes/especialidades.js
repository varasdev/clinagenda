
const express = require("express");
const { getBanco } = require("../config/database");
const {
    autenticar,
    permitirPerfis
} = require("../middlewares/auth");

const router = express.Router();

// ==========================================
// CADASTRAR ESPECIALIDADE
// Somente administradores autenticados
// ==========================================
router.post(
    "/",
    autenticar,
    permitirPerfis("administrador"),
    async (req, res) => {
        try {
            const { nome } = req.body;

            if (typeof nome !== "string" || !nome.trim()) {
                return res.status(400).json({
                    mensagem: "O nome da especialidade é obrigatório."
                });
            }

            const banco = getBanco();
            const nomeNormalizado = nome.trim();

            // Evita duplicar especialidades com o mesmo nome
            const existente = await banco
                .collection("especialidades")
                .findOne({
                    nome: {
                        $regex: `^${nomeNormalizado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                        $options: "i"
                    }
                });

            if (existente) {
                return res.status(409).json({
                    mensagem: "Essa especialidade já está cadastrada."
                });
            }

            const especialidade = {
                nome: nomeNormalizado,
                criadoEm: new Date()
            };

            const resultado = await banco
                .collection("especialidades")
                .insertOne(especialidade);

            return res.status(201).json({
                mensagem: "Especialidade cadastrada com sucesso!",
                id: resultado.insertedId,
                especialidade: {
                    ...especialidade,
                    _id: resultado.insertedId
                }
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao cadastrar especialidade."
            });
        }
    }
);

// ==========================================
// CONSULTAR ESPECIALIDADES
// ==========================================
router.get("/", async (req, res) => {
    try {
        const banco = getBanco();

        const especialidades = await banco
            .collection("especialidades")
            .find()
            .sort({ nome: 1 })
            .toArray();

        return res.json(especialidades);
    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            mensagem: "Erro ao consultar especialidades."
        });
    }
});

module.exports = router;
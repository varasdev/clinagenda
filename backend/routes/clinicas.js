
const express = require("express");
const { getBanco } = require("../config/database");
const {
    autenticar,
    permitirPerfis
} = require("../middlewares/auth");

const router = express.Router();

function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// CADASTRAR CLÍNICA
// Somente administradores autenticados
// ==========================================
router.post(
    "/",
    autenticar,
    permitirPerfis("administrador"),
    async (req, res) => {
        try {
            const { nome, endereco, telefone } = req.body;

            if (
                typeof nome !== "string" ||
                !nome.trim() ||
                typeof endereco !== "string" ||
                !endereco.trim() ||
                typeof telefone !== "string" ||
                !telefone.trim()
            ) {
                return res.status(400).json({
                    mensagem:
                        "Nome, endereço e telefone são obrigatórios."
                });
            }

            const banco = getBanco();

            const clinica = {
                nome: nome.trim(),
                endereco: endereco.trim(),
                telefone: telefone.trim(),
                criadoEm: new Date()
            };

            const resultado = await banco
                .collection("clinicas")
                .insertOne(clinica);

            return res.status(201).json({
                mensagem: "Clínica cadastrada com sucesso!",
                id: resultado.insertedId,
                clinica: {
                    ...clinica,
                    _id: resultado.insertedId
                }
            });
        } catch (erro) {
            console.error(erro);

            return res.status(500).json({
                mensagem: "Erro ao cadastrar clínica."
            });
        }
    }
);

// ==========================================
// CONSULTAR E PESQUISAR CLÍNICAS
// Filtros opcionais: nome e endereço
// ==========================================
router.get("/", async (req, res) => {
    try {
        const { nome, endereco } = req.query;

        if (
            (nome !== undefined && typeof nome !== "string") ||
            (endereco !== undefined && typeof endereco !== "string")
        ) {
            return res.status(400).json({
                mensagem: "Os filtros devem ser textos."
            });
        }

        const filtro = {};

        if (nome && nome.trim()) {
            filtro.nome = {
                $regex: escaparRegex(nome.trim()),
                $options: "i"
            };
        }

        if (endereco && endereco.trim()) {
            filtro.endereco = {
                $regex: escaparRegex(endereco.trim()),
                $options: "i"
            };
        }

        const banco = getBanco();

        const clinicas = await banco
            .collection("clinicas")
            .find(filtro)
            .sort({ nome: 1 })
            .toArray();

        return res.json(clinicas);
    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            mensagem: "Erro ao consultar clínicas."
        });
    }
});

module.exports = router;
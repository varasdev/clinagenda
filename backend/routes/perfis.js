const express = require("express");

const {
    autenticar,
    permitirPerfis
} = require("../middlewares/auth");

const router = express.Router();

router.get(
    "/paciente",
    autenticar,
    permitirPerfis("paciente"),
    (req, res) => {
        res.json({
            mensagem: "Acesso permitido à área do paciente.",
            usuario: req.usuario
        });
    }
);

router.get(
    "/profissional",
    autenticar,
    permitirPerfis("profissional"),
    (req, res) => {
        res.json({
            mensagem: "Acesso permitido à área do profissional.",
            usuario: req.usuario
        });
    }
);

router.get(
    "/administrador",
    autenticar,
    permitirPerfis("administrador"),
    (req, res) => {
        res.json({
            mensagem: "Acesso permitido à área administrativa.",
            usuario: req.usuario
        });
    }
);

module.exports = router;
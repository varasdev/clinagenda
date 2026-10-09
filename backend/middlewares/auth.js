const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
    try {
        const autorizacao = req.headers.authorization;

        if (!autorizacao) {
            return res.status(401).json({
                mensagem: "Token não informado."
            });
        }

        const partes = autorizacao.split(" ");

        if (partes.length !== 2 || partes[0] !== "Bearer") {
            return res.status(401).json({
                mensagem: "Formato do token inválido."
            });
        }

        const token = partes[1];

        const usuario = jwt.verify(token, process.env.JWT_SECRET);

        req.usuario = usuario;

        next();
    } catch (erro) {
        return res.status(401).json({
            mensagem: "Token inválido ou expirado."
        });
    }
}

function permitirPerfis(...perfis) {
    return (req, res, next) => {
        if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
            return res.status(403).json({
                mensagem: "Você não tem permissão para realizar esta ação."
            });
        }

        next();
    };
}

module.exports = {
    autenticar,
    permitirPerfis
};
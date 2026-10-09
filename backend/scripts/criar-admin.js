
require("dotenv").config();

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI não encontrada no .env");
    }

    const terminal = readline.createInterface({
        input: stdin,
        output: stdout
    });

    let client;

    try {
        const nome = (await terminal.question(
            "Nome do administrador: "
        )).trim();

        const email = (await terminal.question(
            "Email do administrador: "
        )).trim().toLowerCase();

        const senha = await terminal.question(
            "Crie uma senha com pelo menos 8 caracteres: "
        );

        if (!nome || !email || senha.length < 8) {
            throw new Error(
                "Informe nome, email e senha com pelo menos 8 caracteres."
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Email inválido.");
        }

        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();

        // Usa o mesmo banco configurado para o backend.
        const banco = client.db(process.env.DB_NAME);
        const usuarios = banco.collection("usuarios");

        const administradorExistente = await usuarios.findOne({
            perfil: "administrador"
        });

        if (administradorExistente) {
            console.log(
                "Já existe um administrador. Nenhuma conta foi criada."
            );
            return;
        }

        const emailExistente = await usuarios.findOne({ email });

        if (emailExistente) {
            throw new Error(
                "Este email já pertence a uma conta existente."
            );
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await usuarios.insertOne({
            nome,
            email,
            senha: senhaHash,
            perfil: "administrador",
            pacienteId: null,
            profissionalId: null,
            criadoEm: new Date()
        });

        console.log("Administrador criado com sucesso!");
        console.log("ID:", resultado.insertedId.toString());
        console.log("Email:", email);

    } finally {
        terminal.close();

        if (client) {
            await client.close();
        }
    }
}

main().catch(erro => {
    console.error("Não foi possível criar o administrador:", erro.message);
    process.exitCode = 1;
});
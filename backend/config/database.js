const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error("MONGODB_URI não foi encontrada no arquivo .env");
}

const client = new MongoClient(uri);

let db;

async function conectarBanco() {
    try {
        await client.connect();

        db = client.db(process.env.DB_NAME);

        // Criar índices para a coleção triagens
        try {
            await db.collection("triagens").createIndex({ pacienteId: 1, criadoEm: -1 });
            await db.collection("triagens").createIndex({ consultaId: 1 }, { unique: true, sparse: true });
            await db.collection("triagens").createIndex({ sessionId: 1 }, { unique: true });
        } catch (indexError) {
            console.warn("Aviso ao criar índices de triagens:", indexError.message);
        }

        console.log("MongoDB conectado com sucesso!");
    } catch (erro) {
        console.error("Erro ao conectar ao MongoDB:", erro);
        process.exit(1);
    }
}

function getBanco() {
    if (!db) {
        throw new Error("Banco de dados ainda não conectado.");
    }

    return db;
}

module.exports = {
    conectarBanco,
    getBanco
};
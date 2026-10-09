require("dotenv").config();

const express = require("express");
const cors = require("cors");
const clinicasRoutes = require("./routes/clinicas");
const especialidadesRoutes = require("./routes/especialidades");
const profissionaisRoutes = require("./routes/profissionais");
const pacientesRoutes = require("./routes/pacientes");
const authRoutes = require("./routes/auth");
const perfisRoutes = require("./routes/perfis");
const disponibilidadesRoutes = require("./routes/disponibilidades");
const agendamentosRoutes = require("./routes/agendamentos");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./docs/openapi");
const { conectarBanco } = require("./config/database");



const app = express();

app.use(cors());
app.use(express.json());

app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);
app.use("/clinicas", clinicasRoutes);
app.use("/especialidades", especialidadesRoutes);
app.use("/profissionais", profissionaisRoutes);
app.use("/pacientes", pacientesRoutes);
app.use("/auth", authRoutes);
app.use("/perfis", perfisRoutes);
app.use("/disponibilidades", disponibilidadesRoutes);
app.use("/agendamentos", agendamentosRoutes);
app.get("/", (req, res) => {
    res.json({
        mensagem: "API do Projeto Integrador funcionando!"
    });
});

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    await conectarBanco();

    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

iniciarServidor();
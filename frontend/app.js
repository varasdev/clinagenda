
const API_URL = "http://localhost:3000";

const $ = (seletor) => document.querySelector(seletor);

let token = sessionStorage.getItem("clinagenda_token") || "";
let usuarioAtual = null;
let pacienteAtual = null;
let clinicasCache = [];
let especialidadesCache = [];
let profissionaisCache = [];

const telas = {
    home: "view-home",
    clinics: "view-clinics",
    specialties: "view-specialties",
    professionals: "view-professionals",
    availability: "view-availability",
    appointments: "view-appointments",
    profile: "view-profile"
};

// ==========================================
// COMUNICAÇÃO COM A API
// ==========================================

async function requisicao(caminho, opcoes = {}) {
    const { auth = true, ...config } = opcoes;

    const headers = {
        ...(config.body ? { "Content-Type": "application/json" } : {}),
        ...config.headers
    };

    if (auth && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let resposta;

    try {
        resposta = await fetch(`${API_URL}${caminho}`, {
            ...config,
            headers
        });
    } catch {
        throw new Error(
            "Não foi possível conectar à API. Confira se o backend está funcionando."
        );
    }

    const texto = await resposta.text();
    let dados = {};

    if (texto) {
        try {
            dados = JSON.parse(texto);
        } catch {
            dados = { mensagem: texto };
        }
    }

    if (!resposta.ok) {
        throw new Error(
            dados.mensagem ||
            dados.message ||
            `Erro na requisição (${resposta.status}).`
        );
    }

    return dados;
}

function listaDe(dados, chaves = []) {
    if (Array.isArray(dados)) {
        return dados;
    }

    if (!dados || typeof dados !== "object") {
        return [];
    }

    for (const chave of chaves) {
        if (Array.isArray(dados[chave])) {
            return dados[chave];
        }
    }

    for (const chave of ["data", "resultados", "items", "itens"]) {
        if (Array.isArray(dados[chave])) {
            return dados[chave];
        }
    }

    return [];
}

function objetoDe(dados, chaves = []) {
    for (const chave of chaves) {
        if (dados?.[chave] && typeof dados[chave] === "object") {
            return dados[chave];
        }
    }

    return dados || {};
}

function idDe(item) {
    const id = item?._id ?? item?.id;

    if (typeof id === "string") {
        return id;
    }

    if (id && typeof id.toString === "function") {
        return id.toString();
    }

    return "";
}

function nomeDe(item) {
    return item?.nome || item?.name || "Nome não informado";
}

function mostrarMensagem(elemento, mensagem, tipo = "") {
    if (!elemento) return;

    elemento.textContent = mensagem;
    elemento.className = "form-message";

    if (tipo) {
        elemento.classList.add(tipo);
    }
}

function mensagemDeErro(elemento, erro) {
    mostrarMensagem(
        elemento,
        erro?.message || "Ocorreu um erro inesperado.",
        "error"
    );
}

function criarElemento(tag, texto, classe = "") {
    const elemento = document.createElement(tag);

    if (texto !== undefined && texto !== null) {
        elemento.textContent = String(texto);
    }

    if (classe) {
        elemento.className = classe;
    }

    return elemento;
}

function criarVazio(container, mensagem) {
    container.replaceChildren();

    const estado = criarElemento("div", undefined, "empty-state");
    const titulo = criarElemento("strong", mensagem);
    const descricao = criarElemento(
        "span",
        "Quando houver informações disponíveis, elas aparecerão aqui."
    );

    estado.append(titulo, descricao);
    container.append(estado);
}

function criarCard(titulo, detalhes = []) {
    const card = criarElemento("article", undefined, "data-card");

    card.append(criarElemento("h3", titulo));

    for (const [rotulo, valor] of detalhes) {
        if (valor === undefined || valor === null || valor === "") {
            continue;
        }

        const paragrafo = document.createElement("p");
        paragrafo.append(criarElemento("span", `${rotulo}: `, "card-label"));
        paragrafo.append(document.createTextNode(String(valor)));
        card.append(paragrafo);
    }

    return card;
}

function preencherSelect(select, itens, textoInicial, selecionarId = "") {
    if (!select) return;

    select.replaceChildren();

    const opcaoInicial = criarElemento("option", textoInicial);
    opcaoInicial.value = "";
    select.append(opcaoInicial);

    for (const item of itens) {
        const opcao = criarElemento("option", nomeDe(item));
        opcao.value = idDe(item);

        if (opcao.value === selecionarId) {
            opcao.selected = true;
        }

        select.append(opcao);
    }
}

function dataLocalAtual() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

// ==========================================
// CONEXÃO E AUTENTICAÇÃO
// ==========================================

async function verificarConexao() {
    const status = $("#connection-status");

    try {
        await requisicao("/", { auth: false });

        status.textContent = "API conectada";
        status.classList.remove("offline");
        status.classList.add("online");
    } catch {
        status.textContent = "API indisponível";
        status.classList.remove("online");
        status.classList.add("offline");
    }
}

function mostrarAutenticacao() {
    $("#auth-screen").hidden = false;
    $("#app-screen").hidden = true;
    $("#logout-button").hidden = true;
}

function mostrarAplicacao() {
    $("#auth-screen").hidden = true;
    $("#app-screen").hidden = false;
    $("#logout-button").hidden = false;

    $("#user-name").textContent = usuarioAtual.nome || "Usuário";

    const perfis = {
        paciente: "Paciente",
        profissional: "Profissional",
        administrador: "Administrador"
    };

    $("#user-role").textContent =
        perfis[usuarioAtual.perfil] || usuarioAtual.perfil;

    document.querySelectorAll("[data-roles]").forEach((elemento) => {
        const permitidos = elemento.dataset.roles
            .split(",")
            .map((perfil) => perfil.trim());

        elemento.hidden = !permitidos.includes(usuarioAtual.perfil);
    });

    // O perfil pessoal desta tela é o de paciente.
    const botaoPerfil = document.querySelector('[data-view="profile"]');

    if (botaoPerfil) {
        botaoPerfil.hidden = usuarioAtual.perfil !== "paciente";
    }

    $("#clinic-form").hidden = usuarioAtual.perfil !== "administrador";
    $("#specialty-form").hidden = usuarioAtual.perfil !== "administrador";
    $("#professional-form").hidden = usuarioAtual.perfil !== "administrador";
    $("#professional-access-form").hidden =
        usuarioAtual.perfil !== "administrador";

    $("#availability-form").hidden =
        !["profissional", "administrador"].includes(usuarioAtual.perfil);

    $("#availability-professional-field").hidden =
        usuarioAtual.perfil === "profissional";

    $("#appointment-form").hidden = usuarioAtual.perfil !== "paciente";

    if (usuarioAtual.perfil === "profissional") {
        $("#appointment-professional").disabled = true;
    } else {
        $("#appointment-professional").disabled = false;
    }
}

async function iniciarSessao() {
    const resultado = await requisicao("/auth/me");

    usuarioAtual = objetoDe(resultado, ["usuario"]);

    if (
        !usuarioAtual.perfil ||
        !["paciente", "profissional", "administrador"].includes(usuarioAtual.perfil)
    ) {
        throw new Error("Não foi possível identificar o perfil do usuário.");
    }

    mostrarAplicacao();
    await abrirTela("home");
}

function encerrarSessao() {
    token = "";
    usuarioAtual = null;
    pacienteAtual = null;

    sessionStorage.removeItem("clinagenda_token");

    $("#login-senha").value = "";
    mostrarAutenticacao();
}

$("#logout-button").addEventListener("click", encerrarSessao);

// Alternância entre login e cadastro

function selecionarFormularioAuth(tipo) {
    const loginAtivo = tipo === "login";

    $("#login-form").hidden = !loginAtivo;
    $("#register-form").hidden = loginAtivo;

    $("#show-login").classList.toggle("active", loginAtivo);
    $("#show-register").classList.toggle("active", !loginAtivo);

    $("#show-login").setAttribute("aria-selected", String(loginAtivo));
    $("#show-register").setAttribute("aria-selected", String(!loginAtivo));
}

$("#show-login").addEventListener("click", () => {
    selecionarFormularioAuth("login");
});

$("#show-register").addEventListener("click", () => {
    selecionarFormularioAuth("register");
});

// Login

$("#login-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const botao = evento.submitter;
    const mensagem = $("#login-message");

    const email = $("#login-email").value.trim();
    const senha = $("#login-senha").value;

    mostrarMensagem(mensagem, "Entrando na sua conta...");

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao("/auth/login", {
            method: "POST",
            auth: false,
            body: JSON.stringify({ email, senha })
        });

        if (!resultado.token) {
            throw new Error("O servidor não retornou um token de autenticação.");
        }

        token = resultado.token;
        sessionStorage.setItem("clinagenda_token", token);

        await iniciarSessao();
    } catch (erro) {
        encerrarSessao();
        selecionarFormularioAuth("login");
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// Cadastro público de pacientes

$("#register-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const botao = evento.submitter;
    const mensagem = $("#register-message");

    const dados = {
        nome: $("#register-nome").value.trim(),
        email: $("#register-email").value.trim(),
        senha: $("#register-senha").value,
        cpf: $("#register-cpf").value,
        dataNascimento: $("#register-nascimento").value,
        telefone: $("#register-telefone").value.trim(),
        endereco: $("#register-endereco").value.trim()
    };

    mostrarMensagem(mensagem, "Criando sua conta...");

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao("/auth/register", {
            method: "POST",
            auth: false,
            body: JSON.stringify(dados)
        });

        $("#login-email").value = dados.email;
        $("#register-form").reset();

        selecionarFormularioAuth("login");

        mostrarMensagem(
            $("#login-message"),
            resultado.mensagem || "Cadastro realizado! Entre na sua conta.",
            "success"
        );
    } catch (erro) {
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// ==========================================
// NAVEGAÇÃO
// ==========================================

async function abrirTela(nome) {
    const idTela = telas[nome];

    if (!idTela) return;

    if (document.querySelector(`[data-view="${nome}"]`)?.hidden) {
        return;
    }

    document.querySelectorAll(".content-view").forEach((tela) => {
        tela.hidden = true;
    });

    $(`#${idTela}`).hidden = false;

    document.querySelectorAll(".nav-button").forEach((botao) => {
        const ativo = botao.dataset.view === nome;

        botao.classList.toggle("active", ativo);
        botao.setAttribute("aria-current", ativo ? "page" : "false");
    });

    try {
        if (nome === "clinics") await carregarClinicas();
        if (nome === "specialties") await carregarEspecialidades();
        if (nome === "professionals") await carregarProfissionais();
        if (nome === "availability") await prepararDisponibilidades();
        if (nome === "appointments") await prepararAgendamentos();
        if (nome === "profile") await carregarPerfil();
    } catch (erro) {
        console.error(erro);

        const mensagemHome = $("#home-message");

        mostrarMensagem(
            mensagemHome,
            erro.message || "Não foi possível carregar as informações.",
            "error"
        );
    }
}

document.querySelectorAll("[data-view]").forEach((botao) => {
    botao.addEventListener("click", () => {
        abrirTela(botao.dataset.view);
    });
});

document.querySelectorAll("[data-go-view]").forEach((botao) => {
    botao.addEventListener("click", () => {
        abrirTela(botao.dataset.goView);
    });
});

$("#brand-home").addEventListener("click", (evento) => {
    evento.preventDefault();

    if (token && usuarioAtual) {
        abrirTela("home");
    } else {
        selecionarFormularioAuth("login");
    }
});

// ==========================================
// CLÍNICAS
// ==========================================

async function carregarClinicas() {
    const lista = $("#clinic-list");

    lista.replaceChildren(criarElemento("p", "Carregando clínicas...", "loading-state"));

    try {
        const dados = await requisicao("/clinicas");
        clinicasCache = listaDe(dados, ["clinicas"]);

        if (!clinicasCache.length) {
            criarVazio(lista, "Nenhuma clínica cadastrada.");
            return;
        }

        lista.replaceChildren();

        for (const clinica of clinicasCache) {
            lista.append(
                criarCard(nomeDe(clinica), [
                    ["Endereço", clinica.endereco],
                    ["Telefone", clinica.telefone]
                ])
            );
        }
    } catch (erro) {
        lista.replaceChildren();
        mostrarMensagem($("#home-message"), erro.message, "error");
        criarVazio(lista, "Não foi possível carregar as clínicas.");
    }
}

$("#reload-clinics").addEventListener("click", carregarClinicas);

$("#clinic-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const mensagem = $("#clinic-message");
    const botao = evento.submitter;

    const dados = {
        nome: $("#clinic-nome").value.trim(),
        endereco: $("#clinic-endereco").value.trim(),
        telefone: $("#clinic-telefone").value.trim()
    };

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao("/clinicas", {
            method: "POST",
            body: JSON.stringify(dados)
        });

        $("#clinic-form").reset();

        mostrarMensagem(
            mensagem,
            resultado.mensagem || "Clínica cadastrada com sucesso!",
            "success"
        );

        await carregarClinicas();
    } catch (erro) {
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// ==========================================
// ESPECIALIDADES
// ==========================================

async function carregarEspecialidades() {
    const lista = $("#specialty-list");

    lista.replaceChildren(
        criarElemento("p", "Carregando especialidades...", "loading-state")
    );

    try {
        const dados = await requisicao("/especialidades");
        especialidadesCache = listaDe(dados, ["especialidades"]);

        if (!especialidadesCache.length) {
            criarVazio(lista, "Nenhuma especialidade cadastrada.");
            return;
        }

        lista.replaceChildren();

        for (const especialidade of especialidadesCache) {
            lista.append(criarCard(nomeDe(especialidade)));
        }
    } catch (erro) {
        lista.replaceChildren();
        criarVazio(lista, "Não foi possível carregar as especialidades.");
        mostrarMensagem($("#home-message"), erro.message, "error");
    }
}

$("#reload-specialties").addEventListener("click", carregarEspecialidades);

$("#specialty-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const mensagem = $("#specialty-message");
    const botao = evento.submitter;

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao("/especialidades", {
            method: "POST",
            body: JSON.stringify({
                nome: $("#specialty-nome").value.trim()
            })
        });

        $("#specialty-form").reset();

        mostrarMensagem(
            mensagem,
            resultado.mensagem || "Especialidade cadastrada com sucesso!",
            "success"
        );

        await carregarEspecialidades();
    } catch (erro) {
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// ==========================================
// PROFISSIONAIS
// ==========================================

async function buscarDadosProfissionais(filtros = {}) {
    const parametros = new URLSearchParams();

    if (filtros.nome) parametros.set("nome", filtros.nome);
    if (filtros.especialidade) {
        parametros.set("especialidade", filtros.especialidade);
    }

    const sufixo = parametros.toString()
        ? `?${parametros.toString()}`
        : "";

    const dados = await requisicao(`/profissionais${sufixo}`);

    return listaDe(dados, ["profissionais"]);
}

function clinicaDo(profissional) {
    const clinica = profissional.clinica;

    if (clinica && typeof clinica === "object") {
        return clinica.nome || "";
    }

    return clinica ||
        profissional.clinicaNome ||
        profissional.nomeClinica ||
        "";
}

function especialidadeDo(profissional) {
    const especialidade = profissional.especialidade;

    if (especialidade && typeof especialidade === "object") {
        return especialidade.nome || "";
    }

    return especialidade ||
        profissional.especialidadeNome ||
        profissional.nomeEspecialidade ||
        "";
}

async function carregarProfissionais(filtros = {}) {
    const lista = $("#professional-list");

    lista.replaceChildren(
        criarElemento("p", "Carregando profissionais...", "loading-state")
    );

    try {
        profissionaisCache = await buscarDadosProfissionais(filtros);

        await Promise.all([
            carregarClinicasParaSelect(),
            carregarEspecialidadesParaSelect()
        ]);

        preencherSelect(
            $("#access-professional"),
            profissionaisCache,
            "Selecione um profissional"
        );

        preencherSelect(
            $("#appointment-professional"),
            profissionaisCache,
            "Selecione um profissional"
        );

        preencherSelect(
            $("#availability-professional"),
            profissionaisCache,
            "Selecione um profissional"
        );

        const profissionalIdAtual = usuarioAtual?.profissionalId;

        if (usuarioAtual?.perfil === "profissional" && profissionalIdAtual) {
            const profissionalAtual = profissionaisCache.find(
                (item) => idDe(item) === profissionalIdAtual
            );

            if (profissionalAtual) {
                preencherSelect(
                    $("#appointment-professional"),
                    [profissionalAtual],
                    "Seu cadastro profissional",
                    profissionalIdAtual
                );
            }
        }

        if (!profissionaisCache.length) {
            criarVazio(lista, "Nenhum profissional encontrado.");
            return;
        }

        lista.replaceChildren();

        for (const profissional of profissionaisCache) {
            lista.append(
                criarCard(nomeDe(profissional), [
                    ["Registro", profissional.registro],
                    ["Telefone", profissional.telefone],
                    ["Clínica", clinicaDo(profissional)],
                    ["Especialidade", especialidadeDo(profissional)]
                ])
            );
        }
    } catch (erro) {
        lista.replaceChildren();
        criarVazio(lista, "Não foi possível carregar os profissionais.");
        mostrarMensagem($("#home-message"), erro.message, "error");
    }
}

async function carregarClinicasParaSelect() {
    const dados = await requisicao("/clinicas");

    clinicasCache = listaDe(dados, ["clinicas"]);

    preencherSelect(
        $("#professional-clinic"),
        clinicasCache,
        "Selecione uma clínica"
    );
}

async function carregarEspecialidadesParaSelect() {
    const dados = await requisicao("/especialidades");

    especialidadesCache = listaDe(dados, ["especialidades"]);

    preencherSelect(
        $("#professional-specialty"),
        especialidadesCache,
        "Selecione uma especialidade"
    );
}

$("#reload-professionals").addEventListener("click", () => {
    carregarProfissionais();
});

$("#search-professionals").addEventListener("click", () => {
    carregarProfissionais({
        nome: $("#filter-professional-name").value.trim(),
        especialidade: $("#filter-professional-specialty").value.trim()
    });
});

$("#professional-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const mensagem = $("#professional-message");
    const botao = evento.submitter;

    const dados = {
        nome: $("#professional-nome").value.trim(),
        registro: $("#professional-registro").value.trim(),
        telefone: $("#professional-telefone").value.trim(),
        clinicaId: $("#professional-clinic").value,
        especialidadeId: $("#professional-specialty").value
    };

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao("/profissionais", {
            method: "POST",
            body: JSON.stringify(dados)
        });

        $("#professional-form").reset();

        mostrarMensagem(
            mensagem,
            resultado.mensagem || "Profissional cadastrado com sucesso!",
            "success"
        );

        await carregarProfissionais();
    } catch (erro) {
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// Criar conta vinculada a um profissional

$("#professional-access-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const mensagem = $("#access-message");
    const botao = evento.submitter;

    const dados = {
        profissionalId: $("#access-professional").value,
        email: $("#access-email").value.trim(),
        senha: $("#access-password").value
    };

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao("/auth/usuarios/profissional", {
            method: "POST",
            body: JSON.stringify(dados)
        });

        $("#professional-access-form").reset();

        mostrarMensagem(
            mensagem,
            resultado.mensagem || "Acesso criado com sucesso!",
            "success"
        );
    } catch (erro) {
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// ==========================================
// DISPONIBILIDADES
// ==========================================

async function prepararDisponibilidades() {
    if (usuarioAtual.perfil === "administrador") {
        await carregarProfissionais();
    } else {
        await carregarProfissionaisDoProfissional();
    }

    await carregarDisponibilidades();
}

async function carregarProfissionaisDoProfissional() {
    const id = usuarioAtual.profissionalId;

    if (!id) {
        throw new Error("Sua conta não está vinculada a um profissional.");
    }

    const dados = await requisicao("/profissionais");
    profissionaisCache = listaDe(dados, ["profissionais"]);

    const profissionalAtual = profissionaisCache.find(
        (item) => idDe(item) === id
    );

    preencherSelect(
        $("#availability-professional"),
        profissionalAtual ? [profissionalAtual] : [],
        "Sua conta profissional",
        id
    );

    preencherSelect(
        $("#appointment-professional"),
        profissionalAtual ? [profissionalAtual] : [],
        "Seu cadastro profissional",
        id
    );
}

async function carregarDisponibilidades() {
    const lista = $("#availability-list");

    lista.replaceChildren(
        criarElemento("p", "Carregando disponibilidades...", "loading-state")
    );

    try {
        const dados = await requisicao("/disponibilidades");
        const disponibilidades = listaDe(dados, ["disponibilidades"]);

        if (!disponibilidades.length) {
            criarVazio(lista, "Nenhuma disponibilidade encontrada.");
            return;
        }

        lista.replaceChildren();

        for (const item of disponibilidades) {
            const profissional = item.profissional;

            const nomeProfissional =
                (profissional && typeof profissional === "object"
                    ? profissional.nome
                    : profissional) ||
                item.profissionalNome ||
                "";

            lista.append(
                criarCard(item.diaSemana || "Dia não informado", [
                    ["Profissional", nomeProfissional],
                    ["Início", item.horaInicio],
                    ["Fim", item.horaFim]
                ])
            );
        }
    } catch (erro) {
        lista.replaceChildren();
        criarVazio(lista, "Não foi possível carregar as disponibilidades.");
        mostrarMensagem($("#availability-message"), erro.message, "error");
    }
}

$("#reload-availability").addEventListener("click", () => {
    carregarDisponibilidades();
});

$("#availability-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const mensagem = $("#availability-message");
    const botao = evento.submitter;

    const profissionalId =
        usuarioAtual.perfil === "profissional"
            ? usuarioAtual.profissionalId
            : $("#availability-professional").value;

    const dados = {
        profissionalId,
        diaSemana: $("#availability-day").value,
        horaInicio: $("#availability-start").value,
        horaFim: $("#availability-end").value
    };

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao("/disponibilidades", {
            method: "POST",
            body: JSON.stringify(dados)
        });

        $("#availability-form").reset();

        mostrarMensagem(
            mensagem,
            resultado.mensagem || "Disponibilidade cadastrada com sucesso!",
            "success"
        );

        await carregarDisponibilidades();
    } catch (erro) {
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// ==========================================
// AGENDAMENTOS
// ==========================================

async function prepararAgendamentos() {
    await carregarProfissionais();
    await carregarAgendamentos();

    const dataInput = $("#appointment-date");

    dataInput.min = dataLocalAtual();
}

async function carregarAgendamentos() {
    const lista = $("#appointment-list");

    lista.replaceChildren(
        criarElemento("p", "Carregando consultas...", "loading-state")
    );

    try {
        const dados = await requisicao("/agendamentos");
        const agendamentos = listaDe(dados, ["agendamentos"]);

        if (!agendamentos.length) {
            criarVazio(lista, "Nenhuma consulta encontrada.");
            return;
        }

        lista.replaceChildren();

        for (const consulta of agendamentos) {
            const profissional =
                typeof consulta.profissional === "object"
                    ? consulta.profissional?.nome
                    : consulta.profissional;

            const paciente =
                typeof consulta.paciente === "object"
                    ? consulta.paciente?.nome
                    : consulta.paciente;

            const card = criarCard(
                profissional || "Consulta",
                [
                    ["Paciente", paciente],
                    ["Data", consulta.data],
                    ["Horário", consulta.hora]
                ]
            );

            const status = consulta.status || "agendado";
            const pill = criarElemento(
                "span",
                status === "cancelado" ? "Cancelado" : "Agendado",
                `status-pill${status === "cancelado" ? " cancelled" : ""}`
            );

            card.append(pill);

            if (status === "agendado" && idDe(consulta)) {
                const botao = criarElemento(
                    "button",
                    "Cancelar consulta",
                    "button button-outline"
                );

                botao.type = "button";

                botao.addEventListener("click", async () => {
                    const confirmar = window.confirm(
                        "Deseja realmente cancelar esta consulta?"
                    );

                    if (!confirmar) return;

                    botao.disabled = true;

                    try {
                        const resultado = await requisicao(
                            `/agendamentos/${encodeURIComponent(idDe(consulta))}/cancelar`,
                            { method: "PUT" }
                        );

                        mostrarMensagem(
                            $("#appointment-message"),
                            resultado.mensagem || "Consulta cancelada.",
                            "success"
                        );

                        await carregarAgendamentos();
                    } catch (erro) {
                        mostrarMensagem(
                            $("#appointment-message"),
                            erro.message,
                            "error"
                        );

                        botao.disabled = false;
                    }
                });

                card.append(botao);
            }

            lista.append(card);
        }
    } catch (erro) {
        lista.replaceChildren();
        criarVazio(lista, "Não foi possível carregar as consultas.");
        mostrarMensagem($("#appointment-message"), erro.message, "error");
    }
}

$("#reload-appointments").addEventListener("click", carregarAgendamentos);

$("#appointment-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const mensagem = $("#appointment-message");
    const botao = evento.submitter;

    const dados = {
        profissionalId: $("#appointment-professional").value,
        data: $("#appointment-date").value,
        hora: $("#appointment-time").value
    };

    if (!dados.profissionalId) {
        mostrarMensagem(
            mensagem,
            "Selecione um profissional.",
            "error"
        );
        return;
    }

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao("/agendamentos", {
            method: "POST",
            body: JSON.stringify(dados)
        });

        $("#appointment-form").reset();
        $("#appointment-date").min = dataLocalAtual();

        mostrarMensagem(
            mensagem,
            resultado.mensagem || "Consulta agendada com sucesso!",
            "success"
        );

        await carregarAgendamentos();
    } catch (erro) {
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// ==========================================
// PERFIL DO PACIENTE
// ==========================================

async function carregarPerfil() {
    if (!usuarioAtual?.pacienteId) {
        throw new Error("Sua conta não possui um paciente vinculado.");
    }

    const resultado = await requisicao(
        `/pacientes/${encodeURIComponent(usuarioAtual.pacienteId)}`
    );

    pacienteAtual = objetoDe(resultado, ["paciente"]);

    $("#profile-nome").value = pacienteAtual.nome || "";
    $("#profile-email").value = pacienteAtual.email || usuarioAtual.email || "";
    $("#profile-cpf").value = pacienteAtual.cpf || "";
    $("#profile-nascimento").value = pacienteAtual.dataNascimento || "";
    $("#profile-telefone").value = pacienteAtual.telefone || "";
    $("#profile-endereco").value = pacienteAtual.endereco || "";

    // O paciente pode editar apenas os campos permitidos pela API.
    $("#profile-email").disabled = true;
    $("#profile-cpf").disabled = true;
    $("#profile-nascimento").disabled = true;
}

$("#profile-form").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const mensagem = $("#profile-message");
    const botao = evento.submitter;

    if (!usuarioAtual?.pacienteId) {
        mensagemDeErro(
            mensagem,
            new Error("Não foi encontrado um paciente vinculado à conta.")
        );
        return;
    }

    const dados = {
        nome: $("#profile-nome").value.trim(),
        telefone: $("#profile-telefone").value.trim(),
        endereco: $("#profile-endereco").value.trim()
    };

    if (botao) botao.disabled = true;

    try {
        const resultado = await requisicao(
            `/pacientes/${encodeURIComponent(usuarioAtual.pacienteId)}`,
            {
                method: "PUT",
                body: JSON.stringify(dados)
            }
        );

        mostrarMensagem(
            mensagem,
            resultado.mensagem || "Dados atualizados com sucesso!",
            "success"
        );

        usuarioAtual.nome = dados.nome;
        $("#user-name").textContent = dados.nome;
    } catch (erro) {
        mensagemDeErro(mensagem, erro);
    } finally {
        if (botao) botao.disabled = false;
    }
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function iniciarAplicacao() {
    await verificarConexao();

    if (!token) {
        mostrarAutenticacao();
        return;
    }

    try {
        await iniciarSessao();
    } catch (erro) {
        console.warn("Sessão não restaurada:", erro.message);
        encerrarSessao();
    }
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./service-worker.js")
            .then(() => {
                console.log("Service Worker registrado com sucesso.");
            })
            .catch((erro) => {
                console.error(
                    "Erro ao registrar o Service Worker:",
                    erro
                );
            });
    });
}

iniciarAplicacao();
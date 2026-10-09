
const CACHE_NAME = "clinagenda-static-v1";

const ARQUIVOS_APP = [
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icon.svg"
];

self.addEventListener("install", (evento) => {
    evento.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(ARQUIVOS_APP);
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (evento) => {
    evento.waitUntil(
        (async () => {
            const cachesExistentes = await caches.keys();

            await Promise.all(
                cachesExistentes
                    .filter(
                        (nome) =>
                            nome.startsWith("clinagenda-static-") &&
                            nome !== CACHE_NAME
                    )
                    .map((nome) => caches.delete(nome))
            );

            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (evento) => {
    const requisicao = evento.request;

    if (requisicao.method !== "GET") {
        return;
    }

    const url = new URL(requisicao.url);

    // Não armazenar dados da API nem respostas de outros sites.
    if (url.origin !== self.location.origin) {
        return;
    }

    evento.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            try {
                const resposta = await fetch(requisicao);

                if (resposta.ok) {
                    await cache.put(requisicao, resposta.clone());
                }

                return resposta;
            } catch {
                const respostaEmCache = await cache.match(requisicao);

                if (respostaEmCache) {
                    return respostaEmCache;
                }

                if (requisicao.mode === "navigate") {
                    const paginaInicial = new URL(
                        "./index.html",
                        self.registration.scope
                    );

                    const paginaEmCache = await cache.match(
                        paginaInicial.href
                    );

                    if (paginaEmCache) {
                        return paginaEmCache;
                    }
                }

                return new Response(
                    "Este recurso não está disponível offline.",
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "text/plain; charset=utf-8"
                        }
                    }
                );
            }
        })()
    );
});
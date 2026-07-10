const PERIODOS = [
  { chave: "1d", rotulo: "Diário" },
  { chave: "5d", rotulo: "Semanal" },
  { chave: "1mo", rotulo: "Mensal" },
  { chave: "ytd", rotulo: "YTD" },
  { chave: "1y", rotulo: "1 Ano" },
  { chave: "3y", rotulo: "3 Anos" },
  { chave: "max", rotulo: "Tudo" },
];

function formatarPct(valor) {
  if (valor === null || valor === undefined) return "--";
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toFixed(2)}%`;
}

function classePct(valor) {
  if (valor === null || valor === undefined) return "";
  return valor >= 0 ? "positivo" : "negativo";
}

function faviconDoLink(link) {
  try {
    const host = new URL(link).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return "";
  }
}

function pontosParaPeriodo(historico, chavePeriodo) {
  const agora = new Date();

  if (chavePeriodo === "1d") {
    return historico.intradiario.ok ? historico.intradiario.pontos : [];
  }

  const diario = historico.diario.ok ? historico.diario.pontos : [];
  const longoPrazo = historico.longo_prazo.ok ? historico.longo_prazo.pontos : [];

  if (chavePeriodo === "5d") {
    const limite = new Date(agora); limite.setDate(limite.getDate() - 7);
    return diario.filter((p) => new Date(p.quando) >= limite);
  }
  if (chavePeriodo === "1mo") {
    const limite = new Date(agora); limite.setDate(limite.getDate() - 31);
    return diario.filter((p) => new Date(p.quando) >= limite);
  }
  if (chavePeriodo === "ytd") {
    return diario.filter((p) => new Date(p.quando).getFullYear() === agora.getFullYear());
  }
  if (chavePeriodo === "1y") {
    const limite = new Date(agora); limite.setFullYear(limite.getFullYear() - 1);
    return diario.filter((p) => new Date(p.quando) >= limite);
  }
  if (chavePeriodo === "3y") {
    const limite = new Date(agora); limite.setFullYear(limite.getFullYear() - 3);
    return longoPrazo.filter((p) => new Date(p.quando) >= limite);
  }
  return longoPrazo;
}

function variacaoDoPeriodo(pontos) {
  if (!pontos || pontos.length < 2) return null;
  const primeiro = pontos[0].fecho;
  const ultimo = pontos[pontos.length - 1].fecho;
  if (!primeiro) return null;
  return ((ultimo - primeiro) / primeiro) * 100;
}

function desenharGrafico(canvas, pontos, cor, comInteracao) {
  if (!pontos || pontos.length === 0) return null;

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: pontos.map((p) => p.quando),
      datasets: [{
        data: pontos.map((p) => p.fecho),
        borderColor: cor,
        backgroundColor: cor + "22",
        fill: true,
        pointRadius: 0,
        tension: 0.15,
        borderWidth: comInteracao ? 2 : 1.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: comInteracao ? { mode: "index", intersect: false } : false,
      plugins: {
        legend: { display: false },
        tooltip: comInteracao ? {
          callbacks: {
            title: (itens) => new Date(itens[0].label).toLocaleString("pt-PT"),
            label: (item) => `${item.parsed.y.toFixed(2)} €`,
          },
        } : { enabled: false },
      },
      scales: comInteracao
        ? {
            x: {
              display: true,
              ticks: {
                color: "#9a9ea8",
                maxTicksLimit: 6,
                callback: (valor, indice) => {
                  const data = new Date(pontos[indice]?.quando);
                  const temHora = pontos.length > 0 && pontos[0].quando.length > 10 && pontos.length < 200;
                  return temHora
                    ? data.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : data.toLocaleDateString("pt-PT");
                },
              },
              grid: { color: "#2a2d34" },
            },
            y: { display: true, ticks: { color: "#9a9ea8" }, grid: { color: "#2a2d34" } },
          }
        : { x: { display: false }, y: { display: false } },
    },
  });
}

function listaNoticiasHtml(noticias) {
  return (noticias || []).map((n) => `
    <li>
      <img class="favicon-noticia" src="${faviconDoLink(n.link)}" alt="" />
      <a href="${n.link}" target="_blank" rel="noopener">${n.titulo}</a> — ${n.fonte}
    </li>
  `).join("");
}

function criarCartaoCompacto(ativo, aoClicar) {
  const div = document.createElement("div");
  div.className = "cartao-ativo clicavel";

  const preco = ativo.preco || {};
  const precoAtual = preco.ok ? `${preco.preco_atual.toFixed(2)}€` : "sem dados";
  const variacaoHoje = preco.ok ? preco.variacao_pct : null;

  div.innerHTML = `
    <h3>${ativo.nome}</h3>
    <a class="ticker" href="https://finance.yahoo.com/quote/${encodeURIComponent(ativo.ticker)}" target="_blank" rel="noopener">${ativo.ticker}</a>
    <div class="linha-preco">
      <span class="preco-atual">${precoAtual}</span>
      <span class="${classePct(variacaoHoje)}">${formatarPct(variacaoHoje)} hoje</span>
    </div>
    <div class="mini-grafico-wrap"><canvas class="mini-grafico"></canvas></div>
    <p class="comentario">${(ativo.comentario || "").slice(0, 110)}${(ativo.comentario || "").length > 110 ? "…" : ""}</p>
  `;

  const canvasMini = div.querySelector(".mini-grafico");
  const pontosMini = pontosParaPeriodo(ativo.historico, "1mo");
  const corMini = (variacaoHoje ?? 0) < 0 ? "#e5484d" : "#35c46a";
  requestAnimationFrame(() => desenharGrafico(canvasMini, pontosMini, corMini, false));

  div.querySelector(".ticker").addEventListener("click", (e) => e.stopPropagation());
  div.addEventListener("click", () => aoClicar(ativo));

  return div;
}

function popularModal(ativo) {
  const corpo = document.getElementById("modal-corpo");
  const preco = ativo.preco || {};
  const precoAtual = preco.ok ? `${preco.preco_atual.toFixed(2)}€` : "sem dados";
  const variacaoHoje = preco.ok ? preco.variacao_pct : null;

  const botoesPeriodo = PERIODOS.map((p) =>
    `<button data-periodo="${p.chave}">${p.rotulo}</button>`
  ).join("");

  corpo.innerHTML = `
    <h2>${ativo.nome}</h2>
    <a class="ticker" href="https://finance.yahoo.com/quote/${encodeURIComponent(ativo.ticker)}" target="_blank" rel="noopener">${ativo.ticker} ↗</a>
    <div class="linha-preco">
      <span class="preco-atual">${precoAtual}</span>
      <span class="${classePct(variacaoHoje)}">${formatarPct(variacaoHoje)} hoje</span>
    </div>
    <div class="seletor-periodo">${botoesPeriodo}</div>
    <div class="area-grafico">
      <canvas id="grafico-modal" height="110"></canvas>
      <p class="sem-dados-periodo" style="display:none">Sem dados para este período.</p>
    </div>
    <p class="comentario">${ativo.comentario || ""}</p>
    <h3 class="titulo-seccao" style="margin-top:20px">Notícias</h3>
    <ul class="lista-noticias">${listaNoticiasHtml(ativo.noticias)}</ul>
  `;

  const canvas = document.getElementById("grafico-modal");
  const mensagemSemDados = corpo.querySelector(".sem-dados-periodo");
  const botoes = corpo.querySelectorAll(".seletor-periodo button");
  let graficoAtual = null;

  function selecionarPeriodo(chavePeriodo) {
    botoes.forEach((b) => b.classList.toggle("ativo", b.dataset.periodo === chavePeriodo));
    const pontos = pontosParaPeriodo(ativo.historico, chavePeriodo);

    if (graficoAtual) { graficoAtual.destroy(); graficoAtual = null; }

    if (pontos.length === 0) {
      canvas.style.display = "none";
      mensagemSemDados.style.display = "block";
      return;
    }

    canvas.style.display = "block";
    mensagemSemDados.style.display = "none";
    const variacaoPeriodo = variacaoDoPeriodo(pontos);
    const cor = variacaoPeriodo !== null && variacaoPeriodo < 0 ? "#e5484d" : "#35c46a";
    graficoAtual = desenharGrafico(canvas, pontos, cor, true);
  }

  botoes.forEach((b) => b.addEventListener("click", () => selecionarPeriodo(b.dataset.periodo)));
  selecionarPeriodo("1mo");
}

function abrirModal(ativo) {
  popularModal(ativo);
  document.getElementById("modal-ativo").classList.remove("escondido");
}

function fecharModalAtivo() {
  document.getElementById("modal-ativo").classList.add("escondido");
  document.getElementById("modal-corpo").innerHTML = "";
}

async function iniciar() {
  const resposta = await fetch("data.json", { cache: "no-store" });
  const dados = await resposta.json();

  window.__dadosCarteira = dados;

  const atualizadoEm = new Date(dados.atualizado_em);
  document.getElementById("atualizado-em").textContent =
    "Última atualização: " + atualizadoEm.toLocaleString("pt-PT");

  document.getElementById("analise-geral-texto").textContent = dados.analise_geral;

  const listaPosicoes = document.getElementById("lista-posicoes");
  const listaWatchlist = document.getElementById("lista-watchlist");

  dados.ativos.forEach((ativo) => {
    const cartao = criarCartaoCompacto(ativo, abrirModal);
    if (ativo.categoria === "posicao") {
      listaPosicoes.appendChild(cartao);
    } else {
      listaWatchlist.appendChild(cartao);
    }
  });

  document.getElementById("fechar-modal").addEventListener("click", fecharModalAtivo);
  document.getElementById("modal-ativo").addEventListener("click", (e) => {
    if (e.target.id === "modal-ativo") fecharModalAtivo();
  });
}

iniciar().catch((erro) => {
  document.getElementById("atualizado-em").textContent =
    "Erro ao carregar dados: " + erro.message;
});

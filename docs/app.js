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

function desenharGrafico(canvas, graficoAnterior, pontos, cor) {
  if (graficoAnterior) graficoAnterior.destroy();
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
      }],
    },
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: true, ticks: { color: "#9a9ea8" }, grid: { color: "#2a2d34" } },
      },
    },
  });
}

function criarCartaoAtivo(ativo) {
  const div = document.createElement("div");
  div.className = "cartao-ativo";

  const preco = ativo.preco || {};
  const precoAtual = preco.ok ? `${preco.preco_atual.toFixed(2)}€` : "sem dados";
  const variacaoHoje = preco.ok ? preco.variacao_pct : null;

  const noticiasHtml = (ativo.noticias || []).map((n) =>
    `<li><a href="${n.link}" target="_blank" rel="noopener">${n.titulo}</a> — ${n.fonte}</li>`
  ).join("");

  const botoesPeriodo = PERIODOS.map((p) =>
    `<button data-periodo="${p.chave}">${p.rotulo}</button>`
  ).join("");

  div.innerHTML = `
    <h3>${ativo.nome}</h3>
    <a class="ticker" href="https://finance.yahoo.com/quote/${encodeURIComponent(ativo.ticker)}" target="_blank" rel="noopener">${ativo.ticker}</a>
    <div class="linha-preco">
      <span class="preco-atual">${precoAtual}</span>
      <span class="${classePct(variacaoHoje)}">${formatarPct(variacaoHoje)} hoje</span>
    </div>
    <div class="seletor-periodo">${botoesPeriodo}</div>
    <div class="area-grafico">
      <canvas class="grafico-ativo" height="60"></canvas>
      <p class="sem-dados-periodo" style="display:none">Sem dados para este período.</p>
    </div>
    <p class="comentario">${ativo.comentario || ""}</p>
    <ul class="lista-noticias">${noticiasHtml}</ul>
  `;

  const canvas = div.querySelector(".grafico-ativo");
  const mensagemSemDados = div.querySelector(".sem-dados-periodo");
  const botoes = div.querySelectorAll(".seletor-periodo button");
  let graficoAtual = null;

  function selecionarPeriodo(chavePeriodo) {
    botoes.forEach((b) => b.classList.toggle("ativo", b.dataset.periodo === chavePeriodo));
    const pontos = pontosParaPeriodo(ativo.historico, chavePeriodo);

    if (pontos.length === 0) {
      canvas.style.display = "none";
      mensagemSemDados.style.display = "block";
      if (graficoAtual) { graficoAtual.destroy(); graficoAtual = null; }
      return;
    }

    canvas.style.display = "block";
    mensagemSemDados.style.display = "none";
    const variacaoPeriodo = variacaoDoPeriodo(pontos);
    const cor = variacaoPeriodo !== null && variacaoPeriodo < 0 ? "#e5484d" : "#35c46a";
    graficoAtual = desenharGrafico(canvas, graficoAtual, pontos, cor);
  }

  botoes.forEach((b) => b.addEventListener("click", () => selecionarPeriodo(b.dataset.periodo)));
  requestAnimationFrame(() => selecionarPeriodo("1mo"));

  return div;
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
    const cartao = criarCartaoAtivo(ativo);
    if (ativo.categoria === "posicao") {
      listaPosicoes.appendChild(cartao);
    } else {
      listaWatchlist.appendChild(cartao);
    }
  });
}

iniciar().catch((erro) => {
  document.getElementById("atualizado-em").textContent =
    "Erro ao carregar dados: " + erro.message;
});

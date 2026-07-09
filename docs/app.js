function formatarEuro(valor) {
  if (valor === null || valor === undefined) return "--";
  return valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function formatarPct(valor) {
  if (valor === null || valor === undefined) return "--";
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toFixed(2)}%`;
}

function classePct(valor) {
  if (valor === null || valor === undefined) return "";
  return valor >= 0 ? "positivo" : "negativo";
}

function criarGraficoLinha(canvas, pontos, cor) {
  if (!pontos || pontos.length === 0) return;
  new Chart(canvas, {
    type: "line",
    data: {
      labels: pontos.map((p) => p.data),
      datasets: [{
        data: pontos.map((p) => p.fecho ?? p.valor),
        borderColor: cor,
        backgroundColor: cor + "22",
        fill: true,
        pointRadius: 0,
        tension: 0.15,
      }],
    },
    options: {
      responsive: true,
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
  const precoAtual = preco.ok ? formatarEuro(preco.preco_atual) : "sem dados";
  const variacao = preco.ok ? preco.variacao_pct : null;

  const linhaGanhoPerda = ativo.categoria === "posicao"
    ? `<div class="linha-preco"><span class="rotulo">Desde a compra</span>
        <span class="${classePct(ativo.ganho_perda_pct)}">${formatarPct(ativo.ganho_perda_pct)}</span></div>`
    : "";

  const noticiasHtml = (ativo.noticias || []).map((n) =>
    `<li><a href="${n.link}" target="_blank" rel="noopener">${n.titulo}</a> — ${n.fonte}</li>`
  ).join("");

  div.innerHTML = `
    <h3>${ativo.nome}</h3>
    <span class="ticker">${ativo.ticker}</span>
    <div class="linha-preco">
      <span class="preco-atual">${precoAtual}</span>
      <span class="${classePct(variacao)}">${formatarPct(variacao)}</span>
    </div>
    ${linhaGanhoPerda}
    <canvas class="grafico-ativo" height="60"></canvas>
    <p class="comentario">${ativo.comentario || ""}</p>
    <ul class="lista-noticias">${noticiasHtml}</ul>
  `;

  const canvas = div.querySelector(".grafico-ativo");
  const pontos = (ativo.historico && ativo.historico.ok) ? ativo.historico.pontos.slice(-90) : [];
  const cor = variacao !== null && variacao < 0 ? "#e5484d" : "#35c46a";
  requestAnimationFrame(() => criarGraficoLinha(canvas, pontos, cor));

  return div;
}

async function iniciar() {
  const resposta = await fetch("data.json", { cache: "no-store" });
  const dados = await resposta.json();

  const atualizadoEm = new Date(dados.atualizado_em);
  document.getElementById("atualizado-em").textContent =
    "Ultima atualizacao: " + atualizadoEm.toLocaleString("pt-PT");

  const resumo = dados.resumo_portfolio;
  document.getElementById("total-investido").textContent = formatarEuro(resumo.total_investido);
  document.getElementById("total-atual").textContent = formatarEuro(resumo.total_atual);

  const elGanhoPerda = document.getElementById("ganho-perda-total");
  elGanhoPerda.textContent = formatarPct(resumo.ganho_perda_pct);
  elGanhoPerda.className = "valor " + classePct(resumo.ganho_perda_pct);

  document.getElementById("analise-geral-texto").textContent = resumo.analise;

  criarGraficoLinha(
    document.getElementById("grafico-historico-portfolio"),
    resumo.historico,
    "#5b8def"
  );

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

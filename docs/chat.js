const CHAVE_LOCALSTORAGE = "gemini_api_key";
const MODELO_CHAT = "gemini-3.5-flash";

const botaoChat = document.getElementById("botao-chat");
const painelChat = document.getElementById("painel-chat");
const fecharChat = document.getElementById("fechar-chat");
const expandirChat = document.getElementById("expandir-chat");
const trocarChaveBtn = document.getElementById("trocar-chave");
const chatConfig = document.getElementById("chat-config");
const inputChave = document.getElementById("input-chave");
const guardarChaveBtn = document.getElementById("guardar-chave");
const chatMensagens = document.getElementById("chat-mensagens");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

let historicoConversa = [];

function atualizarVisibilidadeConfig() {
  const temChave = !!localStorage.getItem(CHAVE_LOCALSTORAGE);
  chatConfig.classList.toggle("escondido", temChave);
}

function adicionarMensagem(texto, autor) {
  const div = document.createElement("div");
  div.className = `mensagem ${autor}`;
  div.textContent = texto;
  chatMensagens.appendChild(div);
  chatMensagens.scrollTop = chatMensagens.scrollHeight;
}

function contextoDaCarteira() {
  const dados = window.__dadosCarteira;
  if (!dados) return "Sem dados da carteira disponiveis neste momento.";

  const linhas = dados.ativos.map((a) => {
    const preco = a.preco || {};
    const precoTxt = preco.ok ? `${preco.preco_atual.toFixed(2)} EUR (variacao hoje ${(preco.variacao_pct || 0).toFixed(2)}%)` : "sem dados";
    return `- ${a.nome} (${a.ticker}, ${a.categoria}): ${precoTxt}. Comentario: ${a.comentario || "sem comentario"}`;
  }).join("\n");

  return `Analise geral atual: ${dados.analise_geral}\n\nAtivos:\n${linhas}`;
}

async function perguntarAoGemini(pergunta) {
  const chave = localStorage.getItem(CHAVE_LOCALSTORAGE);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_CHAT}:generateContent?key=${encodeURIComponent(chave)}`;

  const instrucaoSistema = `Es um assistente financeiro que responde em portugues de Portugal, de forma
clara e directa. Tens acesso ao estado atual da carteira do utilizador (dados de mercado publicos,
sem valores monetarios pessoais) e a uma ferramenta de pesquisa Google em tempo real. USA SEMPRE a
pesquisa quando a pergunta envolver factos atuais (taxas de juro, decisoes de bancos centrais,
noticias recentes, precos) em vez de responderes so com conhecimento antigo — o teu conhecimento
interno pode estar desatualizado. Podes discutir tendencias e dar sugestoes educativas, mas deixa
sempre claro que nao es um consultor financeiro licenciado e que a decisao final e do utilizador.

Contexto atual da carteira:
${contextoDaCarteira()}`;

  historicoConversa.push({ role: "user", parts: [{ text: pergunta }] });

  const corpo = {
    contents: historicoConversa,
    systemInstruction: { parts: [{ text: instrucaoSistema }] },
    tools: [{ google_search: {} }],
  };

  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  const dadosResposta = await resposta.json();

  if (!resposta.ok) {
    const mensagemErro = dadosResposta?.error?.message || `Erro ${resposta.status}`;
    throw new Error(mensagemErro);
  }

  const candidato = dadosResposta?.candidates?.[0];
  let texto = candidato?.content?.parts?.map((p) => p.text).join("") || "";

  const fontes = candidato?.groundingMetadata?.groundingChunks
    ?.map((c) => c.web?.uri)
    .filter(Boolean);
  if (fontes && fontes.length > 0) {
    const unicas = [...new Set(fontes)].slice(0, 4);
    texto += "\n\nFontes: " + unicas.join(", ");
  }

  historicoConversa.push({ role: "model", parts: [{ text: texto }] });
  return texto;
}

botaoChat.addEventListener("click", () => {
  painelChat.classList.remove("escondido");
  botaoChat.style.display = "none";
});

fecharChat.addEventListener("click", () => {
  painelChat.classList.add("escondido");
  botaoChat.style.display = "block";
});

expandirChat.addEventListener("click", () => {
  painelChat.classList.toggle("expandido");
});

trocarChaveBtn.addEventListener("click", () => {
  localStorage.removeItem(CHAVE_LOCALSTORAGE);
  atualizarVisibilidadeConfig();
  adicionarMensagem("Chave removida. Introduz uma nova chave acima para continuares.", "assistente");
});

guardarChaveBtn.addEventListener("click", () => {
  const valor = inputChave.value.trim();
  if (!valor) return;
  localStorage.setItem(CHAVE_LOCALSTORAGE, valor);
  inputChave.value = "";
  atualizarVisibilidadeConfig();
  adicionarMensagem("Chave guardada. Podes começar a perguntar.", "assistente");
});

chatForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const pergunta = chatInput.value.trim();
  if (!pergunta) return;

  if (!localStorage.getItem(CHAVE_LOCALSTORAGE)) {
    adicionarMensagem("Guarda primeiro a tua chave da API do Gemini acima.", "assistente");
    return;
  }

  adicionarMensagem(pergunta, "utilizador");
  chatInput.value = "";

  try {
    const resposta = await perguntarAoGemini(pergunta);
    adicionarMensagem(resposta || "(sem resposta)", "assistente");
  } catch (erro) {
    adicionarMensagem(`Erro ao contactar o Gemini: ${erro.message}`, "assistente");
  }
});

atualizarVisibilidadeConfig();

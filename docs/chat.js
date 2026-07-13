const CHAVE_LOCALSTORAGE = "groq_api_key";
const MODELO_CHAT = "llama-3.3-70b-versatile";
const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";

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

  return `Analise geral atual (gerada ${dados.atualizado_em}): ${dados.analise_geral}\n\nAtivos:\n${linhas}`;
}

async function perguntarAoAssistente(pergunta) {
  const chave = localStorage.getItem(CHAVE_LOCALSTORAGE);

  const instrucaoSistema = `Es um assistente financeiro que responde em portugues de Portugal, de forma
clara e directa. Tens acesso ao estado atual da carteira do utilizador (dados de mercado publicos,
sem valores monetarios pessoais), recolhidos automaticamente ha poucos minutos. O teu conhecimento
geral pode ter uma data de corte anterior a hoje, por isso para factos muito recentes (ex: decisoes
de bancos centrais desta semana) admite essa limitacao em vez de inventar. Podes discutir tendencias
e dar sugestoes educativas, mas deixa sempre claro que nao es um consultor financeiro licenciado e
que a decisao final e do utilizador.

Contexto atual da carteira:
${contextoDaCarteira()}`;

  if (historicoConversa.length === 0) {
    historicoConversa.push({ role: "system", content: instrucaoSistema });
  }
  historicoConversa.push({ role: "user", content: pergunta });

  const resposta = await fetch(URL_GROQ, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: MODELO_CHAT,
      messages: historicoConversa,
    }),
  });

  const dadosResposta = await resposta.json();

  if (!resposta.ok) {
    const mensagemErro = dadosResposta?.error?.message || `Erro ${resposta.status}`;
    throw new Error(mensagemErro);
  }

  const texto = dadosResposta?.choices?.[0]?.message?.content || "";
  historicoConversa.push({ role: "assistant", content: texto });
  return texto;
}

botaoChat.addEventListener("click", () => {
  painelChat.classList.remove("escondido");
  botaoChat.style.display = "none";
  chatInput.focus();
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
    adicionarMensagem("Guarda primeiro a tua chave da API da Groq acima.", "assistente");
    return;
  }

  adicionarMensagem(pergunta, "utilizador");
  chatInput.value = "";

  try {
    const resposta = await perguntarAoAssistente(pergunta);
    adicionarMensagem(resposta || "(sem resposta)", "assistente");
  } catch (erro) {
    adicionarMensagem(`Erro ao contactar o assistente: ${erro.message}`, "assistente");
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !painelChat.classList.contains("escondido")) {
    painelChat.classList.add("escondido");
    botaoChat.style.display = "block";
  }
});

atualizarVisibilidadeConfig();

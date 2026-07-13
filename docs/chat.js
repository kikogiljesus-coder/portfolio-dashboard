const CHAVE_LOCALSTORAGE = "groq_api_key";
const MODELO_CHAT = "groq/compound";
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
const botaoMicrofone = document.getElementById("botao-microfone");

let historicoConversa = [];

function iniciarMicrofone() {
  const ClasseReconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!ClasseReconhecimento) {
    botaoMicrofone.classList.add("escondido");
    return;
  }

  const reconhecimento = new ClasseReconhecimento();
  reconhecimento.lang = "pt-PT";
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 1;

  let aGravar = false;

  reconhecimento.addEventListener("result", (evento) => {
    const transcricao = evento.results[0][0].transcript;
    chatInput.value = transcricao;
    chatInput.focus();
  });

  reconhecimento.addEventListener("end", () => {
    aGravar = false;
    botaoMicrofone.classList.remove("gravando");
  });

  reconhecimento.addEventListener("error", () => {
    aGravar = false;
    botaoMicrofone.classList.remove("gravando");
  });

  botaoMicrofone.addEventListener("click", () => {
    if (aGravar) {
      reconhecimento.stop();
      return;
    }
    aGravar = true;
    botaoMicrofone.classList.add("gravando");
    reconhecimento.start();
  });
}

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

  const instrucaoSistema = `Es um analista financeiro senior, meticuloso e directo, que responde sempre
em portugues de Portugal. Tens acesso a pesquisa na web em tempo real — usa-a sempre que a pergunta
envolver factos atuais (taxas de juro, resultados trimestrais, noticias desta semana, precos de
mercado) em vez de depender só do teu conhecimento interno, que pode estar desatualizado.

Tens tambem acesso ao estado atual da carteira do utilizador (dados de mercado publicos, sem valores
monetarios pessoais), recolhidos automaticamente ha poucos minutos.

Quando o utilizador pedir uma analise ou opiniao sobre um ativo ou sobre a carteira, estrutura a
resposta em blocos curtos: (1) Contexto atual — o que se passa agora; (2) Fatores relevantes —
noticias, tendencias macro, coisas a vigiar; (3) Riscos; (4) Sugestao — uma perspetiva concreta e
fundamentada (nunca uma ordem categorica de compra/venda). Para perguntas simples, responde de forma
directa e proporcional, sem forçar esta estrutura toda.

Deixa sempre claro, pelo menos uma vez na conversa, que nao es um consultor financeiro licenciado e
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
iniciarMicrofone();

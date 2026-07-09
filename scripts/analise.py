import os
import sys
import time

from google import genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODELO = "gemini-3.5-flash"
TENTATIVAS = 3
ESPERA_ENTRE_TENTATIVAS_SEG = 5

_cliente = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


def _gerar(prompt):
    if _cliente is None:
        print("AVISO: GEMINI_API_KEY nao definida, a saltar chamada ao Gemini.", file=sys.stderr)
        return None

    for tentativa in range(1, TENTATIVAS + 1):
        try:
            resposta = _cliente.models.generate_content(model=MODELO, contents=prompt)
            return resposta.text.strip()
        except Exception as erro:
            print(f"ERRO ao chamar o Gemini (tentativa {tentativa}/{TENTATIVAS}): {erro!r}", file=sys.stderr)
            if tentativa < TENTATIVAS:
                time.sleep(ESPERA_ENTRE_TENTATIVAS_SEG)

    return None


def comentario_ativo(nome, preco_atual, variacao_pct, ganho_perda_pct, noticias):
    linhas_noticias = "\n".join(f"- {n['titulo']} ({n['fonte']})" for n in noticias) or "Sem noticias relevantes hoje."

    contexto_posicao = (
        f"Ganho/perda desde a compra: {ganho_perda_pct:+.2f}%."
        if ganho_perda_pct is not None else
        "Este ativo esta apenas a ser acompanhado (sem posicao comprada)."
    )

    prompt = f"""
Es um assistente financeiro que escreve em portugues de Portugal, de forma clara e directa.

Ativo: {nome}
Preco atual: {preco_atual:.2f} EUR
Variacao hoje: {variacao_pct:+.2f}%
{contexto_posicao}

Noticias recentes:
{linhas_noticias}

Escreve um comentario muito breve (maximo 60 palavras) sobre este ativo especificamente:
o que se passou hoje, se alguma noticia e relevante, e uma sugestao muito breve se fizer
sentido (nunca uma recomendacao categorica, sempre como sugestao).
"""
    texto = _gerar(prompt)
    return texto or "(Analise automatica indisponivel hoje para este ativo.)"


def analise_portfolio(resumo_geral, destaques_noticias):
    prompt = f"""
Es um assistente financeiro que escreve em portugues de Portugal, de forma clara e directa,
para um investidor nao profissional.

Estado atual de toda a carteira:
{resumo_geral}

Noticias em destaque:
{destaques_noticias}

Escreve uma analise breve (maximo 150 palavras) sobre o estado geral da carteira hoje,
o que mais se destaca, e sugestoes de acao SE fizerem sentido (sem nunca serem
recomendacoes categoricas).
"""
    texto = _gerar(prompt)
    return texto or "(Analise automatica indisponivel hoje.)"

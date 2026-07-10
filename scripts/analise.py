import json
import os
import sys
import time

from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODELO = "gemini-3.5-flash"
TENTATIVAS = 2
ESPERA_ENTRE_TENTATIVAS_SEG = 5

_cliente = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

ESQUEMA_RESPOSTA = {
    "type": "object",
    "properties": {
        "analise_geral": {"type": "string"},
        "comentarios": {
            "type": "object",
            "additionalProperties": {"type": "string"},
        },
    },
    "required": ["analise_geral", "comentarios"],
}


def gerar_analise_completa(ativos):
    """Faz UMA UNICA chamada ao Gemini para gerar a analise geral e os
    comentarios de todos os ativos, para poupar quota (o plano gratuito
    do gemini-3.5-flash so permite 20 pedidos por dia)."""

    if _cliente is None:
        print("AVISO: GEMINI_API_KEY nao definida, a saltar chamada ao Gemini.", file=sys.stderr)
        return None

    blocos = []
    for a in ativos:
        linhas_noticias = "\n".join(f"  - {n['titulo']} ({n['fonte']})" for n in a["noticias"]) or "  Sem noticias relevantes."
        blocos.append(
            f"Ticker: {a['ticker']}\nNome: {a['nome']}\nPreco atual: {a['preco_atual']:.2f} EUR\n"
            f"Variacao hoje: {a['variacao_pct']:+.2f}%\nNoticias recentes:\n{linhas_noticias}"
        )
    contexto = "\n\n".join(blocos)

    prompt = f"""
Es um assistente financeiro que escreve em portugues de Portugal, de forma clara e directa,
para um investidor nao profissional. Nunca dás recomendações categóricas, só sugestões.

Aqui está o estado atual de cada ativo da carteira:

{contexto}

Responde em JSON com exactamente esta forma:
{{
  "analise_geral": "uma analise breve (max 150 palavras) sobre o estado geral da carteira hoje, o que mais se destaca, e sugestoes de accao se fizerem sentido",
  "comentarios": {{
    "TICKER1": "comentario breve (max 60 palavras) sobre este ativo especificamente",
    "TICKER2": "..."
  }}
}}

Inclui uma entrada em "comentarios" para cada um dos tickers listados acima, usando exactamente
o mesmo texto de ticker como chave.
"""

    for tentativa in range(1, TENTATIVAS + 1):
        try:
            resposta = _cliente.models.generate_content(
                model=MODELO,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ESQUEMA_RESPOSTA,
                ),
            )
            return json.loads(resposta.text)
        except Exception as erro:
            print(f"ERRO ao chamar o Gemini (tentativa {tentativa}/{TENTATIVAS}): {erro!r}", file=sys.stderr)
            if tentativa < TENTATIVAS:
                time.sleep(ESPERA_ENTRE_TENTATIVAS_SEG)

    return None

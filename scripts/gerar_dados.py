import json
import os
from datetime import datetime, timezone

from config import CARTEIRA
from precos import obter_preco, obter_historico_completo
from noticias import buscar_noticias
from analise import comentario_ativo, analise_portfolio

CAMINHO_SAIDA = os.path.join(os.path.dirname(__file__), "..", "docs", "data.json")


def processar_ativo(ativo):
    preco = obter_preco(ativo["ticker"])
    historico = obter_historico_completo(ativo["ticker"])
    noticias = buscar_noticias(ativo["noticia_query"], max_resultados=4)

    comentario = None
    if preco["ok"]:
        comentario = comentario_ativo(ativo["nome"], preco["preco_atual"], preco["variacao_pct"] or 0.0, noticias)

    return {
        "ticker": ativo["ticker"],
        "nome": ativo["nome"],
        "categoria": ativo["categoria"],
        "preco": preco,
        "historico": historico,
        "noticias": noticias,
        "comentario": comentario,
    }


def main():
    ativos_processados = [processar_ativo(a) for a in CARTEIRA]

    resumo_geral = "\n".join(
        f"{a['nome']}: {a['preco']['preco_atual']:.2f} EUR, variacao hoje {(a['preco']['variacao_pct'] or 0):+.2f}%"
        for a in ativos_processados if a["preco"]["ok"]
    )
    destaques_noticias = "\n".join(
        f"{a['nome']}: " + "; ".join(n["titulo"] for n in a["noticias"][:2])
        for a in ativos_processados if a["noticias"]
    )

    dados_finais = {
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
        "analise_geral": analise_portfolio(resumo_geral, destaques_noticias),
        "ativos": ativos_processados,
    }

    os.makedirs(os.path.dirname(CAMINHO_SAIDA), exist_ok=True)
    with open(CAMINHO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados_finais, f, ensure_ascii=False, indent=2)

    print(f"data.json gerado com sucesso em {CAMINHO_SAIDA}")


if __name__ == "__main__":
    main()

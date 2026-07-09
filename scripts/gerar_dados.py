import json
import os
from datetime import datetime, timezone

from config import CARTEIRA
from precos import obter_preco, obter_historico
from noticias import buscar_noticias
from analise import comentario_ativo, analise_portfolio

CAMINHO_SAIDA = os.path.join(os.path.dirname(__file__), "..", "docs", "data.json")


def construir_historico_portfolio(ativos_processados):
    posicoes = [a for a in ativos_processados if a["categoria"] == "posicao" and a["historico"]["ok"]]
    if not posicoes:
        return []

    valores_por_data = {}
    for ativo in posicoes:
        data_compra = ativo["data_compra"]
        for ponto in ativo["historico"]["pontos"]:
            if data_compra and ponto["data"] < data_compra:
                continue
            valores_por_data.setdefault(ponto["data"], 0.0)
            valores_por_data[ponto["data"]] += ativo["quantidade"] * ponto["fecho"]

    return [
        {"data": data, "valor": round(valor, 2)}
        for data, valor in sorted(valores_por_data.items())
    ]


def processar_ativo(ativo):
    preco = obter_preco(ativo["ticker"])
    historico = obter_historico(ativo["ticker"])
    noticias = buscar_noticias(ativo["noticia_query"], max_resultados=4)

    ganho_perda_pct = None
    valor_investido = None
    valor_atual = None

    if preco["ok"] and ativo["categoria"] == "posicao":
        valor_investido = round(ativo["preco_compra"] * ativo["quantidade"], 2)
        valor_atual = round(preco["preco_atual"] * ativo["quantidade"], 2)
        ganho_perda_pct = ((preco["preco_atual"] - ativo["preco_compra"]) / ativo["preco_compra"]) * 100

    comentario = None
    if preco["ok"]:
        comentario = comentario_ativo(
            ativo["nome"], preco["preco_atual"], preco["variacao_pct"] or 0.0,
            ganho_perda_pct, noticias,
        )

    return {
        "ticker": ativo["ticker"],
        "nome": ativo["nome"],
        "categoria": ativo["categoria"],
        "data_compra": ativo["data_compra"],
        "quantidade": ativo["quantidade"],
        "preco_compra": ativo["preco_compra"],
        "preco": preco,
        "historico": historico,
        "valor_investido": valor_investido,
        "valor_atual": valor_atual,
        "ganho_perda_pct": ganho_perda_pct,
        "noticias": noticias,
        "comentario": comentario,
    }


def main():
    ativos_processados = [processar_ativo(a) for a in CARTEIRA]

    posicoes = [a for a in ativos_processados if a["categoria"] == "posicao"]
    total_investido = sum(a["valor_investido"] for a in posicoes if a["valor_investido"] is not None)
    total_atual = sum(a["valor_atual"] for a in posicoes if a["valor_atual"] is not None)
    ganho_perda_total_pct = (
        ((total_atual - total_investido) / total_investido) * 100 if total_investido else None
    )

    resumo_geral = "\n".join(
        f"{a['nome']}: {a['preco']['preco_atual']:.2f} EUR, variacao hoje "
        f"{(a['preco']['variacao_pct'] or 0):+.2f}%"
        + (f", ganho/perda {a['ganho_perda_pct']:+.2f}%" if a["ganho_perda_pct"] is not None else "")
        for a in ativos_processados if a["preco"]["ok"]
    )
    destaques_noticias = "\n".join(
        f"{a['nome']}: " + "; ".join(n["titulo"] for n in a["noticias"][:2])
        for a in ativos_processados if a["noticias"]
    )

    dados_finais = {
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
        "resumo_portfolio": {
            "total_investido": round(total_investido, 2),
            "total_atual": round(total_atual, 2),
            "ganho_perda_pct": ganho_perda_total_pct,
            "analise": analise_portfolio(resumo_geral, destaques_noticias),
            "historico": construir_historico_portfolio(ativos_processados),
        },
        "ativos": ativos_processados,
    }

    os.makedirs(os.path.dirname(CAMINHO_SAIDA), exist_ok=True)
    with open(CAMINHO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados_finais, f, ensure_ascii=False, indent=2)

    print(f"data.json gerado com sucesso em {CAMINHO_SAIDA}")


if __name__ == "__main__":
    main()

import json
import os
import time
from datetime import datetime, timedelta, timezone

from config import CARTEIRA
from precos import obter_preco, obter_historico_completo
from noticias import buscar_noticias
from analise import comentario_ativo, analise_portfolio

CAMINHO_SAIDA = os.path.join(os.path.dirname(__file__), "..", "docs", "data.json")
HORAS_VALIDADE_COMENTARIO = 4


def carregar_dados_anteriores():
    try:
        with open(CAMINHO_SAIDA, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def comentario_ainda_valido(comentario_gerado_em):
    if not comentario_gerado_em:
        return False
    gerado_em = datetime.fromisoformat(comentario_gerado_em)
    return datetime.now(timezone.utc) - gerado_em < timedelta(hours=HORAS_VALIDADE_COMENTARIO)


def processar_ativo(ativo, anteriores_por_ticker):
    preco = obter_preco(ativo["ticker"])
    historico = obter_historico_completo(ativo["ticker"])
    noticias = buscar_noticias(ativo["noticia_query"], max_resultados=4)

    anterior = anteriores_por_ticker.get(ativo["ticker"])
    comentario_anterior = anterior.get("comentario") if anterior else None
    gerado_em_anterior = anterior.get("comentario_gerado_em") if anterior else None

    if anterior and comentario_ainda_valido(gerado_em_anterior):
        comentario = comentario_anterior
        comentario_gerado_em = gerado_em_anterior
    elif preco["ok"]:
        novo_comentario = comentario_ativo(ativo["nome"], preco["preco_atual"], preco["variacao_pct"] or 0.0, noticias)
        time.sleep(7)  # respeita o limite de pedidos/minuto do plano gratuito do Gemini
        if novo_comentario:
            comentario = novo_comentario
            comentario_gerado_em = datetime.now(timezone.utc).isoformat()
        else:
            comentario = comentario_anterior
            comentario_gerado_em = gerado_em_anterior
    else:
        comentario = comentario_anterior
        comentario_gerado_em = gerado_em_anterior

    return {
        "ticker": ativo["ticker"],
        "nome": ativo["nome"],
        "categoria": ativo["categoria"],
        "preco": preco,
        "historico": historico,
        "noticias": noticias,
        "comentario": comentario,
        "comentario_gerado_em": comentario_gerado_em,
    }


def main():
    dados_anteriores = carregar_dados_anteriores()
    anteriores_por_ticker = {
        a["ticker"]: a for a in (dados_anteriores or {}).get("ativos", [])
    }

    ativos_processados = [processar_ativo(a, anteriores_por_ticker) for a in CARTEIRA]

    analise_anterior = (dados_anteriores or {}).get("analise_geral_gerado_em")
    if analise_anterior and comentario_ainda_valido(analise_anterior):
        analise_geral = dados_anteriores["analise_geral"]
        analise_geral_gerado_em = analise_anterior
    else:
        resumo_geral = "\n".join(
            f"{a['nome']}: {a['preco']['preco_atual']:.2f} EUR, variacao hoje {(a['preco']['variacao_pct'] or 0):+.2f}%"
            for a in ativos_processados if a["preco"]["ok"]
        )
        destaques_noticias = "\n".join(
            f"{a['nome']}: " + "; ".join(n["titulo"] for n in a["noticias"][:2])
            for a in ativos_processados if a["noticias"]
        )
        nova_analise = analise_portfolio(resumo_geral, destaques_noticias)
        if nova_analise:
            analise_geral = nova_analise
            analise_geral_gerado_em = datetime.now(timezone.utc).isoformat()
        else:
            analise_geral = (dados_anteriores or {}).get("analise_geral")
            analise_geral_gerado_em = analise_anterior

    dados_finais = {
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
        "analise_geral": analise_geral,
        "analise_geral_gerado_em": analise_geral_gerado_em,
        "ativos": ativos_processados,
    }

    os.makedirs(os.path.dirname(CAMINHO_SAIDA), exist_ok=True)
    with open(CAMINHO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados_finais, f, ensure_ascii=False, indent=2)

    print(f"data.json gerado com sucesso em {CAMINHO_SAIDA}")


if __name__ == "__main__":
    main()

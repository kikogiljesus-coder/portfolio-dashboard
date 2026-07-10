import json
import os
from datetime import datetime, timedelta, timezone

from config import CARTEIRA
from precos import obter_preco, obter_historico_completo
from noticias import buscar_noticias
from analise import gerar_analise_completa
from alertas import verificar_e_enviar_alertas

CAMINHO_SAIDA = os.path.join(os.path.dirname(__file__), "..", "docs", "data.json")
HORAS_VALIDADE_ANALISE = 4


def carregar_dados_anteriores():
    try:
        with open(CAMINHO_SAIDA, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def analise_ainda_valida(gerado_em):
    if not gerado_em:
        return False
    return datetime.now(timezone.utc) - datetime.fromisoformat(gerado_em) < timedelta(hours=HORAS_VALIDADE_ANALISE)


def buscar_dados_mercado(ativo):
    preco = obter_preco(ativo["ticker"])
    historico = obter_historico_completo(ativo["ticker"])
    noticias = buscar_noticias(ativo["noticia_query"], max_resultados=4)
    return {
        "ticker": ativo["ticker"],
        "nome": ativo["nome"],
        "categoria": ativo["categoria"],
        "preco": preco,
        "historico": historico,
        "noticias": noticias,
    }


def main():
    dados_anteriores = carregar_dados_anteriores() or {}
    comentarios_anteriores = {
        a["ticker"]: a.get("comentario") for a in dados_anteriores.get("ativos", [])
    }

    ativos = [buscar_dados_mercado(a) for a in CARTEIRA]

    analise_gerado_em_anterior = dados_anteriores.get("analise_gerado_em")

    if analise_ainda_valida(analise_gerado_em_anterior):
        analise_geral = dados_anteriores.get("analise_geral")
        analise_gerado_em = analise_gerado_em_anterior
        for a in ativos:
            a["comentario"] = comentarios_anteriores.get(a["ticker"])
    else:
        ativos_para_gemini = [
            {
                "ticker": a["ticker"],
                "nome": a["nome"],
                "preco_atual": a["preco"]["preco_atual"],
                "variacao_pct": a["preco"]["variacao_pct"] or 0.0,
                "noticias": a["noticias"],
            }
            for a in ativos if a["preco"]["ok"]
        ]

        resultado = gerar_analise_completa(ativos_para_gemini)

        if resultado:
            analise_geral = resultado.get("analise_geral")
            analise_gerado_em = datetime.now(timezone.utc).isoformat()
            comentarios_novos = {
                item["ticker"]: item["comentario"] for item in resultado.get("comentarios", [])
            }
            for a in ativos:
                a["comentario"] = comentarios_novos.get(a["ticker"]) or comentarios_anteriores.get(a["ticker"])
        else:
            analise_geral = dados_anteriores.get("analise_geral")
            analise_gerado_em = analise_gerado_em_anterior
            for a in ativos:
                a["comentario"] = comentarios_anteriores.get(a["ticker"])

    limiares_por_ticker = {a["ticker"]: a.get("limiar_alerta_pct") for a in CARTEIRA}
    alertas_enviados = verificar_e_enviar_alertas(
        ativos, limiares_por_ticker, dados_anteriores.get("alertas_enviados", {})
    )

    dados_finais = {
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
        "analise_geral": analise_geral,
        "analise_gerado_em": analise_gerado_em,
        "alertas_enviados": alertas_enviados,
        "ativos": ativos,
    }

    os.makedirs(os.path.dirname(CAMINHO_SAIDA), exist_ok=True)
    with open(CAMINHO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados_finais, f, ensure_ascii=False, indent=2)

    print(f"data.json gerado com sucesso em {CAMINHO_SAIDA}")


if __name__ == "__main__":
    main()

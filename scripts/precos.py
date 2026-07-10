from datetime import datetime, timezone

import requests

CABECALHOS = {"User-Agent": "Mozilla/5.0"}


def obter_preco(ticker):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    try:
        r = requests.get(url, headers=CABECALHOS, timeout=10)
        r.raise_for_status()
        meta = r.json()["chart"]["result"][0]["meta"]
        preco_atual = meta["regularMarketPrice"]
        fecho_anterior = meta.get("previousClose") or meta.get("chartPreviousClose")
        variacao_pct = ((preco_atual - fecho_anterior) / fecho_anterior) * 100 if fecho_anterior else None
        return {
            "ok": True,
            "preco_atual": preco_atual,
            "fecho_anterior": fecho_anterior,
            "variacao_pct": variacao_pct,
        }
    except Exception as erro:
        return {"ok": False, "erro": str(erro)}


def _obter_serie(ticker, periodo, intervalo):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    parametros = {"range": periodo, "interval": intervalo}
    try:
        r = requests.get(url, headers=CABECALHOS, params=parametros, timeout=15)
        r.raise_for_status()
        resultado = r.json()["chart"]["result"][0]
        timestamps = resultado.get("timestamp", [])
        fechos = resultado["indicators"]["quote"][0].get("close", [])

        pontos = []
        for ts, fecho in zip(timestamps, fechos):
            if fecho is None:
                continue
            pontos.append({
                "quando": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
                "fecho": round(fecho, 4),
            })

        return {"ok": True, "pontos": pontos}
    except Exception as erro:
        return {"ok": False, "erro": str(erro)}


def obter_historico_completo(ticker):
    return {
        "intradiario": _obter_serie(ticker, "1d", "5m"),
        "diario": _obter_serie(ticker, "2y", "1d"),
        "longo_prazo": _obter_serie(ticker, "max", "1wk"),
    }

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


def obter_historico(ticker, periodo="2y", intervalo="1d"):
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
            data = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
            pontos.append({"data": data, "fecho": round(fecho, 4)})

        return {"ok": True, "pontos": pontos}
    except Exception as erro:
        return {"ok": False, "erro": str(erro)}

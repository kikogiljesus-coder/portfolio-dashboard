import os
import urllib.parse

import feedparser
import requests

NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY", "")


def buscar_noticias_google(query, max_resultados=5):
    query_codificada = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={query_codificada}&hl=en-US&gl=US&ceid=US:en"
    try:
        feed = feedparser.parse(url)
        return [
            {"titulo": e.title, "link": e.link,
             "fonte": e.get("source", {}).get("title", "Google News")}
            for e in feed.entries[:max_resultados]
        ]
    except Exception:
        return []


def buscar_noticias_newsapi(query, max_resultados=5):
    if not NEWSAPI_KEY:
        return []
    url = "https://newsapi.org/v2/everything"
    parametros = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": max_resultados,
        "apiKey": NEWSAPI_KEY,
    }
    try:
        r = requests.get(url, params=parametros, timeout=10)
        r.raise_for_status()
        artigos = r.json().get("articles", [])
        return [
            {"titulo": a["title"], "link": a["url"],
             "fonte": a.get("source", {}).get("name", "NewsAPI")}
            for a in artigos
        ]
    except Exception:
        return []


def buscar_noticias(query, max_resultados=5):
    resultados = buscar_noticias_google(query, max_resultados)
    resultados += buscar_noticias_newsapi(query, max_resultados)

    titulos_vistos = set()
    noticias_unicas = []
    for n in resultados:
        chave = n["titulo"].strip().lower()
        if chave not in titulos_vistos:
            titulos_vistos.add(chave)
            noticias_unicas.append(n)

    return noticias_unicas[:max_resultados]

# Monitor da Carteira

Dashboard automatico da carteira de investimentos, publicado no GitHub Pages.

- `scripts/` -- codigo Python que busca precos (Yahoo Finance), noticias (Google News + NewsAPI)
  e gera comentarios com o Gemini.
- `docs/` -- o site estatico (GitHub Pages serve esta pasta), incluindo o `data.json` gerado
  automaticamente.
- `.github/workflows/atualizar.yml` -- corre `scripts/gerar_dados.py` a cada 30 minutos e
  publica o `data.json` atualizado.

## Segredos necessarios (Settings -> Secrets and variables -> Actions)

- `GEMINI_API_KEY`
- `NEWSAPI_KEY`

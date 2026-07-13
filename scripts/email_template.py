import html
import urllib.parse

URL_SITE = "https://kikogiljesus-coder.github.io/portfolio-dashboard/"
URL_FAVICON = "https://kikogiljesus-coder.github.io/portfolio-dashboard/favicon.svg"

COR_FUNDO = "#0b0d11"
COR_CARTAO = "#171a21"
COR_BORDA = "#262a34"
COR_TEXTO = "#eef0f3"
COR_TEXTO_SUAVE = "#969ba6"
COR_VERDE = "#3ecf7e"
COR_VERMELHO = "#f0555b"
COR_DESTAQUE = "#6c8cf5"


def _favicon_do_link(link):
    try:
        host = urllib.parse.urlparse(link).hostname or ""
        return f"https://www.google.com/s2/favicons?domain={host}&sz=32"
    except Exception:
        return ""


def _linha_noticia_html(noticia):
    favicon = _favicon_do_link(noticia.get("link", ""))
    titulo = html.escape(noticia.get("titulo", ""))
    fonte = html.escape(noticia.get("fonte", ""))
    link = html.escape(noticia.get("link", "#"))
    return f"""
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid {COR_BORDA};">
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="width:30px; vertical-align:top; padding-right:10px;">
              <img src="{favicon}" width="20" height="20" alt=""
                   style="border-radius:5px; display:block;" />
            </td>
            <td style="vertical-align:top;">
              <a href="{link}" style="color:{COR_DESTAQUE}; text-decoration:none; font-size:14px; font-weight:600;">
                {titulo}
              </a>
              <div style="color:{COR_TEXTO_SUAVE}; font-size:11px; text-transform:uppercase; letter-spacing:0.03em; margin-top:2px;">
                {fonte}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    """


def montar_email_alerta_html(nome, ticker, tipo, variacao_pct, preco_atual, reacao, noticias):
    cor_badge = COR_VERDE if variacao_pct >= 0 else COR_VERMELHO
    seta = "▲" if variacao_pct >= 0 else "▼"
    reacao_html = html.escape(reacao or "Sem análise disponível de momento.").replace("\n", "<br/>")

    noticias_html = "".join(_linha_noticia_html(n) for n in noticias[:4])
    if not noticias_html:
        noticias_html = f'<tr><td style="padding:10px 0; color:{COR_TEXTO_SUAVE}; font-size:13px; font-style:italic;">Sem notícias relevantes encontradas neste momento.</td></tr>'

    return f"""\
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:24px; background:{COR_FUNDO}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="max-width:560px; margin:0 auto;">
    <tr>
      <td style="padding-bottom:20px;">
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle; padding-right:10px;">
              <img src="{URL_FAVICON}" width="36" height="36" alt="" style="border-radius:9px; display:block;" />
            </td>
            <td style="vertical-align:middle;">
              <div style="color:{COR_TEXTO}; font-size:18px; font-weight:800;">Monitor da Carteira</div>
              <div style="color:{COR_TEXTO_SUAVE}; font-size:12px;">Alerta automático</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:{COR_CARTAO}; border:1px solid {COR_BORDA}; border-radius:14px; padding:22px;">
        <div style="color:{COR_TEXTO}; font-size:17px; font-weight:700; margin-bottom:4px;">{html.escape(nome)}</div>
        <div style="color:{COR_TEXTO_SUAVE}; font-size:12px; margin-bottom:14px;">{html.escape(ticker)}</div>

        <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
          <tr>
            <td style="color:{COR_TEXTO}; font-size:22px; font-weight:700; padding-right:12px;">
              {preco_atual:.2f}€
            </td>
            <td>
              <span style="background:{cor_badge}22; color:{cor_badge}; font-size:13px; font-weight:700; padding:4px 10px; border-radius:20px;">
                {seta} {variacao_pct:+.2f}% hoje
              </span>
            </td>
          </tr>
        </table>

        <div style="border-left:2px solid {COR_DESTAQUE}44; padding-left:12px; color:{COR_TEXTO}; font-size:14px; line-height:1.5; margin-bottom:20px;">
          {reacao_html}
        </div>

        <div style="color:{COR_TEXTO}; font-size:13px; font-weight:700; border-left:3px solid {COR_DESTAQUE}; padding-left:8px; margin-bottom:8px;">
          Notícias relacionadas
        </div>
        <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
          {noticias_html}
        </table>

        <div style="margin-top:22px; text-align:center;">
          <a href="{URL_SITE}" style="background:{COR_DESTAQUE}; color:#fff; text-decoration:none; font-size:13px; font-weight:600; padding:10px 20px; border-radius:8px; display:inline-block;">
            Ver dashboard completo →
          </a>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding-top:18px; text-align:center; color:{COR_TEXTO_SUAVE}; font-size:11px;">
        Gerado automaticamente. Não constitui aconselhamento financeiro.
      </td>
    </tr>
  </table>
</body>
</html>
"""


def montar_email_alerta_texto(nome, ticker, tipo, variacao_pct, preco_atual, reacao, noticias):
    linhas_noticias = "\n".join(
        f"- {n['titulo']} ({n['fonte']}): {n['link']}" for n in noticias[:4]
    ) or "Sem notícias relevantes encontradas neste momento."

    return (
        f"{nome} ({ticker}) {tipo} {variacao_pct:+.2f}% hoje, para {preco_atual:.2f} EUR.\n\n"
        f"--- ANALISE ---\n{reacao or 'Sem análise disponível de momento.'}\n\n"
        f"--- NOTICIAS RELACIONADAS ---\n{linhas_noticias}\n\n"
        f"Ve mais detalhes em: {URL_SITE}\n"
    )

import os
import smtplib
import sys
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from analise import analise_alerta
from email_template import montar_email_alerta_html, montar_email_alerta_texto

GMAIL_ENDERECO = os.environ.get("GMAIL_ENDERECO", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
EMAIL_DESTINO = os.environ.get("EMAIL_DESTINO", "")


def enviar_email(assunto, corpo_texto, corpo_html):
    if not (GMAIL_ENDERECO and GMAIL_APP_PASSWORD and EMAIL_DESTINO):
        print("AVISO: credenciais de email nao configuradas, a saltar envio.", file=sys.stderr)
        return {"ok": False, "erro": "credenciais em falta"}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = assunto
    msg["From"] = GMAIL_ENDERECO
    msg["To"] = EMAIL_DESTINO
    msg.attach(MIMEText(corpo_texto, "plain", "utf-8"))
    msg.attach(MIMEText(corpo_html, "html", "utf-8"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as servidor:
            servidor.login(GMAIL_ENDERECO, GMAIL_APP_PASSWORD)
            servidor.send_message(msg)
        return {"ok": True}
    except Exception as erro:
        print(f"ERRO ao enviar email: {erro!r}", file=sys.stderr)
        return {"ok": False, "erro": str(erro)}


def verificar_e_enviar_alertas(ativos, limiares_por_ticker, alertas_enviados):
    hoje = str(date.today())
    alertas_enviados = dict(alertas_enviados or {})

    for ativo in ativos:
        preco = ativo["preco"]
        if not preco["ok"] or preco["variacao_pct"] is None:
            continue

        limiar = limiares_por_ticker.get(ativo["ticker"])
        if limiar is None:
            continue

        variacao = preco["variacao_pct"]
        if abs(variacao) < limiar:
            continue

        if alertas_enviados.get(ativo["ticker"]) == hoje:
            continue

        tipo = "subiu" if variacao > 0 else "desceu"
        assunto = f"Alerta na carteira: {ativo['nome']} {tipo} {variacao:+.2f}%"

        noticias = ativo.get("noticias") or []
        reacao = analise_alerta(
            ativo["nome"], ativo["ticker"], variacao, preco["preco_atual"], noticias
        ) or ativo.get("comentario")

        corpo_texto = montar_email_alerta_texto(
            ativo["nome"], ativo["ticker"], tipo, variacao, preco["preco_atual"], reacao, noticias
        )
        corpo_html = montar_email_alerta_html(
            ativo["nome"], ativo["ticker"], tipo, variacao, preco["preco_atual"], reacao, noticias
        )

        resultado = enviar_email(assunto, corpo_texto, corpo_html)
        if resultado["ok"]:
            alertas_enviados[ativo["ticker"]] = hoje

    return alertas_enviados

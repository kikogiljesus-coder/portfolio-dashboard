import os
import smtplib
import sys
from datetime import date
from email.mime.text import MIMEText

GMAIL_ENDERECO = os.environ.get("GMAIL_ENDERECO", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
EMAIL_DESTINO = os.environ.get("EMAIL_DESTINO", "")

URL_SITE = "https://kikogiljesus-coder.github.io/portfolio-dashboard/"


def enviar_email(assunto, corpo):
    if not (GMAIL_ENDERECO and GMAIL_APP_PASSWORD and EMAIL_DESTINO):
        print("AVISO: credenciais de email nao configuradas, a saltar envio.", file=sys.stderr)
        return {"ok": False, "erro": "credenciais em falta"}

    msg = MIMEText(corpo, "plain", "utf-8")
    msg["Subject"] = assunto
    msg["From"] = GMAIL_ENDERECO
    msg["To"] = EMAIL_DESTINO

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
        corpo = (
            f"{ativo['nome']} ({ativo['ticker']}) {tipo} {variacao:+.2f}% hoje, "
            f"para {preco['preco_atual']:.2f} EUR.\n\n"
            f"Comentario: {ativo.get('comentario') or 'sem comentario disponivel de momento'}\n\n"
            f"Ve mais detalhes em: {URL_SITE}\n"
        )

        resultado = enviar_email(assunto, corpo)
        if resultado["ok"]:
            alertas_enviados[ativo["ticker"]] = hoje

    return alertas_enviados

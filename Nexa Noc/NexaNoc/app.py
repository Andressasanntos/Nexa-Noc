"""
===============================================================================
NOC FLOW STUDIO - BACKEND FLASK
===============================================================================

Este arquivo é o "lado servidor" da aplicação.

Enquanto HTML/CSS/JavaScript rodam no navegador, este Python roda no computador
que está servindo o sistema.

FLUXO:
    navegador
       |
       | HTTP
       v
    Flask / app.py
       |
       +--> devolve arquivos HTML/CSS/JS
       +--> recebe dados em /api/ai-assist
       +--> pode futuramente acessar banco de dados e APIs externas

ROTAS PRINCIPAIS:
    GET  /                  -> abre index.html
    GET  /api/health        -> teste simples do backend
    POST /api/ai-assist     -> recebe contexto e devolve uma resposta
    GET  /download/project  -> baixa o projeto em ZIP

SEGURANÇA:
Nunca coloque senha real, token ou chave de API diretamente neste arquivo
se ele for versionado/compartilhado. Para segredos, use variáveis de ambiente.

===============================================================================
"""

from pathlib import Path
import os
import io
import json
import zipfile
import re
import urllib.error
import urllib.request

from flask import Flask, jsonify, request, send_from_directory, send_file

# Caminho absoluto da pasta onde está app.py.
BASE_DIR = Path(__file__).resolve().parent

# A pasta public contém os arquivos que o navegador recebe.
PUBLIC_DIR = BASE_DIR / "public"

# Cria a aplicação Flask.
# __name__ ajuda o Flask a descobrir onde este módulo está localizado.
app = Flask(__name__)

def extract_info(text: str) -> dict:
    """
    Extrai informações básicas de um incidente usando expressões regulares.

    Retorna um dicionário como:
        {
            "host": "...",
            "interface": "...",
            "ips": [...],
            "status": "..."
        }

    Esta função é propositalmente simples para você conseguir estudar.
    Em uma evolução futura, ela poderia ser separada em vários parsers/testes.
    """
    host = re.search(r"\b([A-Z]{2,}(?:-[A-Z0-9_]+)+)\b", text or "")
    interface = re.search(r"\b(?:Eth(?:ernet)?|XGE|GE|GigabitEthernet|100GE|TenGigE|Port-channel|Po)\S+", text or "", re.I)
    ips = list(dict.fromkeys(re.findall(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", text or "")))
    date = re.search(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b", text or "")
    time = re.search(r"\b\d{1,2}:\d{2}(?::\d{2})?\b", text or "")
    duration = re.search(r"\b\d+h(?:\s*\d+m)?|\b\d+m(?:\s*\d+s)?|\b\d+s\b", text or "", re.I)

    status = "Não identificado"
    if re.search(r"\bdown\b|indispon", text or "", re.I):
        status = "Down / indisponível"
    elif re.search(r"\bup\b|normaliz", text or "", re.I):
        status = "Up / normalizado"

    return {
        "host": host.group(0) if host else "",
        "interface": interface.group(0) if interface else "",
        "ips": ips[:6],
        "date": date.group(0) if date else "",
        "time": time.group(0) if time else "",
        "duration": duration.group(0) if duration else "",
        "status": status,
    }

def local_assist(task: str, context: str) -> str:
    """
    Assistente LOCAL baseado em regras.

    Apesar do nome da tela ser "Assistente IA", esta função ainda não chama
    um modelo de IA externo. Ela interpreta dados básicos e escolhe um modelo
    de resposta conforme "task".

    Isso é útil porque:
    - funciona offline;
    - não exige token;
    - serve como base para aprender backend.

    Uma IA real pode ser conectada futuramente dentro da rota /api/ai-assist.
    """
    data = extract_info(context)
    date_time = " ".join([x for x in [data["date"], data["time"]] if x]).strip() or "não identificado"
    ips = ", ".join(data["ips"]) if data["ips"] else "não identificado"

    if task == "customer_update":
        return (
            "Prezados,\n\n"
            "Informamos que a ocorrência segue em análise pela equipe técnica.\n"
            f"Host/circuito: {data['host'] or 'não identificado'}.\n"
            f"Status atual: {data['status']}.\n"
            f"Horário/data de referência: {date_time}.\n"
            "Seguiremos acompanhando e retornaremos com novas atualizações assim que houver avanço na tratativa.\n\n"
            "Atenciosamente,"
        )

    if task == "rfo":
        return (
            "[RFO]\n"
            f"Causa: ocorrência relacionada ao status {data['status'].lower()} do circuito/elemento monitorado.\n"
            "Solução: realizada tratativa técnica, com acompanhamento e normalização após análise operacional.\n"
            f"Localização: {data['host'] or data['interface'] or 'não identificada'}.\n"
            f"Observação: IPs citados no contexto: {ips}."
        )

    if task == "next_steps":
        return (
            "Próximos passos sugeridos:\n"
            f"1. Validar o estado do host {data['host'] or 'envolvido na ocorrência'}.\n"
            f"2. Confirmar status da interface {data['interface'] or 'relacionada'}.\n"
            "3. Executar testes de conectividade até o próximo salto.\n"
            "4. Verificar alarmes correlacionados e histórico do enlace.\n"
            "5. Caso persista, escalonar para o nível responsável com as evidências coletadas."
        )

    return (
        "Resumo técnico automático:\n"
        f"- Host: {data['host'] or 'não identificado'}\n"
        f"- Interface: {data['interface'] or 'não identificada'}\n"
        f"- Status: {data['status']}\n"
        f"- Data/Hora: {date_time}\n"
        f"- IPs citados: {ips}\n"
        "- Recomendação: validar camada física, interface, roteamento e continuidade até o próximo salto."
    )


# ---------------------------------------------------------------------------
# INTEGRAÇÃO OPCIONAL COM IA REAL (OPENAI)
# ---------------------------------------------------------------------------
# A chave fica somente no backend, via variável de ambiente OPENAI_API_KEY.
# O navegador nunca recebe a chave.

AI_SYSTEM_INSTRUCTIONS = (
    "Você é um assistente especializado em operações de NOC e redes. "
    "Responda em português do Brasil, de forma técnica, clara, objetiva e profissional. "
    "Não invente diagnóstico, causa, solução, horário, operadora ou evidências que não estejam no contexto. "
    "Quando faltar informação, sinalize a limitação de forma curta."
)

AI_TASK_INSTRUCTIONS = {
    "technical_summary": (
        "Gere um resumo técnico do contexto. Estruture em: Sintoma, Verificações/Evidências, "
        "Status/Resultado e Próxima ação."
    ),
    "customer_update": (
        "Redija uma atualização ao cliente. Use linguagem profissional, clara e sem excesso de jargões. "
        "Não prometa prazo se o contexto não informar previsão."
    ),
    "rfo": (
        "Gere um RFO profissional com os campos Causa, Solução e Localização. "
        "Use somente fatos presentes no contexto; quando algum campo não puder ser determinado, informe 'não identificado'."
    ),
    "next_steps": (
        "Sugira próximos passos práticos de troubleshooting em ordem de prioridade, considerando operação de NOC. "
        "Diferencie validações já evidenciadas de ações ainda sugeridas."
    ),
}


def openai_assist(task: str, context: str) -> tuple[str, str]:
    """Envia o contexto à Responses API quando OPENAI_API_KEY estiver configurada."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY não configurada")

    model = os.getenv("OPENAI_MODEL", "gpt-5.6-luna").strip() or "gpt-5.6-luna"
    task_instruction = AI_TASK_INSTRUCTIONS.get(task, AI_TASK_INSTRUCTIONS["technical_summary"])

    payload = {
        "model": model,
        "instructions": f"{AI_SYSTEM_INSTRUCTIONS}\n\nTarefa: {task_instruction}",
        "input": context,
        "max_output_tokens": 1200,
        "store": False,
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    timeout = float(os.getenv("OPENAI_TIMEOUT", "45"))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(body).get("error", {}).get("message", body)
        except Exception:
            detail = body
        raise RuntimeError(f"OpenAI HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Falha de conexão com a OpenAI: {exc.reason}") from exc

    texts = []
    for item in data.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                texts.append(content["text"])

    result = "\n".join(texts).strip()
    if not result:
        raise RuntimeError("A API respondeu sem texto utilizável")

    return result, model

# ---------------------------------------------------------------------------
# ROTAS HTTP
# ---------------------------------------------------------------------------
# Decoradores @app.get / @app.post dizem ao Flask qual função deve responder
# quando o navegador acessa determinado caminho.

@app.get("/")
def index():
    return send_from_directory(PUBLIC_DIR, "index.html")

@app.get("/<path:filename>")
def static_files(filename):
    return send_from_directory(PUBLIC_DIR, filename)

@app.get("/api/health")
def health():
    """Endpoint de teste do backend e do modo de IA configurado."""
    ai_configured = bool(os.getenv("OPENAI_API_KEY", "").strip())
    return jsonify({
        "status": "ok",
        "service": "noc-flow-studio",
        "ai": "openai" if ai_configured else "local",
        "model": os.getenv("OPENAI_MODEL", "gpt-5.6-luna") if ai_configured else None,
    })

@app.post("/api/ai-assist")
def ai_assist():
    """
    Recebe JSON enviado pelo fetch() do JavaScript.

    Exemplo de entrada:
        {
            "task": "rfo",
            "context": "texto do incidente..."
        }

    request.get_json() transforma o JSON em um dicionário Python.
    jsonify() faz o caminho inverso e devolve JSON ao navegador.
    """
    payload = request.get_json(silent=True) or {}
    task = payload.get("task", "technical_summary")
    context = payload.get("context", "").strip()

    if not context:
        return jsonify({"error": "context is required"}), 400

    # Se uma chave da OpenAI estiver configurada, usa IA real.
    # Se não houver chave (ou ocorrer falha externa), mantém o assistente local
    # como fallback para a ferramenta continuar funcional.
    if os.getenv("OPENAI_API_KEY", "").strip():
        try:
            result, model = openai_assist(task, context)
            return jsonify({"mode": f"openai:{model}", "result": result})
        except Exception as exc:
            app.logger.exception("Falha no backend de IA; usando fallback local")
            result = local_assist(task, context)
            return jsonify({
                "mode": "local-fallback",
                "result": result,
                "warning": str(exc),
            })

    result = local_assist(task, context)
    return jsonify({"mode": "local", "result": result})

@app.get("/download/project")
def download_project():
    """
    Cria o ZIP em memória.

    io.BytesIO() funciona como um "arquivo virtual".
    Isso evita criar um ZIP temporário no disco a cada download.
    """
    memory_file = io.BytesIO()

    with zipfile.ZipFile(memory_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in BASE_DIR.rglob("*"):
            if file.is_file() and "__pycache__" not in str(file):
                zf.write(file, file.relative_to(BASE_DIR.parent))

    memory_file.seek(0)
    return send_file(memory_file, as_attachment=True, download_name="noc-flow-studio.zip", mimetype="application/zip")

# Este bloco só roda quando executamos:
#     python app.py
#
# host 127.0.0.1 = acessível somente no próprio computador.
# debug=True é ótimo para desenvolvimento porque recarrega ao alterar arquivos.
# Em produção, use debug=False.
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

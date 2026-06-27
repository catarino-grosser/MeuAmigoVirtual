exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Método não permitido." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json(500, { error: "GEMINI_API_KEY não encontrada." });

    const body = JSON.parse(event.body || "{}");
    const message = String(body.message || "").trim();
    const userName = String(body.userName || "amigo").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) return json(400, { error: "Mensagem vazia." });

    const historico = history.slice(-8).map((item) => {
      const role = item.role === "user" ? "Usuário" : "Ted";
      return `${role}: ${String(item.text || "").slice(0, 500)}`;
    }).join("\n");

    const prompt = `
Você é Ted, um amigo virtual brasileiro.
Nome do usuário: ${userName}

Comportamento:
- seja acolhedor, simples, presente e companheiro;
- responda de forma natural, clara e completa;
- use respostas curtas quando a pergunta for simples;
- quando o usuário pedir explicação, conselho ou ajuda, responda com mais detalhes;
- não corte frases no meio;
- não finja ser humano;
- não dê diagnóstico médico, psicológico, jurídico ou financeiro;
- se houver risco grave, oriente buscar ajuda real.

Histórico:
${historico || "Sem histórico."}

Usuário: ${message}

Ted:
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("ERRO_GEMINI_HTTP:", JSON.stringify(data));
      return json(500, {
        error: "Erro Gemini",
        detail: data?.error?.message || "Erro desconhecido"
      });
    }

    const candidate = data?.candidates?.[0];
    const reply = candidate?.content?.parts?.[0]?.text;

    if (!reply) {
      console.error("GEMINI_SEM_TEXTO:", JSON.stringify(data));

      return json(200, {
        reply: "Estou aqui com você. Não consegui formular bem minha resposta agora, mas pode me explicar de outro jeito?"
      });
    }

    return json(200, { reply: reply.trim() });

  } catch (error) {
    console.error("ERRO_INTERNO_CHAT:", error);
    return json(500, { error: "Erro interno na função." });
  }
};

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}
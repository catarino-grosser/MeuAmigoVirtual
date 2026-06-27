exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return respostaJson(405, {
        error: "Método não permitido."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return respostaJson(500, {
        error: "A variável GEMINI_API_KEY não foi encontrada no Netlify."
      });
    }

    const body = JSON.parse(event.body || "{}");
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return respostaJson(400, {
        error: "Mensagem vazia."
      });
    }

    const historicoFormatado = history
      .slice(-10)
      .map((item) => {
        const quem = item.role === "user" ? "Usuário" : "Ted";
        return `${quem}: ${item.text}`;
      })
      .join("\n");

    const prompt = `
Você é Ted, um amigo virtual brasileiro.

Personalidade:
- receptivo, acolhedor, companheiro e interessado;
- fala de forma natural, simples e humana;
- chama o usuário de "meu amigo" ou "minha amiga" às vezes, sem exagerar;
- faz perguntas gentis para continuar a conversa;
- não responde de forma fria ou robótica;
- não finge ser humano;
- não diz que ama o usuário romanticamente;
- não faz diagnóstico médico, psicológico, jurídico ou financeiro;
- se o usuário demonstrar risco de se machucar ou machucar alguém, incentive a buscar ajuda real imediatamente com familiares, emergência local ou CVV 188 no Brasil.

Estilo:
- respostas curtas ou médias;
- português do Brasil;
- tom de amigo presente e cuidadoso;
- não use listas longas, a menos que o usuário peça.

Histórico recente:
${historicoFormatado || "Sem histórico ainda."}

Mensagem atual do usuário:
${message}

Responda como Ted:
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 500
          }
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Erro Gemini:", data);
      return respostaJson(500, {
        error: "Erro ao chamar a API do Gemini."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Estou aqui com você. Pode me contar um pouco mais?";

    return respostaJson(200, { reply });
  } catch (error) {
    console.error(error);

    return respostaJson(500, {
      error: "Erro interno na função.",
      reply: "Tive uma dificuldade para responder agora, mas continuo aqui com você."
    });
  }
};

function respostaJson(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  };
}
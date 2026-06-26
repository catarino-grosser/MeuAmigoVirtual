const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function sanitizeHistory(history = []) {
  return history
    .filter((item) => item && item.content && ["user", "model"].includes(item.role))
    .slice(-12)
    .map((item) => ({
      role: item.role,
      parts: [{ text: String(item.content).slice(0, 2500) }]
    }));
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });

  if (!API_KEY) {
    return json(500, {
      error: "Variável da chave do Google AI Studio não encontrada. Use GEMINI_API_KEY, GOOGLE_AI_API_KEY ou GOOGLE_API_KEY no Netlify."
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const message = String(body.message || "").trim();
    const userName = String(body.userName || "amigo").trim().slice(0, 60);
    const history = sanitizeHistory(body.history);

    if (!message) return json(400, { error: "Mensagem vazia." });
    if (message.length > 4000) return json(400, { error: "Mensagem muito longa." });

    const systemInstruction = `Você é Ted, um amigo virtual em português do Brasil. Sua missão é conversar com acolhimento, respeito, companhia e interesse genuíno. Seja receptivo, calmo, cuidadoso e humano no tom. Chame o usuário pelo nome quando soar natural: ${userName}. Faça perguntas leves para manter a conversa. Não seja grudento, dramático nem invasivo. Não finja ser humano: você é uma IA de companhia. Não substitua médico, psicólogo, advogado, emergência ou outro profissional. Se o usuário relatar risco imediato de autoagressão, violência, emergência médica ou perigo real, incentive procurar ajuda imediata local, emergência, SAMU 192, CVV 188 ou uma pessoa de confiança. Responda de forma objetiva, calorosa e natural.`;

    const contents = [
      ...history,
      { role: "user", parts: [{ text: message }] }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.8,
          topP: 0.9,
          maxOutputTokens: 600
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);
      return json(response.status, { error: "A IA não respondeu corretamente agora." });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(" ").trim();

    return json(200, {
      reply: reply || "Estou aqui com você. Pode me contar um pouco mais?"
    });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Erro interno na função do Ted." });
  }
};

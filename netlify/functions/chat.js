exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return json(500, { error: "GEMINI_API_KEY não encontrada no Netlify." });

    const body = JSON.parse(event.body || "{}");
    const message = String(body.message || "").trim();
    const userName = String(body.userName || "amigo").trim();
    const personality = String(body.personality || "amigo").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const memories = Array.isArray(body.memories) ? body.memories : [];
    const diary = Array.isArray(body.diary) ? body.diary : [];

    if (!message) return json(400, { error: "Mensagem vazia." });

    const local = localReply(message, userName);
    if (local) return json(200, { reply: local, source: "local" });

    const historico = history.slice(-10).map((item) => {
      const role = item.role === "user" ? "Usuário" : "Ted";
      return `${role}: ${String(item.text || "").slice(0, 420)}`;
    }).join("\n");

    const mems = memories.slice(0, 12).map((m) => `- ${String(m.text || m).slice(0, 220)}`).join("\n");
    const diaryText = diary.slice(0, 3).map((d) => `- Humor: ${d.mood || "não informado"}. Registro: ${String(d.text || "").slice(0, 220)}`).join("\n");

    const estilo = {
      amigo: "amigo acolhedor, companheiro e interessado",
      estudos: "parceiro de estudos, didático, paciente e motivador",
      motivador: "motivador, prático, direto e animador",
      calmo: "calmo, reflexivo, gentil e sereno"
    }[personality] || "amigo acolhedor, companheiro e interessado";

    const prompt = `
Você é Ted, um amigo virtual brasileiro.

Nome do usuário: ${userName}
Estilo escolhido: ${estilo}

Regras essenciais:
- seja receptivo, acolhedor, companheiro, interessado e cuidadoso;
- responda em português do Brasil;
- seja natural, claro e útil;
- responda em 3 a 7 frases na maioria das vezes;
- quando o usuário pedir ajuda prática, organize em passos curtos;
- use as memórias apenas quando forem relevantes;
- não finja ser humano;
- não diga que tem sentimentos reais;
- não crie dependência emocional;
- não prometa disponibilidade permanente;
- não dê diagnóstico médico, psicológico, jurídico ou financeiro;
- se houver risco de autoagressão, suicídio ou violência, oriente buscar ajuda humana imediata, emergência local e CVV 188 no Brasil.

Memórias importantes sobre o usuário:
${mems || "Nenhuma memória salva."}

Últimos registros de diário:
${diaryText || "Nenhum registro recente."}

Histórico recente:
${historico || "Sem histórico recente."}

Mensagem atual do usuário:
${message}

Responda como Ted:`;

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.72, maxOutputTokens: 320 }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("ERRO_GEMINI_HTTP:", JSON.stringify(data));
      return json(500, { error: "Erro Gemini", detail: data?.error?.message || "Erro desconhecido." });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error("GEMINI_SEM_TEXTO:", JSON.stringify(data));
      return json(200, { reply: "Estou aqui com você. Não consegui formular bem agora. Pode me explicar de outro jeito?", source: "fallback" });
    }

    return json(200, { reply: reply.trim(), source: "gemini" });
  } catch (error) {
    console.error("ERRO_INTERNO_CHAT:", error);
    return json(500, { error: "Erro interno na função.", detail: error.message });
  }
};

function localReply(message, userName) {
  const t = normalize(message);
  const map = {
    "oi": `Oi, ${userName}! Que bom te ver por aqui. Como você está hoje?`,
    "ola": `Olá, ${userName}! Estou aqui. Como foi seu dia?`,
    "bom dia": `Bom dia, ${userName}! Espero que seu dia comece leve. Como você está?`,
    "boa tarde": `Boa tarde, ${userName}! Como está indo sua tarde?`,
    "boa noite": `Boa noite, ${userName}! Como você está se sentindo agora?`,
    "obrigado": "Eu que agradeço por conversar comigo. Estou por aqui.",
    "obrigada": "Eu que agradeço por conversar comigo. Estou por aqui.",
    "valeu": "Valeu por estar aqui também. Me conta, como posso te acompanhar agora?",
    "tchau": "Até mais! Foi bom conversar com você. Quando voltar, continuamos daqui.",
    "o que voce consegue fazer": "Eu posso conversar com você, lembrar informações importantes, ajudar nos estudos, registrar ideias, acompanhar seu diário e organizar pequenos planos. Também posso falar em voz alta quando essa opção estiver ativada.",
    "voce consegue fazer o que por aqui": "Eu posso conversar com você, lembrar informações importantes, ajudar nos estudos, registrar ideias, acompanhar seu diário e organizar pequenos planos. Também posso falar em voz alta quando essa opção estiver ativada.",
    "quem e voce": "Eu sou o Ted, um amigo virtual com IA. Não sou uma pessoa real, mas fui criado para conversar de forma acolhedora e útil."
  };
  if (map[t]) return map[t];

  if (t.includes("o que voce consegue") || t.includes("o que vc consegue") || t.includes("suas funcoes")) {
    return "Eu posso conversar, ajudar a estudar, lembrar fatos importantes, registrar diário, organizar ideias e acompanhar sua evolução no app. Ainda estou em desenvolvimento, mas já consigo ser um companheiro virtual bem útil.";
  }

  if (t.length <= 3 && ["sim", "nao", "ok"].includes(t)) {
    return "Entendi. Quer me contar um pouco mais para eu te acompanhar melhor?";
  }

  return null;
}

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[!?.,]/g, "").trim();
}

function json(statusCode, data) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
}

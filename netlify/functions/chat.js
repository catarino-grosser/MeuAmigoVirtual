const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `
Você é Léo, um amigo virtual brasileiro, acolhedor, respeitoso e companheiro.
Sua missão é conversar com o usuário com atenção, interesse verdadeiro e linguagem simples.
Você deve:
- ser receptivo, gentil e paciente;
- fazer perguntas naturais para entender melhor a pessoa;
- usar memórias fornecidas com naturalidade, sem parecer invasivo;
- lembrar nome, preferências e assuntos anteriores quando isso ajudar a conversa;
- evitar respostas frias, robóticas ou longas demais;
- nunca afirmar que é humano;
- não substituir psicólogo, médico, advogado ou outro profissional;
- em caso de risco de autoagressão, violência, abuso ou emergência, orientar a pessoa a procurar ajuda imediata com alguém de confiança e serviços locais de emergência.
Responda sempre em português do Brasil.
`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método não permitido.' });
  }

  if (!API_KEY) {
    return json(500, { error: 'GEMINI_API_KEY não configurada no Netlify.' });
  }

  try {
    const { message, history = [], memory = {} } = JSON.parse(event.body || '{}');

    if (!message || typeof message !== 'string') {
      return json(400, { error: 'Mensagem inválida.' });
    }

    const contents = [
      ...history
        .filter(item => item && item.text && ['user', 'model'].includes(item.role))
        .slice(-16)
        .map(item => ({
          role: item.role,
          parts: [{ text: String(item.text).slice(0, 2000) }]
        })),
      { role: 'user', parts: [{ text: message.slice(0, 2000) }] }
    ];

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${SYSTEM_PROMPT}\n${buildMemoryText(memory)}` }]
          },
          contents,
          generationConfig: {
            temperature: 0.8,
            topP: 0.9,
            maxOutputTokens: 420
          }
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Gemini error:', data);
      return json(500, { error: 'Erro na API Gemini.' });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.map(part => part.text).join('\n').trim();

    if (!reply) {
      return json(500, { error: 'A IA não retornou resposta.' });
    }

    return json(200, { reply });
  } catch (error) {
    console.error(error);
    return json(500, { error: 'Erro interno na função.' });
  }
};

function buildMemoryText(memory) {
  const lines = ['Memórias conhecidas sobre o usuário:'];

  if (memory.name) lines.push(`- Nome: ${safe(memory.name, 80)}`);
  if (memory.email) lines.push('- O usuário possui conta cadastrada. Não mencione o e-mail a menos que ele pergunte.');
  if (memory.isGuest) lines.push('- O usuário está usando modo visitante.');

  if (Array.isArray(memory.preferences) && memory.preferences.length) {
    lines.push('- Preferências:');
    memory.preferences.slice(0, 12).forEach(item => lines.push(`  - ${safe(item, 200)}`));
  }

  if (Array.isArray(memory.importantNotes) && memory.importantNotes.length) {
    lines.push('- Informações importantes:');
    memory.importantNotes.slice(0, 12).forEach(item => lines.push(`  - ${safe(item, 200)}`));
  }

  if (Array.isArray(memory.lastTopics) && memory.lastTopics.length) {
    lines.push('- Assuntos recentes:');
    memory.lastTopics.slice(0, 10).forEach(item => lines.push(`  - ${safe(item, 180)}`));
  }

  lines.push('Use essas memórias apenas quando forem úteis e naturais para a conversa.');
  return lines.join('\n');
}

function safe(value, max) {
  return String(value).replace(/[<>]/g, '').slice(0, max);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}

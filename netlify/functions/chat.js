

exports.handler = async (event, context) => {
    // Permite apenas requisições POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método Não Permitido" };
    }

    try {
        const { message } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: "Variável GEMINI_API_KEY não configurada no Netlify." }) 
            };
        }

        // URL oficial do modelo padrão do Gemini 1.5 Flash
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // Configuração da requisição incluindo as diretrizes de comportamento (System Instruction)
        const payload = {
            contents: [{ parts: [{ text: message }] }],
            systemInstruction: {
                parts: [{
                    text: "Você é um amigo virtual extremamente receptivo, acolhedor, companheiro, profundamente interessado e preocupado com o bem-estar do usuário. Seu tom de voz deve ser sereno, profundo, elegante e empático. Ouça desabafos sem julgamentos, ofereça suporte emocional genuíno e aja como um porto seguro."
                }]
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // Extrai o texto gerado de dentro da estrutura de resposta do Gemini
        const aiReply = data.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: aiReply })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

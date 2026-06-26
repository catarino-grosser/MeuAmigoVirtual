# Meu Amigo Virtual

App web inicial em HTML, CSS e JavaScript com um amigo virtual acolhedor usando a API Gemini via Netlify Functions.

## Estrutura

```txt
meu-amigo-virtual/
├── index.html
├── style.css
├── app.js
├── netlify.toml
├── firebase-config.example.js
└── netlify/
    └── functions/
        └── chat.js
```

## O que esta versão faz

- Interface responsiva para celular.
- Avatar animado em CSS.
- Chat com função segura no Netlify.
- Voz usando `speechSynthesis` do navegador.
- Botão de microfone usando reconhecimento de voz quando o navegador permitir.
- Prompt de personalidade acolhedora para o amigo virtual.

## Como publicar no Netlify pelo GitHub

1. Crie um repositório no GitHub.
2. Envie todos estes arquivos para o repositório.
3. No Netlify, escolha **Add new site** > **Import an existing project**.
4. Conecte com o GitHub e selecione o repositório.
5. Em **Build settings**, pode deixar sem comando de build.
6. O arquivo `netlify.toml` já informa que a pasta publicada é a raiz do projeto e que as funções ficam em `netlify/functions`.

## Configurar a API Gemini

1. Crie uma chave no Google AI Studio.
2. No painel do Netlify, entre no site.
3. Vá em **Site configuration** > **Environment variables**.
4. Crie a variável:

```txt
GEMINI_API_KEY=sua_chave_aqui
```

5. Opcionalmente, crie também:

```txt
GEMINI_MODEL=gemini-2.5-flash
```

6. Faça um novo deploy no Netlify.

## Observação de segurança

A chave da API Gemini não fica no `app.js`. Ela fica protegida nas variáveis de ambiente do Netlify e é usada apenas pela função `netlify/functions/chat.js`.

## Próximos passos sugeridos

1. Adicionar Firebase Authentication.
2. Salvar histórico das conversas no Firestore.
3. Criar tela de configurações do avatar.
4. Trocar o avatar CSS por um modelo 3D com Three.js.
5. Adicionar modo diário: o amigo pergunta como foi o dia e registra um resumo emocional.

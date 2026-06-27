# Ted 2.1 - Meu Amigo Virtual

Versão 2.1 do Ted, com login/cadastro, histórico por usuário, diário, memórias, respostas locais para economizar API, limite diário, voz, avatar emocional e Netlify Function para proteger a chave do Gemini.

## Estrutura correta no GitHub

Os arquivos devem ficar na raiz do repositório:

```txt
index.html
style.css
script.js
firebase.js
netlify.toml
firestore.rules
README.md
netlify/
  functions/
    chat.js
```

## Netlify

Crie a variável de ambiente:

```txt
GEMINI_API_KEY
```

Opcionalmente, você pode criar:

```txt
GEMINI_MODEL=gemini-1.5-flash
```

## Firebase

Ative no Authentication:

```txt
Email/Password
```

Publique as regras do arquivo `firestore.rules` no Firestore.

## Melhorias da v2.1

- Respostas locais para mensagens simples, economizando chamadas à API.
- Contador diário de uso com IA por usuário.
- Memórias automáticas e manuais.
- Diário com humor.
- Nível de amizade baseado no uso.
- Avatar muda de humor conforme a resposta.
- Botões rápidos no chat.
- `netlify.toml` corrigido para publicar Functions.

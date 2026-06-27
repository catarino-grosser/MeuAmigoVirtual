# Ted 2.0 — Meu Amigo Virtual

App web feito com HTML, CSS e JavaScript, Firebase Auth/Firestore, Netlify Functions e Gemini.

## Novidades da versão 2.0

- Login e cadastro por e-mail/senha.
- Página pessoal.
- Chat com histórico por usuário.
- Respostas locais para economizar cota do Gemini.
- Limite diário configurável por usuário.
- Diário emocional.
- Memórias manuais e captura simples de memórias.
- Configurações de voz e personalidade.
- Netlify Function protegendo `GEMINI_API_KEY`.
- Avatar CSS animado com estados de pensamento e fala.

## Estrutura

```txt
index.html
style.css
script.js
firebase.js
firestore.rules
netlify.toml
netlify/functions/chat.js
```

## Netlify

Crie a variável de ambiente:

```txt
GEMINI_API_KEY
```

Opcional:

```txt
GEMINI_MODEL=gemini-2.5-flash
```

## Firebase

Ative em Authentication:

- Email/Password

No Firestore, publique as regras do arquivo `firestore.rules`.

## Observação

A chave Firebase no frontend é normal em app web. A chave sensível é a do Gemini, que fica apenas no Netlify.

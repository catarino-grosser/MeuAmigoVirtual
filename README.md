# Ted — Meu Amigo Virtual v0.1

App web em HTML, CSS e JavaScript com Firebase Auth, Firestore, Netlify Functions e Google AI Studio/Gemini.

## O que já vem pronto

- Login e cadastro por e-mail/senha.
- Recuperação de senha.
- Chat com histórico salvo no Firestore.
- Netlify Function para proteger a chave da IA.
- Avatar 2D animado.
- Voz do Ted usando síntese de fala do navegador.
- Microfone usando reconhecimento de fala quando o navegador permitir.
- Tema claro/escuro.

## Variável no Netlify

A função aceita qualquer um destes nomes:

- `GEMINI_API_KEY`
- `GOOGLE_AI_API_KEY`
- `GOOGLE_API_KEY`

Se você já criou a variável com outro nome, renomeie no Netlify ou edite `netlify/functions/chat.js`.

Opcional:

- `GEMINI_MODEL=gemini-1.5-flash`

## Deploy no Netlify

1. Envie esta pasta para o GitHub.
2. Conecte o repositório ao Netlify.
3. Confirme que a variável da chave da API está cadastrada em Site configuration > Environment variables.
4. Faça o deploy.

## Firebase

O arquivo `js/firebase.js` já contém a configuração que você enviou.

No Firestore, use as regras do arquivo `firestore.rules`.

## Observação importante

A chave do Firebase no front-end não é segredo. O que protege os dados são as regras do Firestore e o Authentication.
A chave da IA, sim, precisa ficar escondida no Netlify como variável de ambiente.

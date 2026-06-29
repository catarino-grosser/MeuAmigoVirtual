# Ted 2.4 - Meu Amigo Virtual

Atualização da versão 2.4 com avatar oficial e conversa por voz.

## Novidades

- Avatar oficial do Ted em `ted-avatar.png`.
- Botão **Falar com Ted** no chat.
- Reconhecimento de voz em português do Brasil pelo navegador.
- Ted responde em voz alta usando `speechSynthesis`.
- Estados visuais do avatar:
  - ouvindo;
  - pensando;
  - falando;
  - humor feliz, calmo, pensativo, triste e animado.
- Mensagem de orientação quando o navegador não suporta microfone por voz.

## Observações

O reconhecimento de voz funciona melhor no Google Chrome para Android. Em alguns navegadores, o microfone pode não estar disponível.

A voz usada nesta versão é a voz nativa do navegador, sem custo de API externa.

## Deploy

Suba esta pasta no Netlify mantendo as variáveis de ambiente já usadas na versão anterior:

- `GEMINI_API_KEY`
- `MP_ACCESS_TOKEN`

Não coloque essas chaves dentro do código.

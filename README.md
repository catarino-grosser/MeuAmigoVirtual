# Meu Amigo Virtual v2.0

Esta versão adiciona cadastro, login, recuperação de senha, modo visitante e memória permanente com Firebase Authentication + Firestore.

## O que esta versão faz

- Cadastro com nome, e-mail e senha.
- Login com e-mail e senha.
- Recuperação de senha por e-mail.
- Logout.
- Modo visitante com login anônimo.
- Histórico de conversas salvo no Firestore.
- Memória de nome, preferências, informações importantes e assuntos recentes.
- A função Netlify continua protegendo a chave da API Gemini.

## Estrutura

```txt
meu-amigo-virtual-v2.0/
├── index.html
├── style.css
├── app.js
├── firebase-config.js
├── firebase-config.example.js
├── netlify.toml
└── netlify/
    └── functions/
        └── chat.js
```

## Configurar Firebase

1. Acesse o Firebase Console.
2. Crie ou abra seu projeto.
3. Vá em **Authentication**.
4. Clique em **Get started**.
5. Em **Sign-in method**, ative:
   - **Email/Password**
   - **Anonymous**
6. Vá em **Firestore Database**.
7. Crie o banco de dados.
8. Pode iniciar em modo de produção.
9. Vá em **Project settings** > **General**.
10. Crie ou selecione um app Web.
11. Copie o objeto `firebaseConfig`.
12. Cole os dados no arquivo `firebase-config.js`.

## Regras do Firestore

Use estas regras para cada usuário acessar somente seus próprios dados:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /messages/{messageId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Configurar Gemini no Netlify

No painel do Netlify, configure a variável de ambiente:

```txt
GEMINI_API_KEY=sua_chave_aqui
```

A variável abaixo é opcional:

```txt
GEMINI_MODEL=gemini-2.5-flash
```

Se você não criar `GEMINI_MODEL`, o projeto usa automaticamente `gemini-2.5-flash`.

## Publicar no Netlify

1. Envie a pasta para um repositório no GitHub.
2. No Netlify, clique em **Add new site** > **Import an existing project**.
3. Selecione o repositório.
4. Em build command, deixe vazio.
5. O arquivo `netlify.toml` já configura a publicação da raiz e as Netlify Functions.
6. Configure `GEMINI_API_KEY` em **Site configuration** > **Environment variables**.
7. Faça o deploy.

## Observação importante

O modo visitante salva a memória no usuário anônimo do navegador. Se a pessoa trocar de celular, limpar os dados do navegador ou usar outro aparelho, pode perder o acesso à memória visitante.

Para memória entre dispositivos, o ideal é usar cadastro com e-mail e senha.

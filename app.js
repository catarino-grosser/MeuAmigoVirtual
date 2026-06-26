// Importando SDKs do Firebase via CDN para compatibilidade direta no navegador
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração fornecida por você
const firebaseConfig = {
  apiKey: "AIzaSyBOUvciwEznBdQ9UBJ58ZioTmS3DH0dNVw",
  authDomain: "meuamigovirtual-cws.firebaseapp.com",
  projectId: "meuamigovirtual-cws",
  storageBucket: "meuamigovirtual-cws.firebasestorage.app",
  messagingSenderId: "582271107119",
  appId: "1:582271107119:web:5b94484ca5823e525606da"
};

// Inicializa o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referências dos elementos da árvore DOM
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const messagesContainer = document.getElementById('messagesContainer');
const chatSection = document.getElementById('chatSection');
const avatarOrb = document.getElementById('avatarOrb');
const avatarStatus = document.getElementById('avatarStatus');

// Criamos um ID de sessão simples para testes (para não misturar conversas no banco)
const sessionId = "sessao_teste_01";
const messagesRef = collection(db, "chats", sessionId, "messages");

// 1. Escutar mensagens do Firestore em tempo real
const q = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = '';
    snapshot.forEach((doc) => {
        const data = doc.data();
        displayMessage(data.text, data.sender);
    });
    // Rola o chat para o fim automaticamente
    chatSection.scrollTop = chatSection.scrollHeight;
});

// 2. Enviar nova mensagem do usuário
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    userInput.value = '';

    // Salva a mensagem do usuário no Firestore
    await addDoc(messagesRef, {
        text: text,
        sender: 'user',
        timestamp: serverTimestamp()
    });

    // Altera o estado do orbe para "pensando"
    avatarOrb.classList.add('thinking');
    avatarStatus.innerText = "Ouvindo atentamente...";

    try {
        // Envia o texto para a Netlify Function que processa o Gemini
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        // Salva a resposta da IA no Firestore
        await addDoc(messagesRef, {
            text: data.reply,
            sender: 'bot',
            timestamp: serverTimestamp()
        });

    } catch (error) {
        console.error("Erro ao obter resposta:", error);
        displayMessage("Peço desculpas, tive um pequeno problema para processar seu pensamento agora.", "bot");
    } finally {
        // Restaura o estado normal do avatar
        avatarOrb.classList.remove('thinking');
        avatarStatus.innerText = "Pronto para conversar...";
    }
});

// Função auxiliar para renderizar balões na tela
function displayMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerText = text;
    messagesContainer.appendChild(msgDiv);
}

import {
  auth,
  db,
  signInAnonymously,
  onAuthStateChanged,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc
} from "./firebase.js";

const chat = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");
const clearButton = document.getElementById("clearButton");
const userStatus = document.getElementById("userStatus");
const avatar = document.getElementById("avatar");

let currentUser = null;
let memory = [];
let isSending = false;

async function iniciarApp() {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error(error);
    userStatus.textContent = "Modo local: não consegui conectar ao Firebase.";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userStatus.textContent = "Conectado. Suas conversas podem ser lembradas pelo Ted.";
    await carregarHistorico();
  }
});

function adicionarMensagem(texto, tipo, loading = false) {
  const div = document.createElement("div");
  div.className = `message ${tipo}${loading ? " loading" : ""}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

async function salvarMensagem(texto, tipo) {
  if (!currentUser) return;

  try {
    await addDoc(collection(db, "users", currentUser.uid, "messages"), {
      text: texto,
      role: tipo,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao salvar mensagem:", error);
  }
}

async function carregarHistorico() {
  if (!currentUser) return;

  try {
    const q = query(
      collection(db, "users", currentUser.uid, "messages"),
      orderBy("createdAt", "asc"),
      limit(30)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    chat.innerHTML = "";

    snapshot.forEach((item) => {
      const data = item.data();
      adicionarMensagem(data.text, data.role);
      memory.push({
        role: data.role,
        text: data.text
      });
    });
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
  }
}

async function falarComTed(message) {
  const ultimasMensagens = memory.slice(-10);

  const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      history: ultimasMensagens
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao falar com Ted.");
  }

  return data.reply;
}

function falarEmVozAlta(texto) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 1;
  fala.pitch = 1;

  fala.onstart = () => avatar.classList.add("talking");
  fala.onend = () => avatar.classList.remove("talking");
  fala.onerror = () => avatar.classList.remove("talking");

  window.speechSynthesis.speak(fala);
}

async function enviarMensagem(texto) {
  if (isSending) return;

  const message = texto.trim();
  if (!message) return;

  isSending = true;
  sendButton.disabled = true;
  messageInput.value = "";

  adicionarMensagem(message, "user");
  memory.push({ role: "user", text: message });
  await salvarMensagem(message, "user");

  const loading = adicionarMensagem("Ted está pensando...", "ted", true);

  try {
    const resposta = await falarComTed(message);

    loading.remove();
    adicionarMensagem(resposta, "ted");
    memory.push({ role: "ted", text: resposta });
    await salvarMensagem(resposta, "ted");

    falarEmVozAlta(resposta);
  } catch (error) {
    console.error(error);
    loading.remove();

    const fallback = "Tive uma dificuldade para responder agora, mas estou aqui com você. Pode tentar me mandar de novo?";
    adicionarMensagem(fallback, "ted");
  } finally {
    isSending = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await enviarMensagem(messageInput.value);
});

clearButton.addEventListener("click", async () => {
  const confirmar = confirm("Deseja limpar a conversa deste aparelho e do Firebase?");
  if (!confirmar) return;

  chat.innerHTML = "";
  memory = [];

  adicionarMensagem("Conversa limpa. Estou aqui de novo. Como você está agora?", "ted");

  if (!currentUser) return;

  try {
    const q = query(collection(db, "users", currentUser.uid, "messages"));
    const snapshot = await getDocs(q);

    for (const item of snapshot.docs) {
      await deleteDoc(doc(db, "users", currentUser.uid, "messages", item.id));
    }
  } catch (error) {
    console.error("Erro ao limpar histórico:", error);
  }
});

voiceButton.addEventListener("click", () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Seu navegador não suporta reconhecimento de voz. Tente pelo Chrome.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceButton.textContent = "🎧 Ouvindo...";

  recognition.start();

  recognition.onresult = async (event) => {
    const texto = event.results[0][0].transcript;
    voiceButton.textContent = "🎤 Falar";
    await enviarMensagem(texto);
  };

  recognition.onerror = () => {
    voiceButton.textContent = "🎤 Falar";
    alert("Não consegui ouvir bem. Tente novamente.");
  };

  recognition.onend = () => {
    voiceButton.textContent = "🎤 Falar";
  };
});

iniciarApp();
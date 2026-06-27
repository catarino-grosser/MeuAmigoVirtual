import {
  auth, db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  deleteDoc
} from "./firebase.js";

const authScreen = document.getElementById("authScreen");
const homeScreen = document.getElementById("homeScreen");
const chatScreen = document.getElementById("chatScreen");

const logoutButton = document.getElementById("logoutButton");
const authForm = document.getElementById("authForm");
const toggleAuthButton = document.getElementById("toggleAuthButton");
const authSubmitButton = document.getElementById("authSubmitButton");
const authMessage = document.getElementById("authMessage");

const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

const welcomeTitle = document.getElementById("welcomeTitle");
const openChatButton = document.getElementById("openChatButton");
const clearHistoryButton = document.getElementById("clearHistoryButton");
const backHomeButton = document.getElementById("backHomeButton");

const chat = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");
const stopVoiceButton = document.getElementById("stopVoiceButton");
const connectionStatus = document.getElementById("connectionStatus");
const avatar = document.getElementById("avatar");

let isRegisterMode = false;
let currentUser = null;
let memory = [];
let isSending = false;

function showScreen(screen) {
  authScreen.classList.add("hidden");
  homeScreen.classList.add("hidden");
  chatScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function setAuthMode(register) {
  isRegisterMode = register;
  nameInput.classList.toggle("hidden", !register);
  authSubmitButton.textContent = register ? "Criar conta" : "Entrar";
  toggleAuthButton.textContent = register
    ? "Já tenho conta. Quero entrar."
    : "Ainda não tenho conta. Quero me cadastrar.";
  authMessage.textContent = "";
}

function friendlyFirebaseError(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "Este e-mail já está cadastrado.";
  if (code.includes("invalid-email")) return "Digite um e-mail válido.";
  if (code.includes("weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (code.includes("invalid-credential")) return "E-mail ou senha incorretos.";
  if (code.includes("user-not-found")) return "Usuário não encontrado.";
  if (code.includes("wrong-password")) return "Senha incorreta.";
  return "Não consegui completar esta ação. Tente novamente.";
}

toggleAuthButton.addEventListener("click", () => {
  setAuthMode(!isRegisterMode);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  authMessage.textContent = "";
  authSubmitButton.disabled = true;

  try {
    if (isRegisterMode) {
      if (!name) {
        authMessage.textContent = "Digite seu nome para criar a conta.";
        return;
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });

      await setDoc(doc(db, "users", credential.user.uid), {
        name,
        email,
        createdAt: serverTimestamp()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    console.error(error);
    authMessage.textContent = friendlyFirebaseError(error);
  } finally {
    authSubmitButton.disabled = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    logoutButton.classList.add("hidden");
    showScreen(authScreen);
    return;
  }

  currentUser = user;
  logoutButton.classList.remove("hidden");

  const name = await getUserName();
  welcomeTitle.textContent = `Olá, ${name}!`;
  showScreen(homeScreen);
});

async function getUserName() {
  if (!currentUser) return "amigo";

  try {
    const profileRef = doc(db, "users", currentUser.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      return profileSnap.data().name || currentUser.displayName || "amigo";
    }

    return currentUser.displayName || "amigo";
  } catch {
    return currentUser.displayName || "amigo";
  }
}

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
});

openChatButton.addEventListener("click", async () => {
  showScreen(chatScreen);
  await carregarHistorico();
  messageInput.focus();
});

backHomeButton.addEventListener("click", () => {
  showScreen(homeScreen);
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

  await addDoc(collection(db, "users", currentUser.uid, "messages"), {
    text: texto,
    role: tipo,
    createdAt: serverTimestamp()
  });
}

async function carregarHistorico() {
  if (!currentUser) return;

  chat.innerHTML = "";
  memory = [];

  try {
    const q = query(
      collection(db, "users", currentUser.uid, "messages"),
      orderBy("createdAt", "asc"),
      limit(40)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const name = await getUserName();
      adicionarMensagem(`Oi, ${name}! Eu sou o Ted. Como você está hoje?`, "ted");
      return;
    }

    snapshot.forEach((item) => {
      const data = item.data();
      adicionarMensagem(data.text, data.role);
      memory.push({ role: data.role, text: data.text });
    });
  } catch (error) {
    console.error(error);
    adicionarMensagem("Não consegui carregar seu histórico agora, mas podemos conversar normalmente.", "ted");
  }
}

async function falarComTed(message) {
  const userName = await getUserName();

  const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      userName,
      history: memory.slice(-12)
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
  connectionStatus.textContent = "Ted está pensando...";
  messageInput.value = "";

  adicionarMensagem(message, "user");
  memory.push({ role: "user", text: message });

  try {
    await salvarMensagem(message, "user");
  } catch (error) {
    console.error("Erro ao salvar mensagem do usuário:", error);
  }

  const loading = adicionarMensagem("Ted está digitando...", "ted", true);

  try {
    const resposta = await falarComTed(message);

    loading.remove();
    adicionarMensagem(resposta, "ted");
    memory.push({ role: "ted", text: resposta });

    try {
      await salvarMensagem(resposta, "ted");
    } catch (error) {
      console.error("Erro ao salvar resposta:", error);
    }

    falarEmVozAlta(resposta);
  } catch (error) {
    console.error(error);
    loading.remove();
    adicionarMensagem("Tive uma dificuldade para responder agora, mas continuo aqui com você. Pode tentar novamente?", "ted");
  } finally {
    isSending = false;
    sendButton.disabled = false;
    connectionStatus.textContent = "Pronto para conversar";
    messageInput.focus();
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await enviarMensagem(messageInput.value);
});

clearHistoryButton.addEventListener("click", async () => {
  if (!currentUser) return;

  const confirmar = confirm("Tem certeza que deseja apagar todo o histórico?");
  if (!confirmar) return;

  try {
    const q = query(collection(db, "users", currentUser.uid, "messages"));
    const snapshot = await getDocs(q);

    for (const item of snapshot.docs) {
      await deleteDoc(doc(db, "users", currentUser.uid, "messages", item.id));
    }

    alert("Histórico apagado.");
  } catch (error) {
    console.error(error);
    alert("Não consegui apagar o histórico.");
  }
});

voiceButton.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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

stopVoiceButton.addEventListener("click", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  avatar.classList.remove("talking");
});

setAuthMode(false);